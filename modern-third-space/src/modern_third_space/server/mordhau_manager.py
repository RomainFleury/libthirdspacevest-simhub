"""
Mordhau Integration Manager for the vest daemon.

This module provides file watching to receive game events from Mordhau.
The events are written by the screen capture script (Plan B) that detects
the red arch damage indicator around the crosshair.

Event format: timestamp|DAMAGE|direction|intensity

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
    type: str
    direction: str
    intensity: int
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


def parse_mordhau_line(line: str) -> Optional[MordhauEvent]:
    """
    Parse a damage event line from log file.
    
    Format: timestamp|DAMAGE|direction|intensity
    
    Returns MordhauEvent if valid, None otherwise.
    """
    line = line.strip()
    if not line:
        return None
    
    parts = line.split('|')
    if len(parts) != 4:
        return None
    
    try:
        timestamp_ms = int(parts[0])
        event_type = parts[1]
        direction = parts[2]
        intensity = int(parts[3])
        
        if event_type != "DAMAGE":
            return None
        
        # Convert timestamp from milliseconds to seconds
        timestamp = timestamp_ms / 1000.0
        
        return MordhauEvent(
            type=event_type,
            direction=direction,
            intensity=intensity,
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


def map_event_to_haptics(event: MordhauEvent) -> List[tuple[int, int]]:
    """
    Map a Mordhau event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    if event.type == "DAMAGE":
        cells = direction_to_cells(event.direction)
        speed = intensity_to_speed(event.intensity)
        
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
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    # Default path for haptic_events.log
    DEFAULT_LOG_PATH = Path(os.environ.get("LOCALAPPDATA", ".")) / "Mordhau" / "haptic_events.log"
    
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
        
        logger.debug(f"Mordhau event: {event.type} - direction={event.direction}, intensity={event.intensity}")
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event.type, {
                "direction": event.direction,
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

