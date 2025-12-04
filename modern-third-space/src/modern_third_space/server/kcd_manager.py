"""
Kingdom Come: Deliverance Integration Manager for the vest daemon.

This module provides log file watching to receive game events from
Kingdom Come: Deliverance. The game events are emitted via a Lua script
(thirdspace_haptics.lua) that writes to the game log.

Pattern: [ThirdSpace] {EventType|param1=value1|param2=value2}
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from threading import Thread
from typing import Callable, Optional, List, Dict

from ..vest.cell_layout import (
    Cell,
    FRONT_CELLS,
    BACK_CELLS,
    ALL_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
    UPPER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Parser
# =============================================================================

@dataclass
class KCDEvent:
    """Parsed event from KCD log."""
    type: str
    raw: str
    params: Dict[str, str]
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()
    
    def get_int(self, key: str, default: int = 0) -> int:
        """Get parameter as integer."""
        try:
            return int(self.params.get(key, default))
        except (ValueError, TypeError):
            return default
    
    def get_float(self, key: str, default: float = 0.0) -> float:
        """Get parameter as float."""
        try:
            return float(self.params.get(key, default))
        except (ValueError, TypeError):
            return default


# Event format: [ThirdSpace] {EventType|param1=value1|param2=value2}
THIRDSPACE_PATTERN = re.compile(r'\[ThirdSpace\]\s*\{([^}]+)\}')


def parse_thirdspace_line(line: str) -> Optional[KCDEvent]:
    """
    Parse a [ThirdSpace] {...} line from KCD log.
    
    Returns KCDEvent if valid, None otherwise.
    """
    match = THIRDSPACE_PATTERN.search(line)
    if not match:
        return None
    
    content = match.group(1)
    parts = content.split('|')
    
    if not parts:
        return None
    
    event_type = parts[0]
    params = {}
    
    # Parse key=value pairs
    for part in parts[1:]:
        if '=' in part:
            key, value = part.split('=', 1)
            params[key.strip()] = value.strip()
    
    return KCDEvent(type=event_type, raw=content, params=params)


# =============================================================================
# Haptic Mapper
# =============================================================================

def direction_to_cells(direction: str) -> List[int]:
    """
    Convert damage direction to vest cells.
    
    Directions: front, back, left, right, or angle in degrees
    """
    direction = direction.lower().strip()
    
    if direction in ('front', 'forward', '0'):
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT,
                Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT]
    elif direction in ('back', 'rear', '180'):
        return BACK_CELLS
    elif direction in ('left', '90', '270'):
        return LEFT_SIDE
    elif direction in ('right', '270', '-90'):
        return RIGHT_SIDE
    else:
        # Try to parse as angle
        try:
            angle = float(direction) % 360
            if angle < 45 or angle >= 315:
                return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
            elif 45 <= angle < 135:
                return LEFT_SIDE
            elif 135 <= angle < 225:
                return BACK_CELLS
            else:
                return RIGHT_SIDE
        except ValueError:
            return FRONT_CELLS  # Default to front


def body_part_to_cells(body_part: str) -> List[int]:
    """Convert body part to vest cells."""
    part = body_part.lower().strip()
    
    if part in ('head', 'neck'):
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    elif part in ('torso', 'chest', 'body'):
        return FRONT_CELLS
    elif part in ('stomach', 'gut', 'abdomen'):
        return [Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT]
    elif part in ('left_arm', 'left_shoulder'):
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT]
    elif part in ('right_arm', 'right_shoulder'):
        return [Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT]
    elif part in ('left_leg', 'left_foot'):
        return [Cell.BACK_LOWER_LEFT]
    elif part in ('right_leg', 'right_foot'):
        return [Cell.BACK_LOWER_RIGHT]
    elif part in ('back', 'spine'):
        return BACK_CELLS
    else:
        return FRONT_CELLS  # Default


def map_event_to_haptics(event: KCDEvent) -> List[tuple[int, int]]:
    """
    Map a KCD event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    if event.type == "PlayerDamage":
        damage = event.get_int("damage", 10)
        health = event.get_int("health", 100)
        
        # Get direction if available
        direction = event.params.get("direction", "front")
        cells = direction_to_cells(direction)
        
        # Get body part if available
        body_part = event.params.get("bodyPart")
        if body_part:
            cells = body_part_to_cells(body_part)
        
        # Scale intensity by damage
        if damage > 40:
            speed = 9
        elif damage > 25:
            speed = 7
        elif damage > 10:
            speed = 5
        else:
            speed = 3
        
        # Boost intensity at low health
        if health < 20:
            speed = min(10, speed + 2)
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "PlayerDeath":
        # Full vest maximum intensity
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event.type == "CriticalHealth":
        # Heartbeat effect - left chest cells
        commands.append((Cell.FRONT_UPPER_LEFT, 4))
        commands.append((Cell.FRONT_LOWER_LEFT, 3))
    
    elif event.type == "PlayerHeal":
        # Gentle wave effect
        for cell in FRONT_CELLS:
            commands.append((cell, 2))
    
    elif event.type == "Attack":
        # Weapon swing feedback - upper cells
        commands.append((Cell.FRONT_UPPER_LEFT, 3))
        commands.append((Cell.FRONT_UPPER_RIGHT, 3))
    
    elif event.type == "Block":
        success = event.params.get("success", "false").lower() == "true"
        if success:
            # Successful block - firm feedback
            commands.append((Cell.FRONT_UPPER_LEFT, 6))
            commands.append((Cell.FRONT_UPPER_RIGHT, 6))
        else:
            # Failed block - stronger feedback
            for cell in FRONT_CELLS:
                commands.append((cell, 7))
    
    elif event.type == "Hit":
        # When player hits enemy - light recoil
        commands.append((Cell.FRONT_UPPER_LEFT, 2))
        commands.append((Cell.FRONT_UPPER_RIGHT, 2))
    
    return commands


