"""
Half-Life 2: Deathmatch Integration Manager for the vest daemon.

This module provides console.log file watching to receive game events from
Half-Life 2: Deathmatch. The game writes events to console.log when launched
with the -condebug flag.

When HL2:DM game events are detected, they are passed to callbacks which the
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
from typing import Callable, Optional, List, Tuple

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
class HL2DMEvent:
    """Parsed event from Half-Life 2: Deathmatch console.log."""
    type: str  # "player_damage", "player_death", "player_kill", "respawn", etc.
    raw: str
    params: dict
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# =============================================================================
# Console Log Patterns
# =============================================================================

# Source engine damage patterns
# Examples:
# - "PlayerName" took 25 damage from "AttackerName"
# - "PlayerName" was hurt by "AttackerName" for 25 damage
# - L 03/04/2025 - 10:15:32: "PlayerName<123><STEAM_0:1:12345><>" took damage
DAMAGE_PATTERN = re.compile(
    r'"(?P<victim>[^"<]+)(?:<[^>]*>)?"?\s+(?:took|was\s+hurt\s+by|received)\s+(?P<damage>\d+)\s+damage(?:\s+from\s+"?(?P<attacker>[^"<]+)"?)?',
    re.IGNORECASE
)

# Alternative damage pattern (simpler format)
DAMAGE_PATTERN_ALT = re.compile(
    r'(?P<victim>\w+)\s+took\s+(?P<damage>\d+)\s+damage',
    re.IGNORECASE
)

# Kill patterns
# Examples:
# - "AttackerName" killed "VictimName" with weapon_pistol
# - "VictimName" was killed by "AttackerName"
# - PlayerName killed VictimName with weapon_crossbow
KILL_PATTERN = re.compile(
    r'"?(?P<attacker>[^"<]+)(?:<[^>]*>)?"?\s+killed\s+"?(?P<victim>[^"<]+)(?:<[^>]*>)?"?(?:\s+with\s+(?P<weapon>\w+))?',
    re.IGNORECASE
)

# Suicide pattern
# Examples:
# - "PlayerName" suicided
# - PlayerName committed suicide
SUICIDE_PATTERN = re.compile(
    r'"?(?P<player>[^"<]+)(?:<[^>]*>)?"?\s+(?:suicided|committed\s+suicide)',
    re.IGNORECASE
)

# Player death (generic)
# Examples:
# - "PlayerName" died
# - "PlayerName" was killed
DEATH_PATTERN = re.compile(
    r'"?(?P<victim>[^"<]+)(?:<[^>]*>)?"?\s+(?:died|was\s+killed)',
    re.IGNORECASE
)

# Player spawn/respawn
# Examples:
# - PlayerName entered the game
# - "PlayerName" spawned
SPAWN_PATTERN = re.compile(
    r'"?(?P<player>[^"<]+)(?:<[^>]*>)?"?\s+(?:entered\s+the\s+game|spawned|respawned)',
    re.IGNORECASE
)

# Connection patterns (for player identification)
CONNECT_PATTERN = re.compile(
    r'"?(?P<player>[^"<]+)(?:<[^>]*>)?"?\s+(?:connected|joined)',
    re.IGNORECASE
)


def parse_console_line(line: str, player_name: Optional[str] = None) -> Optional[HL2DMEvent]:
    """
    Parse a console log line for HL2:DM events.
    
    Args:
        line: Log line to parse
        player_name: Optional player name to identify player events (filters to only your events)
        
    Returns:
        HL2DMEvent if valid, None otherwise
    """
    # Remove timestamp prefix if present
    # Format: L MM/DD/YYYY - HH:MM:SS: message
    original_line = line
    if line.startswith("L "):
        # Find the colon after timestamp
        colon_idx = line.find(":", 20)  # Start after date portion
        if colon_idx > 0:
            line = line[colon_idx + 1:].strip()
    
    # Try kill pattern first (more specific)
    match = KILL_PATTERN.search(line)
    if match:
        attacker = match.group("attacker").strip()
        victim = match.group("victim").strip()
        weapon = match.group("weapon") or "unknown"
        
        # Determine event type based on player_name filter
        if player_name:
            attacker_lower = attacker.lower()
            victim_lower = victim.lower()
            player_lower = player_name.lower()
            
            if victim_lower == player_lower:
                # Player died (was killed by someone)
                return HL2DMEvent(
                    type="player_death",
                    raw=original_line,
                    params={
                        "victim": victim,
                        "attacker": attacker,
                        "weapon": weapon,
                    }
                )
            elif attacker_lower == player_lower:
                # Player got a kill
                return HL2DMEvent(
                    type="player_kill",
                    raw=original_line,
                    params={
                        "attacker": attacker,
                        "victim": victim,
                        "weapon": weapon,
                    }
                )
            # Otherwise, not relevant to our player
            return None
        else:
            # No player filter - report all kills as deaths (for testing)
            return HL2DMEvent(
                type="player_death",
                raw=original_line,
                params={
                    "victim": victim,
                    "attacker": attacker,
                    "weapon": weapon,
                }
            )
    
    # Check for suicide
    match = SUICIDE_PATTERN.search(line)
    if match:
        player = match.group("player").strip()
        
        if not player_name or player.lower() == player_name.lower():
            return HL2DMEvent(
                type="player_death",
                raw=original_line,
                params={
                    "victim": player,
                    "attacker": "self",
                    "weapon": "suicide",
                }
            )
        return None
    
    # Check for generic death
    match = DEATH_PATTERN.search(line)
    if match:
        victim = match.group("victim").strip()
        
        if not player_name or victim.lower() == player_name.lower():
            return HL2DMEvent(
                type="player_death",
                raw=original_line,
                params={
                    "victim": victim,
                    "attacker": "unknown",
                }
            )
        return None
    
    # Check for damage events
    match = DAMAGE_PATTERN.search(line)
    if not match:
        match = DAMAGE_PATTERN_ALT.search(line)
    
    if match:
        victim = match.group("victim").strip()
        damage = int(match.group("damage"))
        attacker = match.group("attacker").strip() if "attacker" in match.groupdict() and match.group("attacker") else "unknown"
        
        # Only trigger for the player if filter is set
        if player_name and victim.lower() != player_name.lower():
            return None
        
        return HL2DMEvent(
            type="player_damage",
            raw=original_line,
            params={
                "victim": victim,
                "damage": damage,
                "attacker": attacker,
            }
        )
    
    # Check for spawn/respawn
    match = SPAWN_PATTERN.search(line)
    if match:
        player = match.group("player").strip()
        
        if not player_name or player.lower() == player_name.lower():
            return HL2DMEvent(
                type="respawn",
                raw=original_line,
                params={
                    "player": player,
                }
            )
        return None
    
    return None


# =============================================================================
# Event-to-Haptic Mapping
# =============================================================================

def map_event_to_haptics(event: HL2DMEvent) -> List[Tuple[int, int]]:
    """
    Map HL2:DM event to haptic commands (cell, speed).
    
    Args:
        event: Parsed HL2:DM event
        
    Returns:
        List of (cell, speed) tuples
    """
    commands: List[Tuple[int, int]] = []
    
    if event.type == "player_death":
        # Full vest pulse (all cells, max intensity) - player died
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event.type == "player_damage":
        damage = event.params.get("damage", 0)
        
        # Skip 0 damage events
        if damage <= 0:
            return commands
        
        # Scale intensity by damage amount
        if damage <= 10:
            intensity = 3
            cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
        elif damage <= 25:
            intensity = 5
            cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
        elif damage <= 50:
            intensity = 7
            cells = FRONT_CELLS
        elif damage <= 75:
            intensity = 8
            cells = FRONT_CELLS + BACK_CELLS[:2]  # Front + back upper
        else:
            intensity = 10
            cells = ALL_CELLS
        
        for cell in cells:
            commands.append((cell, intensity))
    
    elif event.type == "player_kill":
        # Got a kill - quick victory pulse on front upper
        commands.append((Cell.FRONT_UPPER_LEFT, 4))
        commands.append((Cell.FRONT_UPPER_RIGHT, 4))
    
    elif event.type == "respawn":
        # Respawn - light full vest pulse
        for cell in ALL_CELLS:
            commands.append((cell, 3))
    
    return commands


# =============================================================================
# Console Log Watcher
# =============================================================================

class ConsoleLogWatcher:
    """
    Watches Half-Life 2: Deathmatch console.log for game events.
    
    The game must be launched with -condebug to enable console logging.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[HL2DMEvent], None],
        player_name: Optional[str] = None,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
    ):
        self.log_path = log_path
        self.on_event = on_event
        self.player_name = player_name
        self.poll_interval = poll_interval
        
        self._running = False
        self._last_position = 0
        self._thread: Optional[Thread] = None
    
    def start(self) -> Tuple[bool, Optional[str]]:
        """Start watching the console log."""
        if self._running:
            return False, "Already watching"
        
        if not self.log_path.exists():
            return False, f"Console log not found: {self.log_path}"
        
        self._running = True
        self._last_position = self.log_path.stat().st_size  # Start from end
        
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Started watching HL2:DM console.log: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the console log."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching HL2:DM console.log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading HL2:DM console log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the console log."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (game restart)
        if current_size < self._last_position:
            logger.info("HL2:DM console log truncated, resetting position")
            self._last_position = 0
        
        if current_size == self._last_position:
            return
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._last_position)
                new_content = f.read()
                self._last_position = f.tell()
            
            for line in new_content.splitlines():
                line = line.strip()
                if not line:
                    continue
                
                event = parse_console_line(line, self.player_name)
                if event:
                    logger.info(f"[HL2:DM] {event.type}: {event.params}")
                    self.on_event(event)
        
        except IOError as e:
            # File may be locked by game
            logger.debug(f"IOError reading HL2:DM console log (game may have lock): {e}")


