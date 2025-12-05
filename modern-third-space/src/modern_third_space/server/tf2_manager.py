"""
Team Fortress 2 Integration Manager for the vest daemon.

This module provides console.log file watching to receive game events from
Team Fortress 2. The game events are parsed from the console output when
the game is launched with -condebug.

When TF2 game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients
"""

from __future__ import annotations

import logging
import re
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
    UPPER_CELLS,
    LOWER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Parser
# =============================================================================

@dataclass
class TF2Event:
    """Parsed event from TF2 console log."""
    type: str
    raw: str
    params: dict
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Regex patterns for TF2 console log events
PATTERNS = {
    # Damage taken: "Damage Taken from "AttackerName" - 108"
    "damage_taken": re.compile(
        r'Damage\s+Taken\s+from\s+"([^"]+)"\s*-\s*(\d+)',
        re.IGNORECASE
    ),
    
    # Damage dealt: "Damage Done to "VictimName" - 45"
    "damage_dealt": re.compile(
        r'Damage\s+Done\s+to\s+"([^"]+)"\s*-\s*(\d+)',
        re.IGNORECASE
    ),
    
    # Kill event: "PlayerName killed VictimName with weapon"
    "kill": re.compile(
        r'^([^\[\]]+?)\s+killed\s+([^\[\]]+?)\s+with\s+(\S+)\.?\s*(\(.*\))?',
        re.IGNORECASE
    ),
    
    # Death event: "* PlayerName was killed by AttackerName"
    "death": re.compile(
        r'^\*\s+(.+?)\s+was\s+killed\s+by\s+(.+?)$',
        re.IGNORECASE
    ),
    
    # Headshot notification
    "headshot": re.compile(r'Headshot!', re.IGNORECASE),
    
    # Critical hit
    "critical": re.compile(r'\(crit\)|\[critical\]', re.IGNORECASE),
    
    # Backstab
    "backstab": re.compile(r"Backstab!|You've backstabbed", re.IGNORECASE),
    
    # ÜberCharge
    "ubercharge": re.compile(r'ÜberCharge|Ubercharge.*deployed', re.IGNORECASE),
    
    # Domination
    "domination": re.compile(r'You are dominating|DOMINATING!', re.IGNORECASE),
    
    # Revenge
    "revenge": re.compile(r'REVENGE!', re.IGNORECASE),
    
    # Round events
    "round_start": re.compile(r'Round started|Round Start', re.IGNORECASE),
    "round_end": re.compile(r'Round over|Round End', re.IGNORECASE),
    
    # Capture events
    "capture": re.compile(
        r'captured.*control point|captured.*intelligence|captured',
        re.IGNORECASE
    ),
    
    # Ignite (Pyro fire damage)
    "ignite": re.compile(r'ignited', re.IGNORECASE),
    
    # Extinguish
    "extinguish": re.compile(r'extinguished', re.IGNORECASE),
    
    # Airblast
    "airblast": re.compile(r'airblast|reflected', re.IGNORECASE),
    
    # Rocket/Sticky jump damage (self-damage from explosive jump)
    "explosive_jump": re.compile(
        r'Damage\s+Taken\s+from\s+"([^"]+)"\s*-\s*(\d+).*(?:rocket_launcher|stickybomb)',
        re.IGNORECASE
    ),
    
    # Healing received
    "healing": re.compile(
        r'Healed\s+by\s+"([^"]+)"\s*-\s*(\d+)|received\s+(\d+)\s+health',
        re.IGNORECASE
    ),
}


