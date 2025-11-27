"""
Half-Life: Alyx Integration Manager for the vest daemon.

This module provides console.log file watching to receive game events from
Half-Life: Alyx. The game events are emitted via Lua scripts (tactsuit.lua)
that write to the console log when launched with -condebug.

Original Lua scripts by floh-bhaptics:
https://www.nexusmods.com/halflifealyx/mods/6

When Alyx game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients
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
from typing import Callable, Optional, List

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
# Event Parser (Phase 2)
# =============================================================================

@dataclass
class AlyxEvent:
    """Parsed event from Alyx console log."""
    type: str
    raw: str
    params: dict
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Event format: [Tactsuit] {EventType|param1|param2|...}
TACTSUIT_PATTERN = re.compile(r'\[Tactsuit\]\s*\{([^}]+)\}')


def parse_tactsuit_line(line: str) -> Optional[AlyxEvent]:
    """
    Parse a [Tactsuit] {...} line from console.log.
    
    Returns AlyxEvent if valid, None otherwise.
    """
    match = TACTSUIT_PATTERN.search(line)
    if not match:
        return None
    
    content = match.group(1)
    parts = content.split('|')
    
    if not parts:
        return None
    
    event_type = parts[0]
    params = {}
    
    # Parse parameters based on event type
    if event_type == "PlayerHurt" and len(parts) >= 6:
        params = {
            "health": int(parts[1]) if parts[1].isdigit() else 100,
            "enemy_class": parts[2],
            "angle": float(parts[3]) if parts[3].replace('.', '').isdigit() else 0.0,
            "enemy_name": parts[4],
            "enemy_debug_name": parts[5],
        }
    elif event_type == "PlayerShootWeapon" and len(parts) >= 2:
        params = {"weapon": parts[1]}
    elif event_type == "PlayerDeath" and len(parts) >= 2:
        params = {"damagebits": int(parts[1]) if parts[1].isdigit() else 0}
    elif event_type == "PlayerHealth" and len(parts) >= 2:
        params = {"health": int(parts[1]) if parts[1].isdigit() else 100}
    elif event_type == "PlayerHeal" and len(parts) >= 2:
        params = {"angle": float(parts[1]) if parts[1].replace('.', '').replace('-', '').isdigit() else 0.0}
    elif event_type in ("PlayerGrabbityPull", "PlayerGrabbityLockStart", "PlayerGrabbityLockStop",
                         "GrabbityGloveCatch") and len(parts) >= 2:
        params = {"is_primary_hand": parts[1].lower() == "true"}
    elif event_type in ("PlayerDropAmmoInBackpack", "PlayerDropResinInBackpack",
                         "PlayerRetrievedBackpackClip", "PlayerStoredItemInItemholder",
                         "PlayerRemovedItemFromItemholder", "PlayerUsingHealthstation") and len(parts) >= 2:
        params = {"left_side": parts[1] == "1"}
    elif event_type == "PrimaryHandChanged" and len(parts) >= 2:
        params = {"is_primary_left": parts[1].lower() == "true"}
    elif event_type == "ItemPickup" and len(parts) >= 3:
        params = {"item": parts[1], "left_shoulder": parts[2] == "1"}
    elif event_type == "ItemReleased" and len(parts) >= 3:
        params = {"item": parts[1], "left_hand_used": parts[2] == "1"}
    elif event_type == "PlayerShotgunUpgradeGrenadeLauncherState" and len(parts) >= 2:
        params = {"state": int(parts[1]) if parts[1].isdigit() else 0}
    # Events with no params
    elif event_type in ("PlayerGrabbedByBarnacle", "PlayerReleasedByBarnacle",
                         "PlayerCoughStart", "PlayerCoughEnd", "TwoHandStart", "TwoHandEnd",
                         "PlayerOpenedGameMenu", "PlayerClosedGameMenu", "Reset",
                         "PlayerPistolClipInserted", "PlayerPistolChamberedRound",
                         "PlayerShotgunShellLoaded", "PlayerShotgunLoadedShells"):
        params = {}
    
    return AlyxEvent(type=event_type, raw=content, params=params)


# =============================================================================
# Haptic Mapper (Phase 3)
# =============================================================================

def angle_to_cells(angle: float) -> List[int]:
    """
    Convert damage angle (0-360°) to vest cells.
    
    Angle reference (relative to player facing):
    - 0° = Front
    - 90° = Left  
    - 180° = Back
    - 270° = Right
    
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
    angle = angle % 360
    
    if angle < 45 or angle >= 315:
        # Front upper cells
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    elif 45 <= angle < 135:
        # Left side (from player perspective)
        return LEFT_SIDE
    elif 135 <= angle < 225:
        # Back
        return BACK_CELLS
    else:  # 225 <= angle < 315
        # Right side
        return RIGHT_SIDE


