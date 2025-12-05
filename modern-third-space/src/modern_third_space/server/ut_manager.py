"""
Unreal Tournament Integration Manager for the vest daemon.

This module provides game log file watching to receive game events from
Unreal Tournament games. The game events are emitted via a ThirdSpaceVest
mutator or parsed from native game logs.

Supports:
- Unreal Tournament (2014/Alpha) - UE4
- Unreal Tournament 3 - UE3
- Unreal Tournament 2004 - UE2.5
- Unreal Tournament 99 - UE1

When UT game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients
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
class UTEvent:
    """Parsed event from Unreal Tournament game log."""
    type: str
    raw: str
    params: Dict[str, Any]
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Event format: [ThirdSpace] {EventType|param1|param2|...}
THIRDSPACE_PATTERN = re.compile(r'\[ThirdSpace\]\s*\{([^}]+)\}')

# Native UT log patterns (for parsing without mutator)
NATIVE_DAMAGE_PATTERN = re.compile(r'(\w+)\s+took\s+(\d+)\s+damage\s+from\s+(\w+)')
NATIVE_KILL_PATTERN = re.compile(r'(\w+)\s+was\s+killed\s+by\s+(\w+)')
NATIVE_FIRE_PATTERN = re.compile(r'(\w+)\s+fired\s+(\w+)')


def parse_thirdspace_line(line: str) -> Optional[UTEvent]:
    """
    Parse a [ThirdSpace] {...} line from game log.
    
    Returns UTEvent if valid, None otherwise.
    """
    match = THIRDSPACE_PATTERN.search(line)
    if not match:
        return None
    
    content = match.group(1)
    parts = content.split('|')
    
    if not parts:
        return None
    
    event_type = parts[0]
    params: Dict[str, Any] = {}
    
    # Parse parameters based on event type
    if event_type == "PlayerDamage" and len(parts) >= 6:
        params = {
            "health": _safe_int(parts[1], 100),
            "damage": _safe_int(parts[2], 0),
            "attacker": parts[3] if len(parts) > 3 else "",
            "direction": _safe_float(parts[4], 0.0) if len(parts) > 4 else 0.0,
            "weapon": parts[5] if len(parts) > 5 else "",
        }
    elif event_type == "PlayerDeath" and len(parts) >= 4:
        params = {
            "killer": parts[1] if len(parts) > 1 else "",
            "weapon": parts[2] if len(parts) > 2 else "",
            "headshot": parts[3].lower() == "true" if len(parts) > 3 else False,
        }
    elif event_type == "WeaponFire" and len(parts) >= 3:
        params = {
            "weapon": parts[1] if len(parts) > 1 else "",
            "hand": parts[2] if len(parts) > 2 else "right",
        }
    elif event_type == "Dodge" and len(parts) >= 2:
        params = {
            "direction": parts[1] if len(parts) > 1 else "forward",
        }
    elif event_type == "FlagGrab" and len(parts) >= 2:
        params = {
            "team": parts[1] if len(parts) > 1 else "",
        }
    elif event_type == "FlagCapture" and len(parts) >= 2:
        params = {
            "team": parts[1] if len(parts) > 1 else "",
        }
    elif event_type == "FlagReturn":
        params = {}
    elif event_type == "JumpBoots":
        params = {}
    elif event_type == "ShieldBelt":
        params = {}
    elif event_type == "HealthPack" and len(parts) >= 2:
        params = {
            "amount": _safe_int(parts[1], 25),
        }
    elif event_type == "ArmorPickup" and len(parts) >= 2:
        params = {
            "type": parts[1] if len(parts) > 1 else "default",
        }
    elif event_type == "KillingSpree" and len(parts) >= 2:
        params = {
            "count": _safe_int(parts[1], 3),
        }
    elif event_type == "MultiKill" and len(parts) >= 2:
        params = {
            "count": _safe_int(parts[1], 2),
        }
    elif event_type == "Headshot":
        params = {}
    elif event_type == "Translocator":
        params = {}
    elif event_type == "ImpactHammer":
        params = {}
    
    return UTEvent(type=event_type, raw=content, params=params)


def parse_native_line(line: str) -> Optional[UTEvent]:
    """
    Parse native UT log lines (without mutator).
    
    These are less detailed but work without installing a mod.
    """
    # Try damage pattern
    match = NATIVE_DAMAGE_PATTERN.search(line)
    if match:
        return UTEvent(
            type="PlayerDamage",
            raw=line,
            params={
                "health": 100,  # Unknown from native logs
                "damage": int(match.group(2)),
                "attacker": match.group(3),
                "direction": 0.0,  # Unknown
                "weapon": "",
            }
        )
    
    # Try kill pattern
    match = NATIVE_KILL_PATTERN.search(line)
    if match:
        return UTEvent(
            type="PlayerDeath",
            raw=line,
            params={
                "killer": match.group(2),
                "weapon": "",
                "headshot": False,
            }
        )
    
    # Try fire pattern
    match = NATIVE_FIRE_PATTERN.search(line)
    if match:
        return UTEvent(
            type="WeaponFire",
            raw=line,
            params={
                "weapon": match.group(2),
                "hand": "right",
            }
        )
    
    return None


def _safe_int(s: str, default: int = 0) -> int:
    """Safely parse an integer."""
    try:
        return int(s)
    except (ValueError, TypeError):
        return default


def _safe_float(s: str, default: float = 0.0) -> float:
    """Safely parse a float."""
    try:
        return float(s)
    except (ValueError, TypeError):
        return default


# =============================================================================
# Haptic Mapper
# =============================================================================

# Weapon recoil mapping (weapon_name -> (speed, cells))
WEAPON_EFFECTS: Dict[str, tuple] = {
    # Pistols
    "enforcer": (4, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    "pistol": (4, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    
    # Rifles/SMGs
    "minigun": (4, FRONT_CELLS),  # Rapid fire
    "linkgun": (3, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    "stinger": (3, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    
    # Shotguns
    "flakcannon": (7, FRONT_CELLS),
    "flak": (7, FRONT_CELLS),
    
    # Precision
    "shockrifle": (5, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    "shock": (5, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    "sniperrifle": (6, UPPER_CELLS),
    "sniper": (6, UPPER_CELLS),
    "lightninggun": (5, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    
    # Explosives
    "rocketlauncher": (8, FRONT_CELLS),
    "rocket": (8, FRONT_CELLS),
    "redeemer": (10, ALL_CELLS),
    
    # Bio/special
    "biorifle": (3, FRONT_CELLS),
    "bio": (3, FRONT_CELLS),
    
    # Melee
    "impacthammer": (8, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    "hammer": (8, [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]),
    "translocator": (2, [Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT]),
}


def angle_to_cells(angle: float) -> List[int]:
    """
    Convert damage angle (0-360°) to vest cells.
    
    Angle reference:
    - 0° = Front
    - 90° = Right
    - 180° = Back
    - 270° = Left
    
    Uses correct hardware cell layout from cell_layout module:
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    # Normalize angle to 0-360
    while angle < 0:
        angle += 360
    while angle >= 360:
        angle -= 360
    
    if angle < 45 or angle >= 315:
        # Front
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    elif 45 <= angle < 135:
        # Right side
        return RIGHT_SIDE
    elif 135 <= angle < 225:
        # Back
        return BACK_CELLS
    else:  # 225 <= angle < 315
        # Left side
        return LEFT_SIDE


