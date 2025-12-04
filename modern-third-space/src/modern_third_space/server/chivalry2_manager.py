"""
Chivalry 2 Integration Manager for the vest daemon.

This module provides file watching to receive game events from Chivalry 2.
The Blueprint mod writes events to a log file in the format:
    timestamp|event_type|angle|zone|damage_type|intensity

Example:
    1699123456789|DAMAGE|45.5|front-right|slash|65
    1699123456890|DAMAGE|180.0|back|stab|80
    1699123457000|DEATH|0|all|death|100

When Chivalry 2 game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients
"""

from __future__ import annotations

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
    LOWER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Parser
# =============================================================================

@dataclass
class Chivalry2Event:
    """Parsed event from Chivalry 2 log file."""
    type: str  # DAMAGE, DEATH, FALL_DAMAGE, FIRE, BLOCK, PARRY
    angle: float  # 0-360 degrees (0=front, 90=right, 180=back, 270=left), -1 for unknown
    zone: str  # front, front-right, right, back-right, back, back-left, left, front-left, all
    damage_type: str  # slash, stab, blunt, projectile, death, fire, unknown
    intensity: int  # 0-100
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Valid event types
VALID_EVENT_TYPES = {"DAMAGE", "DEATH", "FALL_DAMAGE", "FIRE", "BLOCK", "PARRY"}


def parse_chivalry2_line(line: str) -> Optional[Chivalry2Event]:
    """
    Parse an event line from log file.
    
    Format: timestamp|event_type|angle|zone|damage_type|intensity
    
    Returns Chivalry2Event if valid, None otherwise.
    """
    line = line.strip()
    if not line:
        return None
    
    parts = line.split('|')
    
    # Must have 6 parts
    if len(parts) != 6:
        return None
    
    try:
        timestamp_ms = int(parts[0])
        event_type = parts[1].upper()
        
        # Validate event type
        if event_type not in VALID_EVENT_TYPES:
            return None
        
        # Convert timestamp from milliseconds to seconds
        timestamp = timestamp_ms / 1000.0
        
        angle = float(parts[2])
        zone = parts[3].lower()
        damage_type = parts[4].lower()
        intensity = int(parts[5])
        
        # Clamp intensity
        intensity = max(0, min(100, intensity))
        
        # Normalize angle
        if angle >= 0:
            angle = angle % 360
        
        return Chivalry2Event(
            type=event_type,
            angle=angle,
            zone=zone,
            damage_type=damage_type,
            intensity=intensity,
            timestamp=timestamp,
        )
    except (ValueError, IndexError):
        return None


# =============================================================================
# Haptic Mapper
# =============================================================================

def angle_to_cells(angle: float) -> List[int]:
    """
    Convert damage angle to vest cells for precise haptic mapping.
    
    Angle convention (player's perspective):
        0° = front (damage from ahead)
        90° = right (damage from right side)
        180° = back (damage from behind)
        270° = left (damage from left side)
    
    Vest cell layout:
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    
    Zone mapping (8 zones, 45° each):
        front (337.5-22.5°):       cells 2, 3, 4, 5 (all front)
        front-right (22.5-67.5°):  cells 4, 5 (front-right)
        right (67.5-112.5°):       cells 4, 5, 6, 7 (right side)
        back-right (112.5-157.5°): cells 6, 7 (back-right)
        back (157.5-202.5°):       cells 0, 1, 6, 7 (all back)
        back-left (202.5-247.5°):  cells 0, 1 (back-left)
        left (247.5-292.5°):       cells 0, 1, 2, 3 (left side)
        front-left (292.5-337.5°): cells 2, 3 (front-left)
    """
    if angle < 0:
        # Unknown angle - use all cells
        return ALL_CELLS
    
    # Normalize angle to 0-360
    angle = angle % 360
    
    # Map to cells based on 8 zones
    if 337.5 <= angle or angle < 22.5:
        # Front - all front cells
        return FRONT_CELLS  # [2, 3, 4, 5]
    elif 22.5 <= angle < 67.5:
        # Front-right
        return [4, 5]  # Front-right cells
    elif 67.5 <= angle < 112.5:
        # Right - all right side
        return RIGHT_SIDE  # [4, 5, 6, 7]
    elif 112.5 <= angle < 157.5:
        # Back-right
        return [6, 7]  # Back-right cells
    elif 157.5 <= angle < 202.5:
        # Back - all back cells
        return BACK_CELLS  # [0, 1, 6, 7]
    elif 202.5 <= angle < 247.5:
        # Back-left
        return [0, 1]  # Back-left cells
    elif 247.5 <= angle < 292.5:
        # Left - all left side
        return LEFT_SIDE  # [0, 1, 2, 3]
    else:  # 292.5 <= angle < 337.5
        # Front-left
        return [2, 3]  # Front-left cells


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
        "fire": 0.8,       # Fire is more sustained
        "unknown": 1.0,     # Default
    }
    return modifiers.get(damage_type.lower(), 1.0)