def parse_console_line(line: str) -> Optional[TF2Event]:
    """
    Parse a TF2 console log line for game events.
    
    Returns TF2Event if a known event is detected, None otherwise.
    """
    line = line.strip()
    if not line:
        return None
    
    # Check damage taken (highest priority for haptics)
    match = PATTERNS["damage_taken"].search(line)
    if match:
        attacker = match.group(1)
        damage = int(match.group(2))
        return TF2Event(
            type="damage_taken",
            raw=line,
            params={"attacker": attacker, "damage": damage}
        )
    
    # Check for critical hit modifier in kill lines
    is_critical = bool(PATTERNS["critical"].search(line))
    
    # Check kill event
    match = PATTERNS["kill"].search(line)
    if match:
        killer = match.group(1).strip()
        victim = match.group(2).strip()
        weapon = match.group(3).strip()
        modifier = match.group(4) if match.group(4) else ""
        is_headshot = "headshot" in modifier.lower()
        return TF2Event(
            type="kill",
            raw=line,
            params={
                "killer": killer,
                "victim": victim,
                "weapon": weapon,
                "headshot": is_headshot,
                "critical": is_critical or "crit" in modifier.lower(),
            }
        )
    
    # Check backstab
    if PATTERNS["backstab"].search(line):
        return TF2Event(type="backstab", raw=line, params={})
    
    # Check headshot (standalone notification)
    if PATTERNS["headshot"].search(line):
        return TF2Event(type="headshot", raw=line, params={})
    
    # Check ÜberCharge
    if PATTERNS["ubercharge"].search(line):
        return TF2Event(type="ubercharge", raw=line, params={})
    
    # Check domination
    if PATTERNS["domination"].search(line):
        return TF2Event(type="domination", raw=line, params={})
    
    # Check revenge
    if PATTERNS["revenge"].search(line):
        return TF2Event(type="revenge", raw=line, params={})
    
    # Check round events
    if PATTERNS["round_start"].search(line):
        return TF2Event(type="round_start", raw=line, params={})
    
    if PATTERNS["round_end"].search(line):
        return TF2Event(type="round_end", raw=line, params={})
    
    # Check capture
    if PATTERNS["capture"].search(line):
        return TF2Event(type="capture", raw=line, params={})
    
    # Check ignite (fire damage)
    if PATTERNS["ignite"].search(line):
        return TF2Event(type="ignite", raw=line, params={})
    
    # Check damage dealt (secondary, for feedback on successful hits)
    match = PATTERNS["damage_dealt"].search(line)
    if match:
        victim = match.group(1)
        damage = int(match.group(2))
        return TF2Event(
            type="damage_dealt",
            raw=line,
            params={"victim": victim, "damage": damage}
        )
    
    return None


# =============================================================================
# Haptic Mapper
# =============================================================================

def map_event_to_haptics(event: TF2Event, player_name: Optional[str] = None) -> List[tuple[int, int]]:
    """
    Map a TF2 event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    
    Args:
        event: The parsed TF2 event
        player_name: Optional player name to filter events for (for death detection)
    """
    commands = []
    
    if event.type == "damage_taken":
        damage = event.params.get("damage", 0)
        # Scale intensity based on damage (TF2 damage is typically 3-300)
        if damage < 30:
            speed = 4
            cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
        elif damage < 60:
            speed = 6
            cells = FRONT_CELLS
        elif damage < 100:
            speed = 8
            cells = FRONT_CELLS + BACK_CELLS[:2]  # Front + upper back
        else:
            speed = 10
            cells = ALL_CELLS
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "kill":
        # Check if this is the player dying (victim matches player_name)
        victim = event.params.get("victim", "")
        is_player_death = player_name and player_name.lower() in victim.lower()
        
        if is_player_death:
            # Player died - strong full vest effect
            for cell in ALL_CELLS:
                commands.append((cell, 10))
        else:
            # Player got a kill - satisfying feedback
            is_headshot = event.params.get("headshot", False)
            is_critical = event.params.get("critical", False)
            
            if is_headshot:
                # Headshot kill - quick upper pulse
                speed = 7
                commands.append((Cell.FRONT_UPPER_LEFT, speed))
                commands.append((Cell.FRONT_UPPER_RIGHT, speed))
            elif is_critical:
                # Critical kill - stronger front pulse
                speed = 6
                for cell in FRONT_CELLS:
                    commands.append((cell, speed))
            else:
                # Normal kill - light front pulse
                commands.append((Cell.FRONT_UPPER_LEFT, 4))
                commands.append((Cell.FRONT_UPPER_RIGHT, 4))
    
    elif event.type == "backstab":
        # Backstab - strong back sensation (Spy victim feels this)
        for cell in BACK_CELLS:
            commands.append((cell, 9))
    
    elif event.type == "headshot":
        # Headshot notification (Sniper got a headshot)
        commands.append((Cell.FRONT_UPPER_LEFT, 5))
        commands.append((Cell.FRONT_UPPER_RIGHT, 5))
    
    elif event.type == "ubercharge":
        # ÜberCharge deployed - wave pattern all cells
        for cell in ALL_CELLS:
            commands.append((cell, 6))
    
    elif event.type == "domination":
        # Domination - satisfying burst
        for cell in FRONT_CELLS:
            commands.append((cell, 7))
    
    elif event.type == "revenge":
        # Revenge - victory burst
        for cell in ALL_CELLS:
            commands.append((cell, 5))
    
    elif event.type == "round_start":
        # Round start - light activation
        for cell in ALL_CELLS:
            commands.append((cell, 2))
    
    elif event.type == "round_end":
        # Round end - subtle all-cell pulse
        for cell in ALL_CELLS:
            commands.append((cell, 3))
    
    elif event.type == "capture":
        # Point/intel capture - celebratory pulse
        for cell in FRONT_CELLS:
            commands.append((cell, 5))
    
    elif event.type == "ignite":
        # On fire - progressive chest pulses
        commands.append((Cell.FRONT_LOWER_LEFT, 3))
        commands.append((Cell.FRONT_LOWER_RIGHT, 3))
    
    elif event.type == "damage_dealt":
        # Player dealt damage - subtle confirmation feedback
        damage = event.params.get("damage", 0)
        if damage >= 50:
            # Significant hit
            commands.append((Cell.FRONT_UPPER_LEFT, 2))
            commands.append((Cell.FRONT_UPPER_RIGHT, 2))
    
    return commands