def damage_to_intensity(damage: int) -> int:
    """
    Calculate haptic intensity (speed 1-10) based on damage amount.
    
    UT typical damage ranges:
    - Enforcer: 25-35
    - Flak: 70-100+
    - Shock Combo: 150+
    - Redeemer: 1000+
    """
    if damage <= 0:
        return 0
    if damage < 25:
        return max(3, damage // 8)
    if damage < 50:
        return 5 + (damage - 25) // 12
    if damage < 100:
        return 7 + (damage - 50) // 25
    return 10  # Heavy damage


def map_event_to_haptics(event: UTEvent) -> List[tuple]:
    """
    Map a UT event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    if event.type == "PlayerDamage":
        direction = event.params.get("direction", 0.0)
        damage = event.params.get("damage", 0)
        cells = angle_to_cells(direction)
        speed = damage_to_intensity(damage)
        
        if speed > 0:
            for cell in cells:
                commands.append((cell, speed))
    
    elif event.type == "PlayerDeath":
        # Full vest maximum intensity pulse
        headshot = event.params.get("headshot", False)
        speed = 10 if headshot else 10
        for cell in ALL_CELLS:
            commands.append((cell, speed))
    
    elif event.type == "WeaponFire":
        weapon = event.params.get("weapon", "").lower()
        # Find matching weapon effect
        effect = None
        for weapon_key, weapon_effect in WEAPON_EFFECTS.items():
            if weapon_key in weapon:
                effect = weapon_effect
                break
        
        if effect:
            speed, cells = effect
            for cell in cells:
                commands.append((cell, speed))
        else:
            # Default weapon recoil
            commands.append((Cell.FRONT_UPPER_LEFT, 4))
            commands.append((Cell.FRONT_UPPER_RIGHT, 4))
    
    elif event.type == "Dodge":
        direction = event.params.get("direction", "forward").lower()
        speed = 4
        if direction in ("left", "l"):
            for cell in LEFT_SIDE:
                commands.append((cell, speed))
        elif direction in ("right", "r"):
            for cell in RIGHT_SIDE:
                commands.append((cell, speed))
        elif direction in ("back", "backward"):
            for cell in BACK_CELLS:
                commands.append((cell, speed))
        else:  # Forward
            for cell in FRONT_CELLS:
                commands.append((cell, speed))
    
    elif event.type == "JumpBoots":
        # Lower cells pulse (feet/legs effect)
        for cell in LOWER_CELLS:
            commands.append((cell, 5))
    
    elif event.type == "ShieldBelt":
        # Gentle full vest pulse
        for cell in ALL_CELLS:
            commands.append((cell, 3))
    
    elif event.type == "FlagGrab":
        # Quick all-cell pulse
        for cell in ALL_CELLS:
            commands.append((cell, 4))
    
    elif event.type == "FlagCapture":
        # Celebratory medium pulse
        for cell in ALL_CELLS:
            commands.append((cell, 6))
    
    elif event.type == "FlagReturn":
        # Front cells pulse
        for cell in FRONT_CELLS:
            commands.append((cell, 3))
    
    elif event.type == "KillingSpree":
        count = event.params.get("count", 3)
        speed = min(10, 4 + count)
        commands.append((Cell.FRONT_UPPER_LEFT, speed))
        commands.append((Cell.FRONT_UPPER_RIGHT, speed))
    
    elif event.type == "MultiKill":
        count = event.params.get("count", 2)
        speed = min(10, 4 + count * 2)
        for cell in UPPER_CELLS:
            commands.append((cell, speed))
    
    elif event.type == "Headshot":
        # Strong upper cells pulse
        for cell in UPPER_CELLS:
            commands.append((cell, 8))
    
    elif event.type == "Translocator":
        # Quick lower cells tap
        commands.append((Cell.FRONT_LOWER_LEFT, 2))
        commands.append((Cell.FRONT_LOWER_RIGHT, 2))
    
    elif event.type == "ImpactHammer":
        # Strong front upper punch
        commands.append((Cell.FRONT_UPPER_LEFT, 8))
        commands.append((Cell.FRONT_UPPER_RIGHT, 8))
    
    elif event.type == "HealthPack":
        # Gentle front pulse
        for cell in FRONT_CELLS:
            commands.append((cell, 2))
    
    elif event.type == "ArmorPickup":
        armor_type = event.params.get("type", "").lower()
        if "shield" in armor_type or "super" in armor_type:
            for cell in ALL_CELLS:
                commands.append((cell, 3))
        else:
            for cell in FRONT_CELLS:
                commands.append((cell, 2))
    
    return commands


# =============================================================================
# Game Log Watcher
# =============================================================================

class UTLogWatcher:
    """
    Watches Unreal Tournament game log for [ThirdSpace] events.
    
    Also supports parsing native UT log lines as a fallback.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[UTEvent], None],
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        parse_native: bool = True,
    ):
        self.log_path = log_path
        self.on_event = on_event
        self.poll_interval = poll_interval
        self.parse_native = parse_native
        
        self._running = False
        self._last_position = 0
        self._thread: Optional[Thread] = None
    
    def start(self) -> tuple:
        """Start watching the game log."""
        if self._running:
            return False, "Already watching"
        
        if not self.log_path.exists():
            # Try to create parent directory if it doesn't exist
            # (game might not have been run yet)
            if not self.log_path.parent.exists():
                return False, f"Game log directory not found: {self.log_path.parent}"
            # Create an empty log file so we can watch it
            try:
                self.log_path.touch()
            except IOError:
                pass  # Might fail, that's okay
        
        self._running = True
        self._last_position = self.log_path.stat().st_size if self.log_path.exists() else 0
        
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Started watching UT log: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the game log."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching UT game log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading UT game log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the game log."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (game restart)
        if current_size < self._last_position:
            logger.info("UT game log truncated, resetting position")
            self._last_position = 0
        
        if current_size == self._last_position:
            return
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._last_position)
                new_content = f.read()
                self._last_position = f.tell()
            
            for line in new_content.splitlines():
                event = None
                
                # Try parsing [ThirdSpace] events first
                if "[ThirdSpace]" in line:
                    event = parse_thirdspace_line(line)
                # Fall back to native parsing if enabled
                elif self.parse_native:
                    event = parse_native_line(line)
                
                if event:
                    self.on_event(event)
        
        except IOError as e:
            # File may be locked by game
            logger.debug(f"IOError reading UT log (game may have lock): {e}")