def map_event_to_haptics(event: AlyxEvent) -> List[tuple[int, int]]:
    """
    Map an Alyx event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    
    Uses correct hardware cell layout from cell_layout module.
    """
    commands = []
    
    if event.type == "PlayerHurt":
        angle = event.params.get("angle", 0.0)
        health = event.params.get("health", 100)
        cells = angle_to_cells(angle)
        
        # Intensity based on remaining health (lower health = already hurt = stronger effect)
        speed = 8 if health < 30 else (6 if health < 60 else 5)
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "PlayerDeath":
        # Full vest strong effect
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event.type == "PlayerShootWeapon":
        weapon = event.params.get("weapon", "")
        if "shotgun" in weapon.lower():
            speed = 7
        elif "rapidfire" in weapon.lower() or "smg" in weapon.lower():
            speed = 4
        else:
            speed = 5
        # Recoil on front upper cells
        commands.append((Cell.FRONT_UPPER_LEFT, speed))
        commands.append((Cell.FRONT_UPPER_RIGHT, speed))
    
    elif event.type == "PlayerHealth":
        health = event.params.get("health", 100)
        if health <= 30:
            # Heartbeat - subtle left side pulse
            commands.append((Cell.FRONT_UPPER_LEFT, 3))
            commands.append((Cell.FRONT_LOWER_LEFT, 3))
    
    elif event.type == "PlayerHeal":
        # Soothing wave on front
        for cell in FRONT_CELLS:
            commands.append((cell, 2))
    
    elif event.type == "PlayerGrabbityPull":
        # Light front upper pulse
        commands.append((Cell.FRONT_UPPER_LEFT, 3))
        commands.append((Cell.FRONT_UPPER_RIGHT, 3))
    
    elif event.type == "GrabbityGloveCatch":
        # Quick front upper tap
        commands.append((Cell.FRONT_UPPER_LEFT, 4))
        commands.append((Cell.FRONT_UPPER_RIGHT, 4))
    
    elif event.type == "PlayerGrabbedByBarnacle":
        # Strong pull-up effect on back upper cells
        commands.append((Cell.BACK_UPPER_LEFT, 8))
        commands.append((Cell.BACK_UPPER_RIGHT, 8))
    
    elif event.type == "PlayerCoughStart":
        # Chest pulses (front cells)
        for cell in FRONT_CELLS:
            commands.append((cell, 2))
    
    elif event.type == "TwoHandStart":
        # Subtle shoulder/upper feedback
        commands.append((Cell.FRONT_UPPER_LEFT, 2))
        commands.append((Cell.FRONT_UPPER_RIGHT, 2))
    
    elif event.type == "Reset":
        # Quick full-body pulse on spawn
        for cell in ALL_CELLS:
            commands.append((cell, 3))
    
    # Backpack interactions - back upper shoulder taps
    elif event.type in ("PlayerDropAmmoInBackpack", "PlayerDropResinInBackpack"):
        left = event.params.get("left_side", False)
        cell = Cell.BACK_UPPER_LEFT if left else Cell.BACK_UPPER_RIGHT
        commands.append((cell, 3))
    
    elif event.type in ("PlayerRetrievedBackpackClip",):
        left = event.params.get("left_side", False)
        cell = Cell.BACK_UPPER_LEFT if left else Cell.BACK_UPPER_RIGHT
        commands.append((cell, 4))
    
    return commands


