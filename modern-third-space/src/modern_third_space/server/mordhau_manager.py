"""
Mordhau Integration Manager for the vest daemon.

This module provides file watching to receive game events from Mordhau.
Events can come from two sources:

1. Screen Capture (Plan B) - detects red arch damage indicator
   Format: timestamp|DAMAGE|direction|intensity

2. Blueprint Mod (ThirdSpaceHapticsMod) - direct damage event hooks
   Format: timestamp|DAMAGE|zone|damage_type|intensity
   Format: timestamp|DEATH|all|death|intensity

When Mordhau game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from threading import Thread
from typing import Callable, Optional, List

from ..vest.cell_layout import (
    Cell,
    FRONT_CELLS,
    BACK_CELLS,
    ALL_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Parser
# =============================================================================

@dataclass
class MordhauEvent:
    """Parsed event from Mordhau log file."""
    type: str  # DAMAGE, DEATH, BLOCK, PARRY
    direction: str  # front, back, left, right, all, unknown
    intensity: int  # 0-100
    damage_type: str = "unknown"  # slash, stab, blunt, projectile, death, unknown
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Valid event types
VALID_EVENT_TYPES = {"DAMAGE", "DEATH", "BLOCK", "PARRY"}

# Valid directions/zones
VALID_DIRECTIONS = {"front", "back", "left", "right", "all", "unknown"}


def parse_mordhau_line(line: str) -> Optional[MordhauEvent]:
    """
    Parse an event line from log file.
    
    Supports two formats:
    - Screen Capture (4 parts): timestamp|DAMAGE|direction|intensity
    - Blueprint Mod (5 parts): timestamp|EVENT_TYPE|zone|damage_type|intensity
    
    Returns MordhauEvent if valid, None otherwise.
    """
    line = line.strip()
    if not line:
        return None
    
    parts = line.split('|')
    
    # Must have 4 or 5 parts
    if len(parts) not in (4, 5):
        return None
    
    try:
        timestamp_ms = int(parts[0])
        event_type = parts[1].upper()
        
        # Validate event type
        if event_type not in VALID_EVENT_TYPES:
            return None
        
        # Convert timestamp from milliseconds to seconds
        timestamp = timestamp_ms / 1000.0
        
        # Parse based on format
        if len(parts) == 4:
            # Screen Capture format: timestamp|DAMAGE|direction|intensity
            direction = parts[2].lower()
            intensity = int(parts[3])
            damage_type = "unknown"
        else:
            # Blueprint Mod format: timestamp|EVENT_TYPE|zone|damage_type|intensity
            direction = parts[2].lower()
            damage_type = parts[3].lower()
            intensity = int(parts[4])
        
        # Validate direction
        if direction not in VALID_DIRECTIONS:
            direction = "unknown"
        
        # Clamp intensity
        intensity = max(0, min(100, intensity))
        
        return MordhauEvent(
            type=event_type,
            direction=direction,
            intensity=intensity,
            damage_type=damage_type,
            timestamp=timestamp,
        )
    except (ValueError, IndexError):
        return None


# =============================================================================
# Haptic Mapper
# =============================================================================

def direction_to_cells(direction: str) -> List[int]:
    """
    Convert damage direction to vest cells.
    
    Direction can be: "front", "back", "left", "right", or "unknown"
    
    Uses correct hardware cell layout from cell_layout module:
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    direction = direction.lower()
    
    if direction == "front":
        return FRONT_CELLS
    elif direction == "back":
        return BACK_CELLS
    elif direction == "left":
        return LEFT_SIDE
    elif direction == "right":
        return RIGHT_SIDE
    else:
        # Unknown direction - use all cells
        return ALL_CELLS


def intensity_to_speed(intensity: int) -> int:
    """
    Convert intensity (0-100) to haptic speed (0-10).
    
    Maps intensity to appropriate haptic strength.
    """
    # Clamp intensity to 0-100
    intensity = max(0, min(100, intensity))
    
    # Map to speed 0-10
    # Higher intensity = stronger haptic feedback
    if intensity >= 80:
        return 9
    elif intensity >= 60:
        return 7
    elif intensity >= 40:
        return 5
    elif intensity >= 20:
        return 4
    else:
        return 3


def damage_type_to_speed_modifier(damage_type: str) -> float:
    """
    Get speed modifier based on damage type.
    
    Some damage types feel more intense than others.
    """
    modifiers = {
        "stab": 1.2,       # Stabs are sharp and intense
        "projectile": 1.1,  # Arrows are quick and piercing
        "slash": 1.0,       # Slashes are standard
        "blunt": 0.9,       # Blunt is more spread out
        "death": 1.5,       # Death is maximum intensity
        "unknown": 1.0,     # Default
    }
    return modifiers.get(damage_type.lower(), 1.0)


