"""
CS2 GSI Manager for the vest daemon.

This module provides a CS2 GSI HTTP server that can be embedded in the daemon.
When CS2 game events are detected, they are passed to a callback which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients

This keeps the daemon as the single point of control while enabling
CS2 integration to run within its process.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
from typing import Callable, Optional, Any

from ..vest.cell_layout import (
    Cell,
    FRONT_CELLS,
    ALL_CELLS,
    UPPER_CELLS,
    LOWER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Game State Parsing (from cs2_gsi.py)
# =============================================================================

@dataclass
class PlayerState:
    """Parsed player state from CS2 GSI."""
    health: int = 100
    armor: int = 0
    helmet: bool = False
    flashed: int = 0
    smoked: int = 0
    burning: int = 0
    money: int = 0
    round_kills: int = 0
    round_killhs: int = 0
    equip_value: int = 0
    defusekit: bool = False


@dataclass
class GameState:
    """Parsed game state from CS2 GSI."""
    provider_name: str = ""
    provider_appid: int = 0
    player_name: str = ""
    player_team: str = ""
    player_activity: str = ""
    player_state: PlayerState = None
    round_phase: str = ""
    bomb_state: str = ""
    map_name: str = ""
    map_phase: str = ""
    previously: dict = None
    
    def __post_init__(self):
        if self.player_state is None:
            self.player_state = PlayerState()
        if self.previously is None:
            self.previously = {}
    
    @classmethod
    def from_json(cls, data: dict) -> "GameState":
        """Parse CS2 GSI JSON payload into GameState."""
        gs = cls()
        
        provider = data.get("provider", {})
        gs.provider_name = provider.get("name", "")
        gs.provider_appid = provider.get("appid", 0)
        
        player = data.get("player", {})
        gs.player_name = player.get("name", "")
        gs.player_team = player.get("team", "")
        gs.player_activity = player.get("activity", "")
        
        state = player.get("state", {})
        gs.player_state = PlayerState(
            health=state.get("health", 100),
            armor=state.get("armor", 0),
            helmet=state.get("helmet", False),
            flashed=state.get("flashed", 0),
            smoked=state.get("smoked", 0),
            burning=state.get("burning", 0),
            money=state.get("money", 0),
            round_kills=state.get("round_kills", 0),
            round_killhs=state.get("round_killhs", 0),
            equip_value=state.get("equip_value", 0),
            defusekit=state.get("defusekit", False),
        )
        
        round_data = data.get("round", {})
        gs.round_phase = round_data.get("phase", "")
        gs.bomb_state = round_data.get("bomb", "")
        
        map_data = data.get("map", {})
        gs.map_name = map_data.get("name", "")
        gs.map_phase = map_data.get("phase", "")
        
        gs.previously = data.get("previously", {})
        
        return gs


# =============================================================================
# Event Detection
# =============================================================================

def detect_damage(current: GameState, previous_health: int = None) -> Optional[int]:
    """
    Detect if player took damage. Returns damage amount or None.
    
    Uses the 'previously' object from GSI payload which is more reliable.
    """
    # Use GSI's 'previously' field - this is the authoritative source
    prev_player = current.previously.get("player", {})
    prev_state = prev_player.get("state", {})
    prev_health = prev_state.get("health")
    
    # Only detect damage if GSI explicitly tells us health changed
    if prev_health is not None and current.player_state.health < prev_health:
        damage = prev_health - current.player_state.health
        # Ignore very small "damage" (can be false positives)
        if damage >= 5:
            return damage
    return None


def detect_death(current: GameState) -> bool:
    """Detect if player died this update."""
    prev_player = current.previously.get("player", {})
    prev_state = prev_player.get("state", {})
    prev_health = prev_state.get("health", 100)
    return current.player_state.health == 0 and prev_health > 0


def detect_flash(current: GameState) -> Optional[int]:
    """Detect flash. Returns flash intensity (0-255) if newly flashed."""
    prev_player = current.previously.get("player", {})
    prev_state = prev_player.get("state", {})
    prev_flash = prev_state.get("flashed", 0)
    if current.player_state.flashed > prev_flash and current.player_state.flashed > 50:
        return current.player_state.flashed
    return None


def detect_bomb_planted(current: GameState) -> bool:
    """Detect if bomb was just planted."""
    prev_round = current.previously.get("round", {})
    prev_bomb = prev_round.get("bomb", "")
    return current.bomb_state == "planted" and prev_bomb != "planted"


def detect_bomb_exploded(current: GameState) -> bool:
    """Detect if bomb exploded."""
    prev_round = current.previously.get("round", {})
    prev_bomb = prev_round.get("bomb", "")
    return current.bomb_state == "exploded" and prev_bomb != "exploded"


def detect_round_start(current: GameState) -> bool:
    """Detect round start (freezetime ended)."""
    prev_round = current.previously.get("round", {})
    prev_phase = prev_round.get("phase", "")
    return current.round_phase == "live" and prev_phase == "freezetime"


def detect_kill(current: GameState) -> bool:
    """
    Detect if player got a kill.
    
    NOTE: Disabled - CS2 GSI sends round_kills inconsistently,
    causing false positives on reload/fire.
    """
    return False  # Disabled due to false positives


# =============================================================================
# HTTP Server for GSI
# =============================================================================

class GSIHandler(BaseHTTPRequestHandler):
    """HTTP request handler for CS2 GSI POST requests."""
    
    callback = None
    
    def log_message(self, format, *args):
        pass
    
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode("utf-8"))
            
            if GSIHandler.callback:
                GSIHandler.callback(payload)
            
            self.send_response(200)
            self.end_headers()
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from CS2: {e}")
            self.send_response(400)
            self.end_headers()
        except Exception as e:
            logger.error(f"Error handling GSI request: {e}")
            self.send_response(500)
            self.end_headers()


# =============================================================================
# CS2 Manager (Embeddable in Daemon)
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, Optional[int], Optional[int]], None]
TriggerCallback = Callable[[int, int], None]


class CS2Manager:
    """
    Manages CS2 GSI integration within the daemon.
    
    This class:
    1. Runs an HTTP server to receive CS2 game state
    2. Detects game events (damage, death, flash, etc.)
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, amount, intensity) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    DEFAULT_GSI_PORT = 3000
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._gsi_port: Optional[int] = None
        self._http_server: Optional[HTTPServer] = None
        self._server_thread: Optional[Thread] = None
        self._running = False
        self._previous_health = 100
        
        # Stats
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
    
    @property
    def is_running(self) -> bool:
        return self._running
    
    @property
    def gsi_port(self) -> Optional[int]:
        return self._gsi_port
    
    @property
    def events_received(self) -> int:
        return self._events_received
    
    @property
    def last_event_ts(self) -> Optional[float]:
        return self._last_event_ts
    
    def start(self, gsi_port: int = DEFAULT_GSI_PORT) -> tuple[bool, Optional[str]]:
        """
        Start the GSI HTTP server.
        
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "CS2 GSI already running"
        
        try:
            # Set callback for HTTP handler
            GSIHandler.callback = self._on_gsi_payload
            
            self._http_server = HTTPServer(
                ("127.0.0.1", gsi_port),
                GSIHandler
            )
            
            self._server_thread = Thread(
                target=self._http_server.serve_forever,
                daemon=True
            )
            self._server_thread.start()
            
            self._gsi_port = gsi_port
            self._running = True
            self._events_received = 0
            self._last_event_ts = None
            
            logger.info(f"CS2 GSI started on port {gsi_port}")
            return True, None
            
        except OSError as e:
            if "Address already in use" in str(e) or e.errno == 48:
                return False, f"Port {gsi_port} already in use"
            return False, str(e)
        except Exception as e:
            return False, str(e)
    
    def stop(self) -> bool:
        """Stop the GSI HTTP server."""
        if not self._running:
            return False
        
        if self._http_server:
            self._http_server.shutdown()
            self._http_server = None
        
        self._running = False
        self._gsi_port = None
        
        logger.info("CS2 GSI stopped")
        return True
    
    def _on_gsi_payload(self, payload: dict):
        """Called when a GSI payload is received."""
        self._events_received += 1
        self._last_event_ts = time.time()
        
        game_state = GameState.from_json(payload)
        
        # Skip if not actively playing
        if game_state.player_activity != "playing":
            return
        
        self._process_game_state(game_state)
    
    def _process_game_state(self, gs: GameState):
        """Process game state and trigger effects/events."""
        
        # === DAMAGE ===
        damage = detect_damage(gs)
        if damage:
            self._emit_event("damage", amount=damage)
            self._trigger_damage(damage)
        
        # === DEATH ===
        if detect_death(gs):
            self._emit_event("death")
            self._trigger_death()
        
        # === FLASH ===
        flash_intensity = detect_flash(gs)
        if flash_intensity:
            self._emit_event("flash", intensity=flash_intensity)
            self._trigger_flash(flash_intensity)
        
        # === BOMB PLANTED ===
        if detect_bomb_planted(gs):
            self._emit_event("bomb_planted")
            self._trigger_bomb_planted()
        
        # === BOMB EXPLODED ===
        if detect_bomb_exploded(gs):
            self._emit_event("bomb_exploded")
            self._trigger_bomb_exploded()
        
        # === ROUND START ===
        if detect_round_start(gs):
            self._emit_event("round_start")
            self._trigger_round_start()
        
        # === GOT A KILL === (disabled - causes false positives)
        # if detect_kill(gs):
        #     self._emit_event("kill")
        #     self._trigger_kill()
    
    def _emit_event(self, event_type: str, amount: Optional[int] = None, intensity: Optional[int] = None):
        """Emit a game event to the callback."""
        if self.on_game_event:
            self.on_game_event(event_type, amount, intensity)
    
    def _trigger(self, cell: int, speed: int):
        """Trigger a haptic effect via callback."""
        if self.on_trigger:
            self.on_trigger(cell, speed)
    
    # =========================================================================
    # Haptic Effect Triggers
    # =========================================================================
    # Uses correct hardware cell layout from cell_layout module:
    #
    #       FRONT                    BACK
    #   ┌─────┬─────┐          ┌─────┬─────┐
    #   │  2  │  5  │  Upper   │  1  │  6  │
    #   ├─────┼─────┤          ├─────┼─────┤
    #   │  3  │  4  │  Lower   │  0  │  7  │
    #   └─────┴─────┘          └─────┴─────┘
    #     L     R                L     R
    # =========================================================================
    
    def _trigger_damage(self, damage: int):
        """Trigger haptics for taking damage."""
        logger.info(f"CS2: Player took {damage} damage")
        speed = min(10, max(1, damage // 10))
        
        if damage < 25:
            # Light damage - front upper only
            self._trigger(Cell.FRONT_UPPER_LEFT, speed)
            self._trigger(Cell.FRONT_UPPER_RIGHT, speed)
        elif damage < 50:
            # Medium damage - all front cells
            for cell in FRONT_CELLS:
                self._trigger(cell, speed)
        else:
            # Heavy damage - full vest
            for cell in ALL_CELLS:
                self._trigger(cell, speed)
    
    def _trigger_death(self):
        """Trigger haptics for player death."""
        logger.info("CS2: Player died")
        for cell in ALL_CELLS:
            self._trigger(cell, 10)
    
    def _trigger_flash(self, intensity: int):
        """Trigger haptics for flashbang."""
        logger.info(f"CS2: Player flashed (intensity: {intensity})")
        speed = min(10, max(5, intensity // 25))
        # Flash affects upper cells (head level)
        for cell in UPPER_CELLS:
            self._trigger(cell, speed)
    
    def _trigger_bomb_planted(self):
        """Trigger haptics for bomb planted."""
        logger.info("CS2: Bomb planted")
        # Subtle rumble on lower/torso cells
        for cell in LOWER_CELLS:
            self._trigger(cell, 3)
    
    def _trigger_bomb_exploded(self):
        """Trigger haptics for bomb explosion."""
        logger.info("CS2: Bomb exploded")
        for cell in ALL_CELLS:
            self._trigger(cell, 10)
    
    def _trigger_round_start(self):
        """Trigger haptics for round start."""
        logger.info("CS2: Round started")
        for cell in ALL_CELLS:
            self._trigger(cell, 2)
    
    def _trigger_kill(self):
        """Trigger haptics for getting a kill."""
        logger.info("CS2: Player got a kill")
        # Quick front upper tap for satisfaction feedback
        self._trigger(Cell.FRONT_UPPER_LEFT, 5)
        self._trigger(Cell.FRONT_UPPER_RIGHT, 5)


# =============================================================================
# Config Generator
# =============================================================================

CS2_CONFIG_TEMPLATE = '''"ThirdSpace Vest Integration"
{{
    "uri"          "http://127.0.0.1:{port}/"
    "timeout"      "5.0"
    "buffer"       "0.1"
    "throttle"     "0.1"
    "heartbeat"    "10.0"
    "data"
    {{
        "provider"                  "1"
        "map"                       "1"
        "round"                     "1"
        "player_id"                 "1"
        "player_state"              "1"
        "player_weapons"            "1"
        "player_match_stats"        "1"
    }}
}}
'''


def generate_cs2_config(gsi_port: int = 3000) -> str:
    """Generate CS2 GSI config file content."""
    return CS2_CONFIG_TEMPLATE.format(port=gsi_port)

