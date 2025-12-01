"""
Left 4 Dead 2 Integration Manager for the vest daemon.

This module provides console.log file watching to receive game events from
Left 4 Dead 2. The game writes events to console.log when launched with
-condebug flag.

When L4D2 game events are detected, they are passed to callbacks which the
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
    LOWER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Parser
# =============================================================================

@dataclass
class L4D2Event:
    """Parsed event from Left 4 Dead 2 console.log."""
    type: str  # "player_damage", "player_death", "weapon_fire", "health_pickup", etc.
    raw: str
    params: dict
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Source engine console.log format: L MM/DD/YYYY - HH:MM:SS: message
# We'll parse common L4D2 events from console output

# Player damage pattern (varies by language, but common patterns)
# Examples:
# - "PlayerName" took 25 damage from "Attacker"
# - "PlayerName" was hurt by "Attacker" for 25 damage
# - Damage: 25 (from player_debug_print_damage)
# - Player took 25 damage
DAMAGE_PATTERN = re.compile(
    r'(?:"(?P<victim>[^"]+)"\s+(?:took|was hurt by|received)\s+(?P<damage>\d+)\s+damage(?:\s+from\s+"(?P<attacker>[^"]+)")?|Damage:\s*(?P<damage2>\d+)|Player\s+took\s+(?P<damage3>\d+)\s+damage)',
    re.IGNORECASE
)

# Player death pattern
# Examples:
# - "PlayerName" killed by "Attacker"
# - "PlayerName" died
DEATH_PATTERN = re.compile(
    r'"(?P<victim>[^"]+)"\s+(?:killed by|died|was killed by)\s+"?(?P<attacker>[^"]*)"?',
    re.IGNORECASE
)

# Weapon fire pattern (less reliable, varies)
# Examples:
# - Player fired weapon: shotgun
# - Weapon fired: assault_rifle
WEAPON_FIRE_PATTERN = re.compile(
    r'(?:weapon|player).*?fired.*?:(?P<weapon>\w+)',
    re.IGNORECASE
)

# Health pickup pattern
# Examples:
# - "PlayerName" picked up: medkit
# - Health restored: +25
HEALTH_PICKUP_PATTERN = re.compile(
    r'"(?P<player>[^"]+)"\s+picked up.*?(?:medkit|health|first aid)',
    re.IGNORECASE
)

# Ammo pickup pattern
AMMO_PICKUP_PATTERN = re.compile(
    r'"(?P<player>[^"]+)"\s+picked up.*?ammo',
    re.IGNORECASE
)

# Infected spawn pattern (Tank, Witch, etc.)
INFECTED_SPAWN_PATTERN = re.compile(
    r'(?:spawned|spawn).*?(?P<infected>tank|witch|hunter|smoker|boomer|spitter|charger|jockey)',
    re.IGNORECASE
)

# Attack pattern (from console.log - appears when players attack)
# Format: "PlayerName attacked TargetName"
ATTACK_PATTERN = re.compile(
    r'"(?P<attacker>[^"]+)"\s+attacked\s+"?(?P<target>[^"]+)"?',
    re.IGNORECASE
)

# Phase 2: Structured mod output pattern
# Format: [L4D2Haptics] {EventType|param1|param2|...}
HAPTICS_MOD_PATTERN = re.compile(
    r'\[L4D2Haptics\]\s*\{([^|]+)\|([^}]*)\}',
    re.IGNORECASE
)


def parse_console_line(line: str, player_name: Optional[str] = None) -> Optional[L4D2Event]:
    """
    Parse a console log line for L4D2 events.
    
    Supports both Phase 1 (vanilla console output) and Phase 2 (structured mod output).
    
    Args:
        line: Log line to parse
        player_name: Optional player name to identify player events
        
    Returns:
        L4D2Event if valid, None otherwise
    """
    # Remove timestamp prefix if present
    # Format: L MM/DD/YYYY - HH:MM:SS: message
    if line.startswith("L "):
        # Find the colon after timestamp
        colon_idx = line.find(":", 2)
        if colon_idx > 0:
            line = line[colon_idx + 1:].strip()
    
    line_lower = line.lower()
    
    # Phase 2: Check for structured mod output first (most reliable)
    # Format: [L4D2Haptics] {EventType|param1|param2|...}
    match = HAPTICS_MOD_PATTERN.search(line)
    if match:
        event_type = match.group(1).strip()
        params_str = match.group(2).strip()
        
        # Parse parameters (pipe-separated)
        params_list = [p.strip() for p in params_str.split("|")] if params_str else []
        
        # Map event types to our internal format
        if event_type == "PlayerHurt":
            # Format: {PlayerHurt|victim|damage|angle|damage_type|attacker}
            if len(params_list) >= 5:
                try:
                    victim = params_list[0]
                    damage = int(params_list[1])
                    angle = int(params_list[2]) if params_list[2] else 0
                    damage_type = params_list[3]
                    attacker = params_list[4]
                    
                    # Filter by player name if provided
                    if player_name and victim.lower() != player_name.lower():
                        return None
                    
                    return L4D2Event(
                        type="player_damage",
                        raw=line,
                        params={
                            "victim": victim,
                            "damage": damage,
                            "attacker": attacker,
                            "angle": angle,
                            "damage_type": damage_type,
                        }
                    )
                except (ValueError, IndexError):
                    pass
        
        elif event_type == "PlayerDeath":
            # Format: {PlayerDeath|killer|weapon|victim}
            if len(params_list) >= 3:
                killer = params_list[0]
                weapon = params_list[1]
                victim = params_list[2]
                
                # Only trigger for the player
                if not player_name or victim.lower() == player_name.lower():
                    return L4D2Event(
                        type="player_death",
                        raw=line,
                        params={
                            "victim": victim,
                            "attacker": killer,
                            "weapon": weapon,
                        }
                    )
        
        elif event_type == "PlayerIncap":
            # Format: {PlayerIncap|victim|attacker} - player downed
            if len(params_list) >= 2:
                victim = params_list[0]
                attacker = params_list[1]
                
                # Only trigger for the player
                if not player_name or victim.lower() == player_name.lower():
                    return L4D2Event(
                        type="player_incap",
                        raw=line,
                        params={
                            "victim": victim,
                            "attacker": attacker,
                        }
                    )
        
        elif event_type == "WeaponFire":
            # Format: {WeaponFire|weapon|player}
            if len(params_list) >= 2:
                weapon = params_list[0]
                player = params_list[1]
                
                if not player_name or player.lower() == player_name.lower():
                    return L4D2Event(
                        type="weapon_fire",
                        raw=line,
                        params={
                            "weapon": weapon,
                            "player": player,
                        }
                    )
        
        elif event_type == "HealthPickup":
            # Format: {HealthPickup|player|item}
            # We ignore health pickups for haptics (user preference)
            pass
        
        elif event_type == "AdrenalineUsed":
            # Format: {AdrenalineUsed|player}
            if len(params_list) >= 1:
                player = params_list[0]
                
                if not player_name or player.lower() == player_name.lower():
                    return L4D2Event(
                        type="adrenaline_used",
                        raw=line,
                        params={
                            "player": player,
                        }
                    )
        
        elif event_type == "AmmoPickup":
            # Format: {AmmoPickup|player}
            if len(params_list) >= 1:
                player = params_list[0]
                
                if not player_name or player.lower() == player_name.lower():
                    return L4D2Event(
                        type="ammo_pickup",
                        raw=line,
                        params={
                            "player": player,
                        }
                    )
        
        elif event_type == "InfectedHit":
            # Format: {InfectedHit|infected|damage|attacker}
            if len(params_list) >= 3:
                try:
                    infected = params_list[0]
                    damage = int(params_list[1])
                    attacker = params_list[2]
                    
                    if not player_name or attacker.lower() == player_name.lower():
                        return L4D2Event(
                            type="infected_hit",
                            raw=line,
                            params={
                                "infected": infected,
                                "damage": damage,
                                "attacker": attacker,
                            }
                        )
                except (ValueError, IndexError):
                    pass
        
        elif event_type == "PlayerHealed":
            # Format: {PlayerHealed|amount|player}
            if len(params_list) >= 2:
                try:
                    amount = int(params_list[0])
                    player = params_list[1]
                    
                    if not player_name or player.lower() == player_name.lower():
                        return L4D2Event(
                            type="player_healed",
                            raw=line,
                            params={
                                "amount": amount,
                                "player": player,
                            }
                        )
                except (ValueError, IndexError):
                    pass
        
        # Unknown mod event type, but it's from our mod so log it
        logger.debug(f"Unknown L4D2Haptics event type: {event_type}")
        return None
    
    # Check for player death
    match = DEATH_PATTERN.search(line)
    if match:
        victim = match.group("victim")
        attacker = match.group("attacker") or "unknown"
        
        # Determine event type
        if player_name and victim.lower() == player_name.lower():
            event_type = "player_death"
        elif player_name and attacker.lower() == player_name.lower():
            event_type = "player_kill"
        else:
            event_type = "teammate_death"
        
        return L4D2Event(
            type=event_type,
            raw=line,
            params={
                "victim": victim,
                "attacker": attacker,
            }
        )
    
    # Check for player damage
    match = DAMAGE_PATTERN.search(line)
    if match:
        # Try different capture groups (damage, damage2, damage3)
        damage = None
        if match.group("damage"):
            damage = int(match.group("damage"))
        elif match.group("damage2"):
            damage = int(match.group("damage2"))
        elif match.group("damage3"):
            damage = int(match.group("damage3"))
        
        if damage is None:
            return None
        
        victim = match.group("victim") or (player_name if player_name else "Player")
        attacker = match.group("attacker") or "unknown"
        
        # If no player_name filter or matches player
        if not player_name or (victim and victim.lower() == player_name.lower()):
            return L4D2Event(
                type="player_damage",
                raw=line,
                params={
                    "victim": victim,
                    "damage": damage,
                    "attacker": attacker,
                }
            )
    
    # Check for weapon fire
    match = WEAPON_FIRE_PATTERN.search(line)
    if match:
        weapon = match.group("weapon")
        return L4D2Event(
            type="weapon_fire",
            raw=line,
            params={
                "weapon": weapon,
            }
        )
    
    # Check for health pickup
    match = HEALTH_PICKUP_PATTERN.search(line)
    if match:
        player = match.group("player")
        if not player_name or player.lower() == player_name.lower():
            return L4D2Event(
                type="health_pickup",
                raw=line,
                params={
                    "player": player,
                }
            )
    
    # Check for ammo pickup
    match = AMMO_PICKUP_PATTERN.search(line)
    if match:
        player = match.group("player")
        if not player_name or player.lower() == player_name.lower():
            return L4D2Event(
                type="ammo_pickup",
                raw=line,
                params={
                    "player": player,
                }
            )
    
    # Check for infected spawn
    match = INFECTED_SPAWN_PATTERN.search(line)
    if match:
        infected = match.group("infected").lower()
        return L4D2Event(
            type="infected_spawn",
            raw=line,
            params={
                "infected": infected,
            }
        )
    
    # Check for attack events (from console.log)
    match = ATTACK_PATTERN.search(line)
    if match:
        attacker = match.group("attacker")
        target = match.group("target")
        
        # If player is the attacker, it's a player attack event
        if player_name and attacker.lower() == player_name.lower():
            return L4D2Event(
                type="player_attack",
                raw=line,
                params={
                    "attacker": attacker,
                    "target": target,
                }
            )
        # If player is the target, it's damage received (friendly fire or infected attack)
        elif player_name and target.lower() == player_name.lower():
            return L4D2Event(
                type="player_damage",
                raw=line,
                params={
                    "victim": target,
                    "attacker": attacker,
                    "damage": 1,  # Unknown damage amount
                }
            )
    
    return None


# =============================================================================
# Event-to-Haptic Mapping
# =============================================================================

def map_event_to_haptics(event: L4D2Event) -> List[Tuple[int, int]]:
    """
    Map L4D2 event to haptic commands (cell, speed).
    
    Args:
        event: Parsed L4D2 event
        
    Returns:
        List of (cell, speed) tuples
    """
    commands: List[Tuple[int, int]] = []
    
    if event.type == "player_death":
        # Full vest pulse (all cells, max intensity) - player died
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event.type == "player_incap":
        # Strong pulse (all cells) - player downed
        for cell in ALL_CELLS:
            commands.append((cell, 8))
    
    elif event.type == "player_damage":
        # Scale intensity by damage amount
        damage = event.params.get("damage", 0)
        
        # Skip 0 damage events (collisions, etc.)
        if damage <= 0:
            return commands
        
        intensity = min(10, max(1, damage // 10))  # 1-10 based on damage
        
        # Use directional data if available
        angle = event.params.get("angle")
        if angle is not None:
            # Map angle to directional cells
            # 0° = front, 90° = right, 180° = back, 270° = left
            angle = angle % 360
            
            if angle <= 45 or angle >= 315:
                # Front (0-45°, 315-360°)
                cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
            elif 45 < angle <= 135:
                # Right (45-135°)
                cells = [Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT]
            elif 135 < angle <= 225:
                # Back (135-225°)
                cells = [Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT]
            else:  # 225 < angle < 315
                # Left (225-315°)
                cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT]
            
            for cell in cells:
                commands.append((cell, intensity))
        else:
            # No directional data, use front cells
            for cell in FRONT_CELLS:
                commands.append((cell, intensity))
    
    elif event.type == "adrenaline_used":
        # Adrenaline injection - quick pulse on all cells
        for cell in ALL_CELLS:
            commands.append((cell, 6))
    
    # All other events (weapon_fire, health_pickup, ammo_pickup, etc.) are ignored
    
    return commands


# =============================================================================
# Console Log Watcher
# =============================================================================

class ConsoleLogWatcher:
    """
    Watches Left 4 Dead 2 console.log for game events.
    
    The game must be launched with -condebug to enable console logging.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[L4D2Event], None],
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
    
    def start(self) -> tuple[bool, Optional[str]]:
        """Start watching the console log."""
        if self._running:
            return False, "Already watching"
        
        if not self.log_path.exists():
            return False, f"Console log not found: {self.log_path}"
        
        self._running = True
        self._last_position = self.log_path.stat().st_size  # Start from end
        
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Started watching L4D2 console.log: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the console log."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching L4D2 console.log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading L4D2 console log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the console log."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (game restart)
        if current_size < self._last_position:
            logger.info("L4D2 console log truncated, resetting position")
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
                if line:
                    logger.info(f"[L4D2 LOG] {line}")
                event = parse_console_line(line, self.player_name)
                if event:
                    logger.info(f"[L4D2 PARSED] {event.type}: {event.params}")
                    self.on_event(event)
        
        except IOError as e:
            # File may be locked by game
            logger.debug(f"IOError reading L4D2 console log (game may have lock): {e}")