# =============================================================================
# Console Log Watcher
# =============================================================================

class ConsoleLogWatcher:
    """
    Watches TF2 console.log for game events.
    
    The game must be launched with -condebug to enable console logging.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[TF2Event], None],
        poll_interval: float = DEFAULT_POLL_INTERVAL,
    ):
        self.log_path = log_path
        self.on_event = on_event
        self.poll_interval = poll_interval
        
        self._running = False
        self._last_position = 0
        self._thread: Optional[Thread] = None
    
    def start(self) -> tuple[bool, Optional[str]]:
        """Start watching the console log."""
        if self._running:
            return False, "Already watching"
        
        if not self.log_path.exists():
            # Check if parent exists (game installed but log not created yet)
            if not self.log_path.parent.exists():
                return False, f"TF2 installation not found. Expected log at: {self.log_path}"
            # Log doesn't exist yet but that's OK - game will create it
            self._last_position = 0
        else:
            # Start from end of existing log
            self._last_position = self.log_path.stat().st_size
        
        self._running = True
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Started watching TF2 console log: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the console log."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching TF2 console log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading TF2 console log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the console log."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (game restart)
        if current_size < self._last_position:
            logger.info("TF2 console log truncated, resetting position")
            self._last_position = 0
        
        if current_size == self._last_position:
            return
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._last_position)
                new_content = f.read()
                self._last_position = f.tell()
            
            for line in new_content.splitlines():
                event = parse_console_line(line)
                if event:
                    self.on_event(event)
        
        except IOError as e:
            # File may be locked by game
            logger.debug(f"IOError reading TF2 log (game may have lock): {e}")


# =============================================================================
# TF2 Manager (Daemon Integration)
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class TF2Manager:
    """
    Manages Team Fortress 2 integration within the daemon.
    
    This class:
    1. Watches console.log for TF2 game events
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    # Default paths for console.log
    DEFAULT_LOG_PATHS = [
        # Windows
        Path("C:/Program Files (x86)/Steam/steamapps/common/Team Fortress 2/tf/console.log"),
        # Linux
        Path.home() / ".steam/steam/steamapps/common/Team Fortress 2/tf/console.log",
        # Linux (alternative)
        Path.home() / ".local/share/Steam/steamapps/common/Team Fortress 2/tf/console.log",
        # macOS
        Path.home() / "Library/Application Support/Steam/steamapps/common/Team Fortress 2/tf/console.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[ConsoleLogWatcher] = None
        self._running = False
        self._player_name: Optional[str] = None  # For death detection
        
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
        """Try to auto-detect the console.log path."""
        for path in self.DEFAULT_LOG_PATHS:
            if path.exists():
                return path
        
        # Also check parent directories exist (game installed but no log yet)
        for path in self.DEFAULT_LOG_PATHS:
            if path.parent.exists():
                return path
        
        return None
    
    def start(
        self,
        log_path: Optional[str] = None,
        player_name: Optional[str] = None,
    ) -> tuple[bool, Optional[str]]:
        """
        Start watching for TF2 events.
        
        Args:
            log_path: Path to console.log, or None for auto-detect
            player_name: Optional player name for death detection
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "TF2 integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, (
                "Could not find TF2 console.log. "
                "Ensure Team Fortress 2 is installed and launched with -condebug. "
                "Expected location: Steam/steamapps/common/Team Fortress 2/tf/console.log"
            )
        
        self._player_name = player_name
        
        # Create watcher
        self._watcher = ConsoleLogWatcher(
            log_path=self._log_path,
            on_event=self._on_tf2_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        
        logger.info(f"TF2 integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for TF2 events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("TF2 integration stopped")
        return True
    
    def set_player_name(self, player_name: str):
        """Set the player name for death detection."""
        self._player_name = player_name
        logger.info(f"TF2 player name set to: {player_name}")
    
    def _on_tf2_event(self, event: TF2Event):
        """Called when a TF2 event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"TF2 event: {event.type} - {event.params}")
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event.type, event.params)
        
        # Map to haptics and trigger
        haptic_commands = map_event_to_haptics(event, self._player_name)
        for cell, speed in haptic_commands:
            self._trigger(cell, speed)
    
    def _trigger(self, cell: int, speed: int):
        """Trigger a haptic effect via callback."""
        if self.on_trigger:
            self.on_trigger(cell, speed)