# =============================================================================
# Log File Watcher
# =============================================================================

class KCDLogWatcher:
    """
    Watches Kingdom Come: Deliverance log file for [ThirdSpace] events.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[KCDEvent], None],
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
        
        if not self.log_path.exists():
            return False, f"Log file not found: {self.log_path}"
        
        self._running = True
        self._last_position = self.log_path.stat().st_size  # Start from end
        
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
        logger.info("Stopped watching KCD log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading KCD log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the log file."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (game restart)
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
                if "[ThirdSpace]" in line:
                    event = parse_thirdspace_line(line)
                    if event:
                        self.on_event(event)
        
        except IOError as e:
            logger.debug(f"IOError reading log: {e}")


# =============================================================================
# KCD Manager (Daemon Integration)
# =============================================================================

GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class KCDManager:
    """
    Manages Kingdom Come: Deliverance integration within the daemon.
    
    This class:
    1. Watches game log for [ThirdSpace] events
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    """
    
    # Default paths for KCD log files
    DEFAULT_LOG_PATHS = [
        # KCD 1 - Windows
        Path(os.path.expanduser("~")) / "Saved Games" / "kingdomcome" / "game.log",
        Path("C:/Program Files (x86)/Steam/steamapps/common/KingdomComeDeliverance/game.log"),
        Path("C:/Program Files/Steam/steamapps/common/KingdomComeDeliverance/game.log"),
        # KCD 2 - Windows
        Path(os.path.expandvars("%LOCALAPPDATA%")) / "KingdomComeDeliverance2" / "game.log",
        Path("C:/Program Files (x86)/Steam/steamapps/common/KingdomComeDeliverance2/game.log"),
        # Linux (Proton)
        Path.home() / ".steam/steam/steamapps/common/KingdomComeDeliverance/game.log",
        Path.home() / ".steam/steam/steamapps/common/KingdomComeDeliverance2/game.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[KCDLogWatcher] = None
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
    
    def auto_detect_log_path(self) -> Optional[Path]:
        """Try to auto-detect the game log path."""
        for path in self.DEFAULT_LOG_PATHS:
            if path.exists():
                return path
        
        # Check parent directories (game installed but no log yet)
        for path in self.DEFAULT_LOG_PATHS:
            if path.parent.exists():
                return path
        
        return None
    
    def start(self, log_path: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Start watching for KCD events.
        
        Args:
            log_path: Path to game log, or None for auto-detect
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "KCD integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, (
                "Could not find KCD log file. "
                "Ensure Kingdom Come: Deliverance is installed and "
                "the ThirdSpace Lua script is loaded."
            )
        
        # Create watcher
        self._watcher = KCDLogWatcher(
            log_path=self._log_path,
            on_event=self._on_kcd_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        
        logger.info(f"KCD integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for KCD events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("KCD integration stopped")
        return True
    
    def _on_kcd_event(self, event: KCDEvent):
        """Called when a KCD event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"KCD event: {event.type} - {event.params}")
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event.type, event.params)
        
        # Map to haptics and trigger
        haptic_commands = map_event_to_haptics(event)
        for cell, speed in haptic_commands:
            self._trigger(cell, speed)
    
    def _trigger(self, cell: int, speed: int):
        """Trigger a haptic effect via callback."""
        if self.on_trigger:
            self.on_trigger(cell, speed)


# =============================================================================
# Mod Resources
# =============================================================================

def get_mod_info() -> dict:
    """Get information about the required mod."""
    return {
        "name": "Third Space Haptics for Kingdom Come: Deliverance",
        "description": "Lua script that logs game events for haptic feedback",
        "version": "1.0.0",
        "files": [
            "Mods/ThirdSpaceHaptics/Scripts/Startup/thirdspace_haptics.lua"
        ],
        "install_instructions": [
            "1. Download the ThirdSpaceHaptics mod",
            "2. Extract to your KCD installation folder",
            "3. The mod should be in: Mods/ThirdSpaceHaptics/",
            "4. Launch the game - script auto-loads on startup",
            "5. (Optional) Enable dev mode with -devmode flag for testing",
        ],
        "console_commands": [
            "ts_init - Initialize the haptics integration",
            "ts_status - Show current status",
            "ts_update - Manual update (for testing)",
        ],
    }
