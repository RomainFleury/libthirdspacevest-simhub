"""
Star Citizen Integration Manager for the vest daemon.

This module provides Game.log file watching to receive game events from
Star Citizen. The game writes death/kill events to Game.log with directional
damage information.

Based on community tools:
- VerseWatcher: https://github.com/PINKgeekPDX/VerseWatcher
- citizenmon: https://github.com/danieldeschain/citizenmon

When Star Citizen game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest (with directional support)
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
from math import sqrt

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
class StarCitizenEvent:
    """Parsed event from Star Citizen Game.log."""
    type: str  # "player_death", "player_kill", "npc_death", "suicide"
    raw: str
    params: dict
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


# Death event pattern from VerseWatcher
# Format: [timestamp] [Notice] <Actor Death> CActor::Kill: 'victim_name' [id] in zone 'ship' killed by 'killer_name' [id] using 'weapon' [...] with damage type 'type' from direction x: ..., y: ..., z: ...
DEATH_PATTERN = re.compile(
    r"^(?P<timestamp>\S+)\s+\[Notice\]\s+<Actor Death> CActor::Kill:\s+"
    r"\'(?P<vname>[^\']+)\'\s+\[\d+\]\s+in zone\s+\'(?P<vship>[^\']+)\'\s+"
    r"killed by\s+\'(?P<kname>[^\']+)\'\s+\[\d+\]\s+using\s+\'(?P<kwep>[^\']+)\'\s+"
    r"\[[^\]]*\]\s+with damage type\s+\'(?P<dtype>[^\']+)\'\s+from direction x:\s*"
    r"(?P<dirvecx>[^,]+),\s*y:\s*(?P<dirvecy>[^,]+),\s*z:\s*(?P<dirvecz>[^\s]+)"
    r"\s+\[Team_ActorTech\]\[Actor\]$"
)

# Ship hit event pattern
# Format: [OnHandleHit] Hit FROM <attacker> TO <ship>. Being sent to child <player_name>
SHIP_HIT_PATTERN = re.compile(
    r"\[OnHandleHit\]\s+Hit\s+FROM\s+(?P<attacker>[^\s]+)\s+TO\s+(?P<ship>[^\s]+)\.\s+Being sent to child\s+(?P<player>[^\s]+)"
)


def parse_death_line(line: str, player_name: Optional[str] = None) -> Optional[StarCitizenEvent]:
    """
    Parse a death event line from Game.log.
    
    Args:
        line: Log line to parse
        player_name: Optional player name to identify player events
        
    Returns:
        StarCitizenEvent if valid, None otherwise
    """
    match = DEATH_PATTERN.search(line)
    if not match:
        return None
    
    victim_name = match.group("vname")
    killer_name = match.group("kname")
    weapon = match.group("kwep")
    ship = match.group("vship")
    damage_type = match.group("dtype")
    
    # Parse direction vector
    try:
        dir_x = float(match.group("dirvecx").strip())
        dir_y = float(match.group("dirvecy").strip())
        dir_z = float(match.group("dirvecz").strip())
    except (ValueError, AttributeError):
        logger.warning(f"Failed to parse direction vector from line: {line[:100]}")
        dir_x, dir_y, dir_z = 0.0, 0.0, 0.0
    
    # Determine event type
    is_npc = victim_name.startswith("PU_") or "NPC" in victim_name.upper() or killer_name.startswith("PU_") or "NPC" in killer_name.upper()
    is_suicide = victim_name == killer_name
    
    if player_name:
        is_player_victim = player_name.lower() in victim_name.lower()
        is_player_killer = player_name.lower() in killer_name.lower()
    else:
        # Without player name, assume victim is player if not NPC
        is_player_victim = not is_npc
        is_player_killer = False
    
    # Classify event type
    if is_suicide:
        event_type = "suicide"
    elif is_player_victim:
        event_type = "player_death"
    elif is_player_killer:
        event_type = "player_kill"
    elif is_npc:
        event_type = "npc_death"
    else:
        # Unknown, treat as generic death
        event_type = "death"
    
    params = {
        "victim_name": victim_name,
        "killer_name": killer_name,
        "weapon": weapon,
        "ship": ship,
        "damage_type": damage_type,
        "direction": {
            "x": dir_x,
            "y": dir_y,
            "z": dir_z,
        },
        "is_npc": is_npc,
        "is_suicide": is_suicide,
    }
    
    return StarCitizenEvent(type=event_type, raw=line, params=params)


def parse_ship_hit_line(line: str, player_name: Optional[str] = None) -> Optional[StarCitizenEvent]:
    """
    Parse a ship hit event line from Game.log.
    
    Args:
        line: Log line to parse
        player_name: Optional player name to identify player events
        
    Returns:
        StarCitizenEvent if valid, None otherwise
    """
    match = SHIP_HIT_PATTERN.search(line)
    if not match:
        return None
    
    attacker = match.group("attacker")
    ship = match.group("ship")
    player = match.group("player")
    
    # Check if this is the player's ship
    if player_name:
        is_player_ship = player_name.lower() in player.lower()
    else:
        # Without player name, assume any ship hit is the player's
        is_player_ship = True
    
    if not is_player_ship:
        return None
    
    # Determine if attacker is NPC or player
    is_npc_attacker = attacker.startswith("PU_") or "NPC" in attacker.upper() or "Vanduul" in attacker or "Pirate" in attacker
    
    params = {
        "attacker": attacker,
        "ship": ship,
        "player": player,
        "is_npc_attacker": is_npc_attacker,
    }
    
    return StarCitizenEvent(type="ship_hit", raw=line, params=params)


# =============================================================================
# Direction Vector to Vest Cell Mapping
# =============================================================================

def normalize_vector(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """Normalize a 3D vector."""
    length = sqrt(x*x + y*y + z*z)
    if length == 0:
        return 0.0, 0.0, 0.0
    return x/length, y/length, z/length


def direction_to_cells(dir_x: float, dir_y: float, dir_z: float) -> List[int]:
    """
    Convert direction vector (x, y, z) to vest cells.
    
    Direction reference (relative to player facing):
    - Positive Z = Front (toward player)
    - Negative Z = Back (away from player)
    - Negative X = Left (from player perspective)
    - Positive X = Right (from player perspective)
    - Positive Y = Up
    - Negative Y = Down
    
    Uses correct hardware cell layout from cell_layout module:
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    # Normalize direction vector
    nx, ny, nz = normalize_vector(dir_x, dir_y, dir_z)
    
    cells = []
    
    # Determine primary direction (front/back)
    if abs(nz) > abs(nx) and abs(nz) > abs(ny):
        # Front/Back dominant
        if nz > 0:
            # Front
            if abs(ny) > 0.3:
                # Vertical component - use upper or lower
                if ny > 0:
                    cells.extend([Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT])
                else:
                    cells.extend([Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT])
            else:
                # Horizontal - use all front cells
                cells.extend(FRONT_CELLS)
        else:
            # Back
            if abs(ny) > 0.3:
                if ny > 0:
                    cells.extend([Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT])
                else:
                    cells.extend([Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT])
            else:
                cells.extend(BACK_CELLS)
    elif abs(nx) > abs(ny):
        # Left/Right dominant
        if nx < 0:
            # Left side
            cells.extend(LEFT_SIDE)
        else:
            # Right side
            cells.extend(RIGHT_SIDE)
    else:
        # Up/Down dominant
        if ny > 0:
            # Up - upper cells
            cells.extend(UPPER_CELLS)
        else:
            # Down - lower cells
            cells.extend(LOWER_CELLS)
    
    # If no cells determined, default to front
    if not cells:
        cells = FRONT_CELLS
    
    return cells


