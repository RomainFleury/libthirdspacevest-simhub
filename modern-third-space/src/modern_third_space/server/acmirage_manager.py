"""
Assassin's Creed Mirage integration manager.

Handles game events from AC Mirage and maps them to haptic feedback
on the Third Space Vest. This integration watches log files and
processes events for combat, assassinations, and damage.

Event format (from mod/external or log parsing):
    {"cmd": "acmirage_event", "event": "player_damage", "damage": 25, "direction": "front"}
    {"cmd": "acmirage_event", "event": "player_death"}
    {"cmd": "acmirage_event", "event": "assassination_kill"}
"""

from __future__ import annotations

import logging
import os
import re
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Any

from ..vest.cell_layout import (
    ALL_CELLS, FRONT_CELLS, BACK_CELLS, LEFT_SIDE, RIGHT_SIDE,
    UPPER_CELLS, LOWER_CELLS, Cell
)

logger = logging.getLogger(__name__)


@dataclass
class HapticMapping:
    """Defines how a game event maps to vest haptics."""
    cells: List[int]
    speed: int
    duration_ms: int = 200


class ACMirageManager:
    """
    Manager for Assassin's Creed Mirage game events.
    
    Can operate in two modes:
    1. Log file watching (automatic detection from game logs)
    2. Event receiving (external tool sends events via TCP)
    
    Cell layout (hardware mapping from cell_layout.py):
    
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    
    # Default log paths to check (in order of priority)
    DEFAULT_LOG_PATHS = [
        # Windows paths (expanded at runtime)
        r"%APPDATA%\Ubisoft\Assassin's Creed Mirage\logs",
        r"%USERPROFILE%\Documents\Assassin's Creed Mirage",
        r"%PROGRAMFILES(X86)%\Ubisoft\Ubisoft Game Launcher\logs",
    ]
    
    # Event to haptic mappings
    EVENT_MAPPINGS: Dict[str, HapticMapping] = {
        # Combat damage (direction-specific)
        "player_damage_front": HapticMapping(cells=FRONT_CELLS, speed=7, duration_ms=200),
        "player_damage_back": HapticMapping(cells=BACK_CELLS, speed=7, duration_ms=200),
        "player_damage_left": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT, Cell.BACK_UPPER_LEFT, Cell.BACK_LOWER_LEFT],
            speed=7, duration_ms=200
        ),
        "player_damage_right": HapticMapping(
            cells=[Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT, Cell.BACK_UPPER_RIGHT, Cell.BACK_LOWER_RIGHT],
            speed=7, duration_ms=200
        ),
        # Generic damage (no direction)
        "player_damage": HapticMapping(cells=FRONT_CELLS, speed=7, duration_ms=200),
        
        # Death
        "player_death": HapticMapping(cells=ALL_CELLS, speed=10, duration_ms=1000),
        
        # Assassinations
        "assassination_kill": HapticMapping(
            cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT],
            speed=7, duration_ms=150
        ),
        "air_assassination": HapticMapping(
            cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT, Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT],
            speed=8, duration_ms=200
        ),
        
        # Combat actions
        "sword_strike_right": HapticMapping(
            cells=[Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT, Cell.BACK_LOWER_RIGHT],
            speed=5, duration_ms=100
        ),
        "sword_strike_left": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT, Cell.BACK_LOWER_LEFT],
            speed=5, duration_ms=100
        ),
        "dagger_strike": HapticMapping(
            cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT],
            speed=4, duration_ms=80
        ),
        "parry_block": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT],
            speed=6, duration_ms=100
        ),
        "counter_attack": HapticMapping(
            cells=FRONT_CELLS, speed=7, duration_ms=150
        ),
        
        # Environmental
        "fall_damage": HapticMapping(
            cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT, Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT],
            speed=8, duration_ms=300
        ),
        "explosion": HapticMapping(cells=ALL_CELLS, speed=9, duration_ms=400),
        "fire_damage": HapticMapping(cells=ALL_CELLS, speed=5, duration_ms=150),
        
        # Stealth
        "low_health_heartbeat": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT],
            speed=3, duration_ms=500
        ),
        "detection_alert": HapticMapping(
            cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT],
            speed=4, duration_ms=200
        ),
        "full_detection": HapticMapping(
            cells=BACK_CELLS, speed=6, duration_ms=300
        ),
        
        # Abilities
        "eagle_vision": HapticMapping(cells=ALL_CELLS, speed=2, duration_ms=150),
        "focus_ability": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT],
            speed=4, duration_ms=200
        ),
    }
    
    def __init__(
        self,
        on_game_event: Optional[Callable[[str, Dict[str, Any]], None]] = None,
        on_trigger: Optional[Callable[[int, int], None]] = None,
    ):
        """
        Initialize the AC Mirage manager.
        
        Args:
            on_game_event: Callback for broadcasting game events to clients
            on_trigger: Callback for triggering vest haptics
        """
        self._enabled = True
        self._is_running = False
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
        self._on_game_event = on_game_event
        self._on_trigger = on_trigger
        
        # Log file watching
        self._log_path: Optional[Path] = None
        self._watcher_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._file_position = 0
        
    @property
    def enabled(self) -> bool:
        return self._enabled
    
    @property
    def is_running(self) -> bool:
        return self._is_running
    
    @property
    def events_received(self) -> int:
        return self._events_received
    
    @property
    def last_event_ts(self) -> Optional[float]:
        return self._last_event_ts
    
    @property
    def last_event_type(self) -> Optional[str]:
        return self._last_event_type
    
    @property
    def log_path(self) -> Optional[Path]:
        return self._log_path
    
    def set_event_callback(self, callback: Callable[[str, Dict[str, Any]], None]) -> None:
        """Set callback for broadcasting events."""
        self._on_game_event = callback
    
    def set_trigger_callback(self, callback: Callable[[int, int], None]) -> None:
        """Set callback for triggering vest cells."""
        self._on_trigger = callback
    
    def enable(self) -> None:
        """Enable AC Mirage event processing."""
        self._enabled = True
        logger.info("AC Mirage integration enabled")
    
    def disable(self) -> None:
        """Disable AC Mirage event processing."""
        self._enabled = False
        logger.info("AC Mirage integration disabled")
    
    def start(
        self,
        log_path: Optional[str] = None,
    ) -> tuple[bool, Optional[str]]:
        """
        Start the AC Mirage integration.
        
        Args:
            log_path: Optional custom path to game log file
            
        Returns:
            Tuple of (success, error_message)
        """
        if self._is_running:
            return False, "Already running"
        
        # Find log path
        if log_path:
            path = Path(os.path.expandvars(log_path))
            if not path.exists():
                return False, f"Log path not found: {log_path}"
            self._log_path = path
        else:
            # Try to auto-detect log path
            found_path = self._find_log_path()
            if found_path:
                self._log_path = found_path
            else:
                # No log path found - run in event-only mode
                logger.info("No log path found, running in event-only mode")
                self._log_path = None
        
        self._is_running = True
        self._stop_event.clear()
        
        # Start log watcher thread if we have a log path
        if self._log_path:
            self._watcher_thread = threading.Thread(
                target=self._watch_log_file,
                name="ACMirageLogWatcher",
                daemon=True,
            )
            self._watcher_thread.start()
            logger.info(f"AC Mirage integration started, watching: {self._log_path}")
        else:
            logger.info("AC Mirage integration started in event-only mode")
        
        return True, None
    
    def stop(self) -> bool:
        """Stop the AC Mirage integration."""
        if not self._is_running:
            return False
        
        self._stop_event.set()
        self._is_running = False
        
        if self._watcher_thread:
            self._watcher_thread.join(timeout=2.0)
            self._watcher_thread = None
        
        logger.info("AC Mirage integration stopped")
        return True
    
    def _find_log_path(self) -> Optional[Path]:
        """Try to find the game log file."""
        for path_template in self.DEFAULT_LOG_PATHS:
            # Expand environment variables
            expanded = os.path.expandvars(path_template)
            path = Path(expanded)
            
            if path.exists():
                # Look for log files in directory
                if path.is_dir():
                    # Find most recent .log file
                    log_files = list(path.glob("*.log"))
                    if log_files:
                        # Return most recently modified
                        return max(log_files, key=lambda p: p.stat().st_mtime)
                elif path.is_file():
                    return path
        
        return None
    
    def _watch_log_file(self) -> None:
        """Watch the log file for new events (runs in background thread)."""
        if not self._log_path:
            return
        
        logger.debug(f"Starting log file watcher for: {self._log_path}")
        
        # Start from end of file
        try:
            self._file_position = self._log_path.stat().st_size
        except OSError:
            self._file_position = 0
        
        while not self._stop_event.is_set():
            try:
                self._check_log_file()
            except Exception as e:
                logger.error(f"Error checking log file: {e}")
            
            # Poll interval (50ms for low latency)
            self._stop_event.wait(0.05)
    
    def _check_log_file(self) -> None:
        """Check log file for new content."""
        if not self._log_path or not self._log_path.exists():
            return
        
        try:
            current_size = self._log_path.stat().st_size
        except OSError:
            return
        
        # File was truncated or rotated
        if current_size < self._file_position:
            self._file_position = 0
        
        # No new content
        if current_size == self._file_position:
            return
        
        # Read new content
        try:
            with open(self._log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._file_position)
                new_content = f.read()
                self._file_position = f.tell()
        except OSError:
            return
        
        # Parse lines for events
        for line in new_content.splitlines():
            self._parse_log_line(line.strip())
    
    def _parse_log_line(self, line: str) -> None:
        """
        Parse a log line for game events.
        
        This is a generic parser - specific patterns will need to be
        refined based on actual AC Mirage log format.
        """
        if not line:
            return
        
        line_lower = line.lower()
        
        # Example patterns (to be refined based on actual logs)
        # These are educated guesses based on typical game log formats
        
        # Damage patterns
        if any(x in line_lower for x in ['player took damage', 'player_hurt', 'damage received']):
            # Try to extract damage amount
            damage_match = re.search(r'damage[:\s]+(\d+)', line_lower)
            damage = int(damage_match.group(1)) if damage_match else 20
            
            # Try to detect direction
            direction = "front"  # default
            if 'back' in line_lower or 'behind' in line_lower:
                direction = "back"
            elif 'left' in line_lower:
                direction = "left"
            elif 'right' in line_lower:
                direction = "right"
            
            self.process_event(f"player_damage_{direction}", damage=damage)
        
        # Death patterns
        elif any(x in line_lower for x in ['player died', 'player_death', 'death', 'killed']):
            self.process_event("player_death")
        
        # Assassination patterns
        elif any(x in line_lower for x in ['assassination', 'stealth kill', 'hidden blade']):
            if 'air' in line_lower:
                self.process_event("air_assassination")
            else:
                self.process_event("assassination_kill")
        
        # Combat patterns
        elif 'parry' in line_lower or 'block' in line_lower:
            self.process_event("parry_block")
        
        elif 'counter' in line_lower:
            self.process_event("counter_attack")
        
        # Environmental patterns
        elif 'fall' in line_lower and 'damage' in line_lower:
            self.process_event("fall_damage")
        
        elif 'explosion' in line_lower:
            self.process_event("explosion")
        
        # Detection patterns
        elif 'detected' in line_lower or 'alert' in line_lower:
            if 'full' in line_lower or 'combat' in line_lower:
                self.process_event("full_detection")
            else:
                self.process_event("detection_alert")
        
        # Eagle vision
        elif 'eagle' in line_lower and 'vision' in line_lower:
            self.process_event("eagle_vision")
    
    def process_event(
        self,
        event_name: str,
        damage: Optional[float] = None,
        direction: Optional[str] = None,
        **kwargs,
    ) -> bool:
        """
        Process a game event (from log parsing or external command).
        
        Args:
            event_name: Event name (e.g., "player_damage", "player_death")
            damage: Optional damage amount for scaling intensity
            direction: Optional damage direction ("front", "back", "left", "right")
            
        Returns:
            True if event was processed, False if disabled or unknown
        """
        if not self._enabled:
            return False
        
        self._events_received += 1
        self._last_event_ts = time.time()
        self._last_event_type = event_name
        
        # Handle directional damage
        if event_name == "player_damage" and direction:
            event_name = f"player_damage_{direction}"
        
        # Get mapping for this event
        mapping = self.EVENT_MAPPINGS.get(event_name)
        if not mapping:
            logger.warning(f"Unknown AC Mirage event: {event_name}")
            return False
        
        # Calculate intensity (scale based on damage if provided)
        speed = mapping.speed
        if damage is not None and event_name.startswith("player_damage"):
            speed = self._scale_damage_intensity(damage)
        
        # Trigger haptics
        if self._on_trigger:
            for cell in mapping.cells:
                self._on_trigger(cell, speed)
        
        # Broadcast event
        if self._on_game_event:
            event_params = {
                "event_type": event_name,
                "damage": damage,
                "direction": direction,
                **kwargs,
            }
            self._on_game_event("acmirage_game_event", event_params)
        
        logger.debug(f"AC Mirage event: {event_name} (damage={damage}, cells={mapping.cells}, speed={speed})")
        return True
    
    def _scale_damage_intensity(self, damage: float, max_damage: float = 100.0) -> int:
        """
        Scale damage amount to haptic intensity (1-10).
        
        - Light scratch (5-15 damage): intensity 3-4
        - Medium hit (20-40 damage): intensity 5-7
        - Heavy hit (50+ damage): intensity 8-10
        """
        normalized = min(damage / max_damage, 1.0)
        return max(1, min(10, int(3 + normalized * 7)))
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._enabled,
            "is_running": self._is_running,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
            "last_event_type": self._last_event_type,
            "log_path": str(self._log_path) if self._log_path else None,
        }