def map_event_to_haptics(event: Chivalry2Event) -> List[tuple[int, int]]:
    """
    Map a Chivalry 2 event to haptic commands.
    
    Uses precise angle-based cell mapping for accurate directional feedback.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    if event.type == "DAMAGE":
        # Use angle-based cell mapping for precise feedback
        cells = angle_to_cells(event.angle)
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
    
    elif event.type == "FALL_DAMAGE":
        # Fall damage affects lower body
        cells = LOWER_CELLS  # [0, 3, 4, 7]
        base_speed = intensity_to_speed(event.intensity)
        
        for cell in cells:
            commands.append((cell, base_speed))
    
    elif event.type == "FIRE":
        # Fire is a pulsing pattern on all cells (lower intensity)
        cells = ALL_CELLS
        speed = min(10, max(2, intensity_to_speed(event.intensity) - 2))
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "BLOCK":
        # Block is a light feedback on the direction side
        cells = angle_to_cells(event.angle)
        speed = 3  # Light feedback
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "PARRY":
        # Parry is a satisfying medium feedback
        cells = angle_to_cells(event.angle)
        speed = 5  # Medium feedback
        
        for cell in cells:
            commands.append((cell, speed))
    
    return commands


# =============================================================================
# File Watcher
# =============================================================================

class EventLogWatcher:
    """
    Watches Chivalry 2 haptic_events.log for game events.
    
    The Blueprint mod writes events to this file.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[Chivalry2Event], None],
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
                event = parse_chivalry2_line(line)
                if event:
                    self.on_event(event)
        
        except IOError as e:
            # File may be locked by mod
            logger.debug(f"IOError reading log (file may be locked): {e}")


# =============================================================================
# Chivalry 2 Manager
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class Chivalry2Manager:
    """
    Manages Chivalry 2 integration within the daemon.
    
    This class:
    1. Watches haptic_events.log for game events
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Log path: %LOCALAPPDATA%/Chivalry2/ThirdSpaceHaptics/haptic_events.log
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    # Default log path
    DEFAULT_LOG_PATH = Path(os.environ.get("LOCALAPPDATA", ".")) / "Chivalry2" / "ThirdSpaceHaptics" / "haptic_events.log"
    
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
        Start watching for Chivalry 2 events.
        
        Args:
            log_path: Path to haptic_events.log, or None for default
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "Chivalry 2 integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.DEFAULT_LOG_PATH
        
        # Create watcher
        self._watcher = EventLogWatcher(
            log_path=self._log_path,
            on_event=self._on_chivalry2_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        
        logger.info(f"Chivalry 2 integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for Chivalry 2 events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("Chivalry 2 integration stopped")
        return True
    
    def _on_chivalry2_event(self, event: Chivalry2Event):
        """Called when a Chivalry 2 event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(
            f"Chivalry 2 event: {event.type} - angle={event.angle:.1f}° ({event.zone}), "
            f"damage_type={event.damage_type}, intensity={event.intensity}"
        )
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event.type, {
                "angle": event.angle,
                "zone": event.zone,
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