def map_event_to_haptics(event: MordhauEvent) -> List[tuple[int, int]]:
    """
    Map a Mordhau event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    if event.type == "DAMAGE":
        cells = direction_to_cells(event.direction)
        base_speed = intensity_to_speed(event.intensity)
        
        # Apply damage type modifier
        modifier = damage_type_to_speed_modifier(event.damage_type)
        speed = min(10, max(1, int(base_speed * modifier)))
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "DEATH":
        # Death triggers all cells at maximum intensity
        cells = ALL_CELLS
        speed = 10  # Maximum
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "BLOCK":
        # Block is a light feedback on the direction side
        cells = direction_to_cells(event.direction)
        speed = 3  # Light feedback
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "PARRY":
        # Parry is a satisfying medium feedback
        cells = direction_to_cells(event.direction)
        speed = 5  # Medium feedback
        
        for cell in cells:
            commands.append((cell, speed))
    
    return commands


# =============================================================================
# File Watcher
# =============================================================================

class EventLogWatcher:
    """
    Watches Mordhau haptic_events.log for damage events.
    
    The screen capture script writes events to this file.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[MordhauEvent], None],
        poll_interval: float = DEFAULT_POLL_INTERVAL,
    ):
        self.log_path = log_path
        self.on_event = on_event
        self.poll_interval = poll_interval
        
        self._running = False
        self._last_position = 0
        self._thread: Optional[Thread] = None
    
    def start(self) -> tuple[bool, Optional[str]]:
        """Start watching the log file."""
        if self._running:
            return False, "Already watching"
        
        # Create log directory if it doesn't exist
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Start from end if file exists, otherwise from beginning
        if self.log_path.exists():
            self._last_position = self.log_path.stat().st_size
        else:
            self._last_position = 0
        
        self._running = True
        
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Started watching: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the log file."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching log file")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading log file: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the log file."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (file recreated)
        if current_size < self._last_position:
            logger.info("Log file truncated, resetting position")
            self._last_position = 0
        
        if current_size == self._last_position:
            return
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._last_position)
                new_content = f.read()
                self._last_position = f.tell()
            
            for line in new_content.splitlines():
                event = parse_mordhau_line(line)
                if event:
                    self.on_event(event)
        
        except IOError as e:
            # File may be locked by screen capture script
            logger.debug(f"IOError reading log (file may be locked): {e}")


# =============================================================================
# Mordhau Manager
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class MordhauManager:
    """
    Manages Mordhau integration within the daemon.
    
    This class:
    1. Watches haptic_events.log for damage events
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Supports two event sources:
    - Screen Capture (Plan B): %LOCALAPPDATA%/Mordhau/haptic_events.log
    - Blueprint Mod: %LOCALAPPDATA%/Mordhau/Saved/ThirdSpaceHaptics/haptic_events.log
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    # Log path for screen capture approach
    SCREEN_CAPTURE_LOG_PATH = Path(os.environ.get("LOCALAPPDATA", ".")) / "Mordhau" / "haptic_events.log"
    
    # Log path for Blueprint mod approach
    BLUEPRINT_MOD_LOG_PATH = Path(os.environ.get("LOCALAPPDATA", ".")) / "Mordhau" / "Saved" / "ThirdSpaceHaptics" / "haptic_events.log"
    
    # Default to screen capture path for backward compatibility
    DEFAULT_LOG_PATH = SCREEN_CAPTURE_LOG_PATH
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[EventLogWatcher] = None
        self._running = False
        
        # Stats
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
    
    @property
    def is_running(self) -> bool:
        return self._running
    
    @property
    def log_path(self) -> Optional[Path]:
        return self._log_path
    
    @property
    def events_received(self) -> int:
        return self._events_received
    
    @property
    def last_event_ts(self) -> Optional[float]:
        return self._last_event_ts
    
    def start(self, log_path: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Start watching for Mordhau events.
        
        Args:
            log_path: Path to haptic_events.log, or None for default
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "Mordhau integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.DEFAULT_LOG_PATH
        
        # Create watcher
        self._watcher = EventLogWatcher(
            log_path=self._log_path,
            on_event=self._on_mordhau_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        
        logger.info(f"Mordhau integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for Mordhau events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("Mordhau integration stopped")
        return True
    
    def _on_mordhau_event(self, event: MordhauEvent):
        """Called when a Mordhau event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(
            f"Mordhau event: {event.type} - direction={event.direction}, "
            f"damage_type={event.damage_type}, intensity={event.intensity}"
        )
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event.type, {
                "direction": event.direction,
                "damage_type": event.damage_type,
                "intensity": event.intensity,
                "timestamp": event.timestamp,
            })
        
        # Map to haptics and trigger
        haptic_commands = map_event_to_haptics(event)
        for cell, speed in haptic_commands:
            self._trigger(cell, speed)
    
    def _trigger(self, cell: int, speed: int):
        """Trigger a haptic effect via callback."""
        if self.on_trigger:
            self.on_trigger(cell, speed)