# =============================================================================
# Console Log Watcher (Phase 1)
# =============================================================================

class ConsoleLogWatcher:
    """
    Watches Half-Life: Alyx console.log for [Tactsuit] events.
    
    The game must be launched with -condebug to enable console logging.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[AlyxEvent], None],
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
            return False, f"Console log not found: {self.log_path}"
        
        self._running = True
        self._last_position = self.log_path.stat().st_size  # Start from end
        
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Started watching: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the console log."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching console log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading console log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the console log."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (game restart)
        if current_size < self._last_position:
            logger.info("Console log truncated, resetting position")
            self._last_position = 0
        
        if current_size == self._last_position:
            return
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._last_position)
                new_content = f.read()
                self._last_position = f.tell()
            
            for line in new_content.splitlines():
                if "[Tactsuit]" in line:
                    event = parse_tactsuit_line(line)
                    if event:
                        self.on_event(event)
        
        except IOError as e:
            # File may be locked by game
            logger.debug(f"IOError reading log (game may have lock): {e}")


# =============================================================================
# Alyx Manager (Phase 4 - Daemon Integration)
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class AlyxManager:
    """
    Manages Half-Life: Alyx integration within the daemon.
    
    This class:
    1. Watches console.log for [Tactsuit] events
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
        Path("C:/Program Files (x86)/Steam/steamapps/common/Half-Life Alyx/game/hlvr/console.log"),
        # Linux (Proton)
        Path.home() / ".steam/steam/steamapps/common/Half-Life Alyx/game/hlvr/console.log",
        # macOS (unlikely but included)
        Path.home() / "Library/Application Support/Steam/steamapps/common/Half-Life Alyx/game/hlvr/console.log",
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
        """Try to auto-detect the console.log path."""
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
        Start watching for Alyx events.
        
        Args:
            log_path: Path to console.log, or None for auto-detect
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "Alyx integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, "Could not find console.log. Ensure Half-Life Alyx is installed and launched with -condebug"
        
        # Create watcher
        self._watcher = ConsoleLogWatcher(
            log_path=self._log_path,
            on_event=self._on_alyx_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        
        logger.info(f"Alyx integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for Alyx events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("Alyx integration stopped")
        return True
    
    def _on_alyx_event(self, event: AlyxEvent):
        """Called when an Alyx event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"Alyx event: {event.type} - {event.params}")
        
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
# Mod/Script Resources
# =============================================================================

# URL to download the mod scripts
MOD_DOWNLOAD_URL = "https://www.nexusmods.com/halflifealyx/mods/6?tab=files"
MOD_GITHUB_URL = "https://github.com/floh-bhaptics/HalLifeAlyx_OWO/releases"

# Skill manifest addition required for the mod to work
SKILL_MANIFEST_ADDITION = """
# Add this line to: Half-Life Alyx/game/hlvr/cfg/skill_manifest.cfg
script_reload_code tactsuit.lua
"""

def get_mod_info() -> dict:
    """Get information about the required mod."""
    return {
        "name": "bHaptics Tactsuit for Half-Life: Alyx",
        "description": "Lua scripts that emit game events to console.log",
        "download_url": MOD_DOWNLOAD_URL,
        "github_url": MOD_GITHUB_URL,
        "install_instructions": [
            "1. Download the Scripts archive from NexusMods or GitHub",
            "2. Extract to: Steam/steamapps/common/Half-Life Alyx/",
            "3. Ensure vscripts folder exists at: game/hlvr/scripts/vscripts/",
            "4. Add to skill_manifest.cfg: script_reload_code tactsuit.lua",
            "5. Add -condebug to game launch options in Steam",
        ],
        "skill_manifest_addition": SKILL_MANIFEST_ADDITION.strip(),
    }


def generate_skill_manifest_content() -> str:
    """Generate the skill_manifest.cfg content with mod enabled."""
    return """exec skill.cfg
exec skill_episodic.cfg
exec skill_hlvr.cfg

script_reload_code tactsuit.lua
"""