# =============================================================================
# UT Manager (Daemon Integration)
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class UTManager:
    """
    Manages Unreal Tournament integration within the daemon.
    
    This class:
    1. Watches game log for [ThirdSpace] events or native logs
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    # Default paths for UT game logs (in priority order)
    DEFAULT_LOG_PATHS = [
        # UT Alpha (2014) - Windows
        Path(os.environ.get("LOCALAPPDATA", "")) / "UnrealTournament/Saved/Logs/UnrealTournament.log",
        # UT3 - Windows
        Path.home() / "Documents/My Games/Unreal Tournament 3/UTGame/Logs/UTGame.log",
        # UT2004 - Common locations
        Path("C:/UT2004/Logs/UT2004.log"),
        Path("C:/Games/UT2004/Logs/UT2004.log"),
        Path("C:/Program Files (x86)/UT2004/Logs/UT2004.log"),
        # UT99 - Common locations
        Path("C:/UnrealTournament/Logs/UnrealTournament.log"),
        Path("C:/Games/UnrealTournament/Logs/UnrealTournament.log"),
        # Linux paths (Steam/Proton)
        Path.home() / ".local/share/UnrealTournament/Saved/Logs/UnrealTournament.log",
        Path.home() / ".steam/steam/steamapps/common/Unreal Tournament 2004/Logs/UT2004.log",
        Path.home() / ".steam/steam/steamapps/common/Unreal Tournament GOTY/Logs/UnrealTournament.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[UTLogWatcher] = None
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
        """Try to auto-detect the game log path."""
        for path in self.DEFAULT_LOG_PATHS:
            if path.exists():
                logger.info(f"Auto-detected UT log: {path}")
                return path
        
        # Also check parent directories exist (game installed but no log yet)
        for path in self.DEFAULT_LOG_PATHS:
            if path.parent.exists():
                logger.info(f"Found UT log directory (game not run yet): {path.parent}")
                return path
        
        return None
    
    def start(self, log_path: Optional[str] = None) -> tuple:
        """
        Start watching for UT events.
        
        Args:
            log_path: Path to game log, or None for auto-detect
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "UT integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, "Could not find Unreal Tournament game log. Ensure the game is installed."
        
        # Create watcher
        self._watcher = UTLogWatcher(
            log_path=self._log_path,
            on_event=self._on_ut_event,
            parse_native=True,  # Enable native log parsing as fallback
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        
        logger.info(f"UT integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for UT events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("UT integration stopped")
        return True
    
    def _on_ut_event(self, event: UTEvent):
        """Called when a UT event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"UT event: {event.type} - {event.params}")
        
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
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._running,
            "log_path": str(self._log_path) if self._log_path else None,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
            "last_event_type": self._last_event_type,
        }


# =============================================================================
# Mod/Mutator Info
# =============================================================================

def get_mod_info() -> dict:
    """Get information about the optional ThirdSpaceVest mutator."""
    return {
        "name": "ThirdSpaceVest Mutator for Unreal Tournament",
        "description": "Optional mutator that provides enhanced haptic event data",
        "note": "The integration works without the mutator using native log parsing, but the mutator provides more detailed events.",
        "install_instructions": {
            "ut_alpha": [
                "1. Download the ThirdSpaceVest pak file",
                "2. Extract to: %LOCALAPPDATA%\\UnrealTournament\\Saved\\Paks\\",
                "3. Enable the mutator in game settings",
            ],
            "ut2004": [
                "1. Copy ThirdSpaceVest.u to UT2004\\System\\",
                "2. Add 'ServerPackages=ThirdSpaceVest' to UT2004.ini",
                "3. Enable the mutator when starting a match",
            ],
            "ut99": [
                "1. Copy ThirdSpaceVest.u to UnrealTournament\\System\\",
                "2. Enable the mutator when starting a match",
            ],
        },
        "supported_games": [
            "Unreal Tournament (2014 Alpha)",
            "Unreal Tournament 3",
            "Unreal Tournament 2004",
            "Unreal Tournament 99 GOTY",
        ],
    }
