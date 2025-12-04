"""
For Honor Integration Manager for the vest daemon.

This module provides log file watching to receive game events from For Honor.
The game can output debug logs when launched with the -log flag.

When For Honor game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients

For Honor uses directional combat with attacks from three stances (left, right, top),
making it ideal for directional haptic feedback on the Third Space Vest.
"""

from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from threading import Thread
from typing import Callable, Optional, List, Dict, Any

from ..vest.cell_layout import (
    Cell,
    FRONT_CELLS,
    BACK_CELLS,
    ALL_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
    UPPER_CELLS,
    LOWER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Parser
# =============================================================================

@dataclass
class ForHonorEvent:
    """Parsed event from For Honor log file."""
    type: str
    raw: str
    params: Dict[str, Any]
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Combat event patterns to look for in logs
# These patterns will be validated and refined with actual game logs
COMBAT_PATTERNS = [
    # Damage events - direction and amount
    (re.compile(r'Player\s+(?:took|received)\s+(\d+)\s+damage\s+from\s+(LEFT|RIGHT|TOP|BACK)', re.IGNORECASE), "damage"),
    (re.compile(r'(?:Hit|Damage)\s+(?:received|taken):\s*(\d+)\s*(?:from\s+)?(left|right|top|back)?', re.IGNORECASE), "damage"),
    
    # Block/Parry events
    (re.compile(r'Player\s+(?:blocked|parried)\s+(?:attack\s+)?from\s+(LEFT|RIGHT|TOP)', re.IGNORECASE), "block"),
    (re.compile(r'(?:Block|Parry)\s+successful:\s*(left|right|top)?', re.IGNORECASE), "block"),
    
    # Guard break
    (re.compile(r'(?:Guard\s+break|GB)\s+(?:on\s+)?player', re.IGNORECASE), "guard_break"),
    
    # Death
    (re.compile(r'Player\s+(?:died|killed|eliminated)', re.IGNORECASE), "death"),
    (re.compile(r'(?:Death|Killed):\s*player', re.IGNORECASE), "death"),
    
    # Execution events
    (re.compile(r'(?:Execution|Execute)\s+(?:started|performed)', re.IGNORECASE), "execution"),
    (re.compile(r'Player\s+(?:being\s+)?executed', re.IGNORECASE), "execution_victim"),
    
    # Kill/Execution performed
    (re.compile(r'Player\s+(?:killed|executed)\s+(?:enemy|opponent)', re.IGNORECASE), "kill"),
    
    # Revenge mode
    (re.compile(r'Revenge\s+(?:mode\s+)?activated', re.IGNORECASE), "revenge"),
    
    # Feat usage
    (re.compile(r'Feat\s+(?:used|activated):\s*(.+)', re.IGNORECASE), "feat"),
    
    # Ledge kill
    (re.compile(r'(?:Ledge|Environmental)\s+kill', re.IGNORECASE), "ledge_kill"),
]


def parse_log_line(line: str) -> Optional[ForHonorEvent]:
    """
    Parse a log line for combat events.
    
    Returns ForHonorEvent if a combat event is detected, None otherwise.
    """
    for pattern, event_type in COMBAT_PATTERNS:
        match = pattern.search(line)
        if match:
            groups = match.groups()
            params = {}
            
            if event_type == "damage":
                # Extract damage amount and direction
                if len(groups) >= 1 and groups[0] and groups[0].isdigit():
                    params["amount"] = int(groups[0])
                if len(groups) >= 2 and groups[1]:
                    params["direction"] = groups[1].upper()
                    
            elif event_type == "block":
                # Extract block direction
                if len(groups) >= 1 and groups[0]:
                    params["direction"] = groups[0].upper()
                    
            elif event_type == "feat":
                # Extract feat name
                if len(groups) >= 1 and groups[0]:
                    params["feat_name"] = groups[0].strip()
            
            return ForHonorEvent(
                type=event_type,
                raw=line.strip(),
                params=params,
            )
    
    return None


# =============================================================================
# Haptic Mapper
# =============================================================================

def direction_to_cells(direction: str) -> List[int]:
    """
    Convert attack direction to vest cells.
    
    For Honor attack directions:
    - LEFT: Attack from left side
    - RIGHT: Attack from right side  
    - TOP: Attack from above (overhead)
    - BACK: Attack from behind
    
    Uses correct hardware cell layout from cell_layout module:
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    direction = direction.upper()
    
    if direction == "LEFT":
        # Attack from left - affects left side of body
        return LEFT_SIDE
    elif direction == "RIGHT":
        # Attack from right - affects right side of body
        return RIGHT_SIDE
    elif direction == "TOP":
        # Overhead attack - affects upper cells
        return UPPER_CELLS
    elif direction == "BACK":
        # Attack from behind - affects back cells
        return BACK_CELLS
    else:
        # Default to front
        return FRONT_CELLS


def map_event_to_haptics(event: ForHonorEvent) -> List[tuple[int, int]]:
    """
    Map a For Honor event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    if event.type == "damage":
        direction = event.params.get("direction", "FRONT")
        amount = event.params.get("amount", 20)
        cells = direction_to_cells(direction)
        
        # Intensity based on damage amount
        # Light hit: 1-15 damage -> speed 4
        # Medium hit: 16-30 damage -> speed 6
        # Heavy hit: 31+ damage -> speed 8
        if amount < 16:
            speed = 4
        elif amount < 31:
            speed = 6
        else:
            speed = 8
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "block":
        direction = event.params.get("direction", "TOP")
        cells = direction_to_cells(direction)
        
        # Light feedback for successful block
        for cell in cells:
            commands.append((cell, 2))
    
    elif event.type == "guard_break":
        # Strong front hit - being guard broken
        for cell in FRONT_CELLS:
            commands.append((cell, 6))
    
    elif event.type == "death":
        # Full vest strong effect
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event.type == "execution_victim":
        # Being executed - dramatic full body effect
        for cell in ALL_CELLS:
            commands.append((cell, 8))
    
    elif event.type == "execution":
        # Performing execution - satisfaction pulse
        commands.append((Cell.FRONT_UPPER_LEFT, 3))
        commands.append((Cell.FRONT_UPPER_RIGHT, 3))
    
    elif event.type == "kill":
        # Got a kill - quick upper pulse
        commands.append((Cell.FRONT_UPPER_LEFT, 4))
        commands.append((Cell.FRONT_UPPER_RIGHT, 4))
    
    elif event.type == "revenge":
        # Revenge mode activated - strong full body pulse
        for cell in ALL_CELLS:
            commands.append((cell, 6))
    
    elif event.type == "feat":
        # Feat used - front upper pulse
        commands.append((Cell.FRONT_UPPER_LEFT, 3))
        commands.append((Cell.FRONT_UPPER_RIGHT, 3))
    
    elif event.type == "ledge_kill":
        # Ledge kill - satisfaction pulse
        commands.append((Cell.FRONT_UPPER_LEFT, 5))
        commands.append((Cell.FRONT_UPPER_RIGHT, 5))
    
    return commands


# =============================================================================
# Log File Watcher
# =============================================================================

class ForHonorLogWatcher:
    """
    Watches For Honor log files for combat events.
    
    The game should be launched with -log flag to enable logging.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[ForHonorEvent], None],
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
        
        # Check if parent directory exists (game installed)
        if not self.log_path.parent.exists():
            return False, f"Game directory not found: {self.log_path.parent}"
        
        # If log file doesn't exist yet, start anyway (will be created when game starts)
        if self.log_path.exists():
            self._last_position = self.log_path.stat().st_size  # Start from end
        else:
            self._last_position = 0
            logger.info(f"Log file doesn't exist yet, will watch when created: {self.log_path}")
        
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
        logger.info("Stopped watching For Honor log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading For Honor log: {e}")
            
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
                event = parse_log_line(line)
                if event:
                    self.on_event(event)
        
        except IOError as e:
            # File may be locked by game
            logger.debug(f"IOError reading log (game may have lock): {e}")


# =============================================================================
# For Honor Manager (Daemon Integration)
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class ForHonorManager:
    """
    Manages For Honor integration within the daemon.
    
    This class:
    1. Watches game log files for combat events
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    # Default paths for For Honor log files
    DEFAULT_LOG_PATHS = [
        # Ubisoft Connect default
        Path(os.environ.get("LOCALAPPDATA", "")) / "Ubisoft Game Launcher" / "logs" / "ForHonor.log",
        # Steam version
        Path("C:/Program Files (x86)/Steam/steamapps/common/FOR HONOR/logs/ForHonor.log"),
        Path("D:/SteamLibrary/steamapps/common/FOR HONOR/logs/ForHonor.log"),
        # Ubisoft Connect in Program Files
        Path("C:/Program Files/Ubisoft/Ubisoft Game Launcher/games/FOR HONOR/logs/ForHonor.log"),
        Path("C:/Program Files (x86)/Ubisoft/Ubisoft Game Launcher/games/FOR HONOR/logs/ForHonor.log"),
        # AppData logs
        Path(os.environ.get("LOCALAPPDATA", "")) / "ForHonor" / "ForHonor.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[ForHonorLogWatcher] = None
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
    
    @property
    def last_event_type(self) -> Optional[str]:
        return self._last_event_type
    
    def auto_detect_log_path(self) -> Optional[Path]:
        """Try to auto-detect the log file path."""
        for path in self.DEFAULT_LOG_PATHS:
            if path.exists():
                return path
        
        # Also check parent directories exist (game installed but no log yet)
        for path in self.DEFAULT_LOG_PATHS:
            if path.parent.exists():
                return path
        
        return None
    
    def start(self, log_path: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Start watching for For Honor events.
        
        Args:
            log_path: Path to log file, or None for auto-detect
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "For Honor integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, "Could not find For Honor log file. Ensure the game is installed and launched with -log flag"
        
        # Create watcher
        self._watcher = ForHonorLogWatcher(
            log_path=self._log_path,
            on_event=self._on_forhonor_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        
        logger.info(f"For Honor integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for For Honor events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("For Honor integration stopped")
        return True
    
    def _on_forhonor_event(self, event: ForHonorEvent):
        """Called when a For Honor event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"For Honor event: {event.type} - {event.params}")
        
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
# Setup Information
# =============================================================================

def get_setup_info() -> dict:
    """Get setup information for For Honor integration."""
    return {
        "name": "For Honor Haptic Integration",
        "description": "Log file watcher for For Honor combat events",
        "setup_instructions": [
            "1. Open Ubisoft Connect or Steam",
            "2. Right-click For Honor → Properties → Launch Options",
            "3. Add: -log -logfile \"ForHonor.log\"",
            "4. Start the daemon and For Honor integration",
            "5. Launch For Honor",
        ],
        "note": "The game must be launched with -log flag to enable logging.",
        "supported_events": [
            "damage (directional: LEFT, RIGHT, TOP, BACK)",
            "block (directional parry)",
            "guard_break",
            "death",
            "execution",
            "execution_victim",
            "kill",
            "revenge",
            "feat",
            "ledge_kill",
        ],
    }