# =============================================================================
# L4D2 Manager (Daemon Integration)
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class L4D2Manager:
    """
    Manages Left 4 Dead 2 integration within the daemon.
    
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
        Path("C:/Program Files (x86)/Steam/steamapps/common/Left 4 Dead 2/left4dead2/console.log"),
        # Linux (Proton)
        Path.home() / ".steam/steam/steamapps/common/Left 4 Dead 2/left4dead2/console.log",
        # macOS
        Path.home() / "Library/Application Support/Steam/steamapps/common/Left 4 Dead 2/left4dead2/console.log",
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
    
    def start(self, log_path: Optional[str] = None, player_name: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Start watching for L4D2 events.
        
        Args:
            log_path: Path to console.log, or None for auto-detect
            player_name: Optional player name to filter events
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "L4D2 integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, "Could not find console.log. Ensure Left 4 Dead 2 is installed and launched with -condebug"
        
        self._player_name = player_name
        
        # Create watcher
        self._watcher = ConsoleLogWatcher(
            log_path=self._log_path,
            on_event=self._on_l4d2_event,
            player_name=self._player_name,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        
        logger.info(f"L4D2 integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for L4D2 events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("L4D2 integration stopped")
        return True
    
    def _on_l4d2_event(self, event: L4D2Event):
        """Handle a parsed L4D2 event."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        
        logger.debug(f"L4D2 event: {event.type} - {event.params}")
        
        # Map event to haptic commands
        haptic_commands = map_event_to_haptics(event)
        
        # Trigger haptics
        if self.on_trigger:
            for cell, speed in haptic_commands:
                self.on_trigger(cell, speed)
        
        # Broadcast event to clients
        if self.on_game_event:
            self.on_game_event(event.type, event.params)