# =============================================================================
# HL2DM Manager (Daemon Integration)
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class HL2DMManager:
    """
    Manages Half-Life 2: Deathmatch integration within the daemon.
    
    This class:
    1. Watches console.log for game events
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
        Path("C:/Program Files (x86)/Steam/steamapps/common/Half-Life 2 Deathmatch/hl2mp/console.log"),
        # Linux (native)
        Path.home() / ".steam/steam/steamapps/common/Half-Life 2 Deathmatch/hl2mp/console.log",
        # Linux (alternate)
        Path.home() / ".local/share/Steam/steamapps/common/Half-Life 2 Deathmatch/hl2mp/console.log",
        # macOS
        Path.home() / "Library/Application Support/Steam/steamapps/common/Half-Life 2 Deathmatch/hl2mp/console.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._player_name: Optional[str] = None
        self._watcher: Optional[ConsoleLogWatcher] = None
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
    def player_name(self) -> Optional[str]:
        return self._player_name
    
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
    
    def start(self, log_path: Optional[str] = None, player_name: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Start watching for HL2:DM events.
        
        Args:
            log_path: Path to console.log, or None for auto-detect
            player_name: Optional player name to filter events (only your haptics)
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "HL2:DM integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, "Could not find console.log. Ensure Half-Life 2: Deathmatch is installed and launched with -condebug"
        
        self._player_name = player_name
        
        # Create watcher
        self._watcher = ConsoleLogWatcher(
            log_path=self._log_path,
            on_event=self._on_hl2dm_event,
            player_name=self._player_name,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        
        logger.info(f"HL2:DM integration started, watching: {self._log_path}")
        if self._player_name:
            logger.info(f"Filtering events for player: {self._player_name}")
        
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for HL2:DM events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("HL2:DM integration stopped")
        return True
    
    def _on_hl2dm_event(self, event: HL2DMEvent):
        """Handle a parsed HL2:DM event."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"HL2:DM event: {event.type} - {event.params}")
        
        # Map event to haptic commands
        haptic_commands = map_event_to_haptics(event)
        
        # Trigger haptics
        if self.on_trigger:
            for cell, speed in haptic_commands:
                self.on_trigger(cell, speed)
        
        # Broadcast event to clients
        if self.on_game_event:
            self.on_game_event(event.type, event.params)