# =============================================================================
# Haptic Mapper
# =============================================================================

def map_event_to_haptics(event: StarCitizenEvent) -> List[Tuple[int, int]]:
    """
    Map a Star Citizen event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    direction = event.params.get("direction", {})
    dir_x = direction.get("x", 0.0)
    dir_y = direction.get("y", 0.0)
    dir_z = direction.get("z", 0.0)
    damage_type = event.params.get("damage_type", "")
    
    if event.type == "player_death":
        # Player was killed - high intensity, all affected cells
        cells = direction_to_cells(dir_x, dir_y, dir_z)
        # Scale intensity by damage type
        if "explosive" in damage_type.lower():
            speed = 10  # Maximum for explosions
        elif "ballistic" in damage_type.lower():
            speed = 9
        elif "energy" in damage_type.lower():
            speed = 8
        else:
            speed = 7
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "player_kill":
        # Player killed someone - medium intensity, front cells
        cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
        speed = 6
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "npc_death":
        # NPC death - low intensity, single cell
        cells = direction_to_cells(dir_x, dir_y, dir_z)
        if cells:
            commands.append((cells[0], 4))
        else:
            commands.append((Cell.FRONT_UPPER_LEFT, 4))
    
    elif event.type == "suicide":
        # Suicide - medium intensity, all cells
        for cell in ALL_CELLS:
            commands.append((cell, 6))
    
    elif event.type == "ship_hit":
        # Ship hit - strong vibration, front or back based on context
        # Since we don't have direction info, use front cells for ship hits
        # (feels like impact from the front)
        attacker = event.params.get("attacker", "")
        is_npc = event.params.get("is_npc_attacker", False)
        
        # Stronger for NPC attacks (combat), medium for other hits
        if is_npc:
            speed = 8  # Strong impact
        else:
            speed = 6  # Medium impact
        
        # Use front cells to simulate impact
        cells = FRONT_CELLS
        for cell in cells:
            commands.append((cell, speed))
    
    else:
        # Generic death - medium intensity
        cells = direction_to_cells(dir_x, dir_y, dir_z)
        speed = 5
        for cell in cells:
            commands.append((cell, speed))
    
    return commands


# =============================================================================
# Game.log Watcher
# =============================================================================

class GameLogWatcher:
    """
    Watches Star Citizen Game.log for death events.
    """
    
    DEFAULT_POLL_INTERVAL = 0.1  # 100ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[StarCitizenEvent], None],
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
        """Start watching the Game.log."""
        logger.info(f"[STARCITIZEN] GameLogWatcher.start() called for: {self.log_path}")
        
        if self._running:
            logger.warning("[STARCITIZEN] GameLogWatcher already running")
            return False, "Already watching"
        
        logger.info(f"[STARCITIZEN] Checking if log file exists: {self.log_path.exists()}")
        if not self.log_path.exists():
            logger.error(f"[STARCITIZEN] Game.log not found: {self.log_path}")
            return False, f"Game.log not found: {self.log_path}"
        
        logger.info("[STARCITIZEN] Setting up watcher...")
        self._running = True
        # Start from end of file (don't process old events)
        try:
            logger.info("[STARCITIZEN] Getting file size...")
            self._last_position = self.log_path.stat().st_size
            logger.info(f"[STARCITIZEN] File size: {self._last_position} bytes")
        except OSError as e:
            logger.warning(f"[STARCITIZEN] Could not get file size: {e}, starting from beginning")
            self._last_position = 0
        
        logger.info("[STARCITIZEN] Starting watch thread...")
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        logger.info("[STARCITIZEN] Watch thread started")
        
        logger.info(f"[STARCITIZEN] Started watching Game.log: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the Game.log."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching Game.log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                # Log file may be deleted/recreated (game restart)
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading Game.log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the Game.log."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (new Game.log on game restart)
        if current_size < self._last_position:
            logger.info("Game.log truncated (game restart?), resetting position")
            self._last_position = 0
        
        if current_size == self._last_position:
            return
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._last_position)
                new_content = f.read()
                self._last_position = f.tell()
            
            for line in new_content.splitlines():
                # Check for death events
                if "<Actor Death>" in line:
                    event = parse_death_line(line, self.player_name)
                    if event:
                        self.on_event(event)
                
                # Check for ship hit events
                if "[OnHandleHit]" in line:
                    event = parse_ship_hit_line(line, self.player_name)
                    if event:
                        self.on_event(event)
        
        except IOError as e:
            # File may be locked by game
            logger.debug(f"IOError reading Game.log (game may have lock): {e}")


# =============================================================================
# Star Citizen Manager
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class StarCitizenManager:
    """
    Manages Star Citizen integration within the daemon.
    
    This class:
    1. Watches Game.log for death events
    2. Parses and maps events to haptic commands (with directional support)
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    # Default paths for Game.log
    DEFAULT_LOG_PATHS = [
        # Windows (RSI Launcher)
        Path("C:/Program Files/Roberts Space Industries/StarCitizen/LIVE/Game.log"),
        # Windows (Steam)
        Path("C:/Program Files (x86)/Steam/steamapps/common/StarCitizen/Game.log"),
        # Windows (alternative Steam location)
        Path("C:/Program Files/Steam/steamapps/common/StarCitizen/Game.log"),
        # Linux (Proton)
        Path.home() / ".steam/steam/steamapps/common/StarCitizen/Game.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[GameLogWatcher] = None
        self._running = False
        self._player_name: Optional[str] = None
        
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
        """Try to auto-detect the Game.log path."""
        logger.info("[STARCITIZEN] Starting auto-detect for Game.log path")
        for i, path in enumerate(self.DEFAULT_LOG_PATHS):
            logger.debug(f"[STARCITIZEN] Checking path {i+1}/{len(self.DEFAULT_LOG_PATHS)}: {path}")
            if path.exists():
                logger.info(f"[STARCITIZEN] Found Game.log at: {path}")
                return path
        
        logger.info("[STARCITIZEN] Game.log not found, checking parent directories")
        # Also check parent directories exist (game installed but no log yet)
        for i, path in enumerate(self.DEFAULT_LOG_PATHS):
            logger.debug(f"[STARCITIZEN] Checking parent directory {i+1}/{len(self.DEFAULT_LOG_PATHS)}: {path.parent}")
            if path.parent.exists():
                logger.info(f"[STARCITIZEN] Parent directory exists, will use: {path}")
                return path
        
        logger.warning("[STARCITIZEN] Could not auto-detect Game.log path")
        return None
    
    def start(self, log_path: Optional[str] = None, player_name: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Start watching for Star Citizen events.
        
        Args:
            log_path: Path to Game.log, or None for auto-detect
            player_name: Optional player name to identify player events
            
        Returns:
            (success, error_message)
        """
        logger.info(f"[STARCITIZEN] Manager.start() called: log_path={log_path}, player_name={player_name}")
        
        if self._running:
            logger.warning("[STARCITIZEN] Already running, returning error")
            return False, "Star Citizen integration already running"
        
        logger.info("[STARCITIZEN] Determining log path...")
        # Determine log path
        if log_path:
            logger.info(f"[STARCITIZEN] Using provided log_path: {log_path}")
            self._log_path = Path(log_path)
        else:
            logger.info("[STARCITIZEN] No log_path provided, calling auto_detect_log_path()")
            self._log_path = self.auto_detect_log_path()
            logger.info(f"[STARCITIZEN] auto_detect_log_path() returned: {self._log_path}")
        
        if not self._log_path:
            logger.error("[STARCITIZEN] No log path found, returning error")
            return False, "Could not find Game.log. Ensure Star Citizen is installed"
        
        logger.info(f"[STARCITIZEN] Using log_path: {self._log_path}")
        logger.info(f"[STARCITIZEN] Checking if log file exists: {self._log_path.exists()}")
        
        self._player_name = player_name
        logger.info(f"[STARCITIZEN] Player name set to: {self._player_name}")
        
        # Create watcher
        logger.info("[STARCITIZEN] Creating GameLogWatcher...")
        self._watcher = GameLogWatcher(
            log_path=self._log_path,
            on_event=self._on_starcitizen_event,
            player_name=self._player_name,
        )
        logger.info("[STARCITIZEN] GameLogWatcher created, calling watcher.start()...")
        
        success, error = self._watcher.start()
        logger.info(f"[STARCITIZEN] watcher.start() returned: success={success}, error={error}")
        
        if not success:
            logger.error(f"[STARCITIZEN] Watcher failed to start: {error}")
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        
        logger.info(f"[STARCITIZEN] Integration started successfully, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for Star Citizen events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("Star Citizen integration stopped")
        return True
    
    def _on_starcitizen_event(self, event: StarCitizenEvent):
        """Called when a Star Citizen event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"Star Citizen event: {event.type} - {event.params}")
        
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

