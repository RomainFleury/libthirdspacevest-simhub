"""
Counter-Strike 2 Game State Integration (GSI) for Third Space Vest.

This module receives HTTP POST requests from CS2's Game State Integration
system and maps game events to haptic feedback on the vest.

Architecture:
    CS2 (HTTP POST) → CS2GSIIntegration (port 3000) → Daemon (TCP 5050) → Vest

Reference implementation inspired by:
    - csgo-gsi-python: https://github.com/Erlendeikeland/csgo-gsi-python
    - CSGO-GSI: https://github.com/mdarvanaghi/CSGO-GSI
    - CounterStrike2GSI (C#): https://github.com/antonpup/CounterStrike2GSI

CS2 GSI Documentation:
    https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Game_State_Integration

Usage:
    # Start the GSI server (auto-connects to daemon)
    python -m modern_third_space.cli cs2 start

    # Or programmatically:
    from modern_third_space.integrations import run_cs2_gsi
    asyncio.run(run_cs2_gsi(gsi_port=3000, daemon_port=5050))

Configuration:
    Place a config file in your CS2 directory:
    <CS2_DIR>/game/csgo/cfg/gamestate_integration_thirdspace.cfg

    Use `python -m modern_third_space.cli cs2 generate-config` to create one.
"""

import asyncio
import json
import logging
import socket
from dataclasses import dataclass, field
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
from typing import Optional, Dict, Any

from .base import BaseGameIntegration

logger = logging.getLogger(__name__)


# =============================================================================
# Game State Parsing
# =============================================================================

@dataclass
class PlayerState:
    """Parsed player state from CS2 GSI."""
    health: int = 100
    armor: int = 0
    helmet: bool = False
    flashed: int = 0  # 0-255, flash intensity
    smoked: int = 0
    burning: int = 0
    money: int = 0
    round_kills: int = 0
    round_killhs: int = 0
    equip_value: int = 0
    defusekit: bool = False


@dataclass
class GameState:
    """
    Parsed game state from CS2 GSI.
    
    This is a simplified version - CS2 sends much more data.
    We extract only what's needed for haptic feedback.
    """
    # Provider info
    provider_name: str = ""
    provider_appid: int = 0
    
    # Player info
    player_name: str = ""
    player_team: str = ""  # "T" or "CT"
    player_activity: str = ""  # "playing", "menu", etc.
    player_state: PlayerState = field(default_factory=PlayerState)
    
    # Round info
    round_phase: str = ""  # "live", "freezetime", "over"
    bomb_state: str = ""  # "planted", "defused", "exploded", ""
    
    # Map info
    map_name: str = ""
    map_phase: str = ""  # "warmup", "live", "intermission", "gameover"
    
    # Previous state (for detecting changes)
    previously: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_json(cls, data: dict) -> "GameState":
        """Parse CS2 GSI JSON payload into GameState."""
        gs = cls()
        
        # Provider
        provider = data.get("provider", {})
        gs.provider_name = provider.get("name", "")
        gs.provider_appid = provider.get("appid", 0)
        
        # Player
        player = data.get("player", {})
        gs.player_name = player.get("name", "")
        gs.player_team = player.get("team", "")
        gs.player_activity = player.get("activity", "")
        
        # Player state
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
        
        # Round
        round_data = data.get("round", {})
        gs.round_phase = round_data.get("phase", "")
        gs.bomb_state = round_data.get("bomb", "")
        
        # Map
        map_data = data.get("map", {})
        gs.map_name = map_data.get("name", "")
        gs.map_phase = map_data.get("phase", "")
        
        # Previous state (for change detection)
        gs.previously = data.get("previously", {})
        
        return gs


# =============================================================================
# Event Detection
# =============================================================================

def detect_damage(current: GameState, previous_health: int) -> Optional[int]:
    """Detect if player took damage. Returns damage amount or None."""
    if current.player_state.health < previous_health:
        return previous_health - current.player_state.health
    return None


def detect_death(current: GameState) -> bool:
    """Detect if player died this update."""
    # Check if health went to 0 from previously having health
    prev_player = current.previously.get("player", {})
    prev_state = prev_player.get("state", {})
    prev_health = prev_state.get("health", 100)
    
    return current.player_state.health == 0 and prev_health > 0


def detect_flash(current: GameState) -> Optional[int]:
    """Detect flash. Returns flash intensity (0-255) if newly flashed."""
    prev_player = current.previously.get("player", {})
    prev_state = prev_player.get("state", {})
    prev_flash = prev_state.get("flashed", 0)
    
    # Newly flashed (intensity increased significantly)
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
    """Detect if player got a kill."""
    prev_player = current.previously.get("player", {})
    prev_state = prev_player.get("state", {})
    prev_kills = prev_state.get("round_kills", 0)
    
    return current.player_state.round_kills > prev_kills


# =============================================================================
# HTTP Server for GSI
# =============================================================================

class GSIHandler(BaseHTTPRequestHandler):
    """
    HTTP request handler for CS2 GSI POST requests.
    
    CS2 sends JSON payloads to this endpoint whenever game state changes.
    """
    
    # Will be set by CS2GSIIntegration
    callback = None
    
    def log_message(self, format, *args):
        """Suppress default logging (we handle it ourselves)."""
        pass
    
    def do_POST(self):
        """Handle POST request from CS2."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode("utf-8"))
            
            # Call the registered callback
            if GSIHandler.callback:
                GSIHandler.callback(payload)
            
            # Send success response
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
# CS2 GSI Integration
# =============================================================================

class CS2GSIIntegration(BaseGameIntegration):
    """
    Counter-Strike 2 Game State Integration.
    
    Receives HTTP POSTs from CS2 and sends haptic commands to the vest daemon.
    
    Effect Mapping (hardcoded for now, will be configurable later):
        - Damage taken → Trigger cells proportional to damage
        - Death → Full vest pulse
        - Flashbang → Quick burst on upper cells
        - Bomb planted → Heartbeat pattern start
        - Bomb exploded → Full intensity pulse
        - Round start → Light activation
        - Got a kill → Quick feedback pulse
    
    TODO: Make effect mapping configurable via JSON/YAML config file.
    """
    
    name = "cs2_gsi"
    
    def __init__(
        self,
        gsi_host: str = "127.0.0.1",
        gsi_port: int = 3000,
        daemon_host: str = "127.0.0.1",
        daemon_port: int = 5050,
        **kwargs
    ):
        super().__init__(daemon_host=daemon_host, daemon_port=daemon_port, **kwargs)
        
        self.gsi_host = gsi_host
        self.gsi_port = gsi_port
        self._http_server: Optional[HTTPServer] = None
        self._server_thread: Optional[Thread] = None
        self._previous_health = 100
        self._event_queue: asyncio.Queue = asyncio.Queue()
    
    async def start(self):
        """Start the GSI HTTP server and daemon connection."""
        self._running = True
        
        # Connect to daemon first
        if not await self.connect_to_daemon():
            logger.warning("Could not connect to daemon - will retry on events")
        
        # Start HTTP server in a thread
        self._start_http_server()
        
        logger.info(f"CS2 GSI listening on http://{self.gsi_host}:{self.gsi_port}")
        logger.info("Waiting for CS2 game state updates...")
        
        # Process events from the queue
        await self._process_events()
    
    async def stop(self):
        """Stop the GSI server and disconnect from daemon."""
        self._running = False
        
        if self._http_server:
            self._http_server.shutdown()
            self._http_server = None
        
        await self.disconnect_from_daemon()
        logger.info("CS2 GSI integration stopped")
    
    def _start_http_server(self):
        """Start the HTTP server in a background thread."""
        # Set the callback for the handler
        GSIHandler.callback = self._on_gsi_payload
        
        self._http_server = HTTPServer(
            (self.gsi_host, self.gsi_port),
            GSIHandler
        )
        
        self._server_thread = Thread(
            target=self._http_server.serve_forever,
            daemon=True
        )
        self._server_thread.start()
    
    def _on_gsi_payload(self, payload: dict):
        """Called when a GSI payload is received (from HTTP thread)."""
        # Put in queue for async processing
        try:
            self._event_queue.put_nowait(payload)
        except asyncio.QueueFull:
            logger.warning("Event queue full, dropping payload")
    
    async def _process_events(self):
        """Process events from the queue (async loop)."""
        while self._running:
            try:
                payload = await asyncio.wait_for(
                    self._event_queue.get(),
                    timeout=1.0
                )
                await self._handle_gsi_payload(payload)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing event: {e}")
    
    async def _handle_gsi_payload(self, payload: dict):
        """Process a GSI payload and trigger haptics."""
        game_state = GameState.from_json(payload)
        
        # Skip if not actively playing
        if game_state.player_activity != "playing":
            return
        
        # Detect events and trigger haptics
        await self._handle_game_event("game_state", {"state": game_state})
        
        # Update previous health for next comparison
        self._previous_health = game_state.player_state.health
    
    async def _handle_game_event(self, event_type: str, data: dict):
        """
        Handle game events and trigger appropriate haptics.
        
        Effect mapping is currently hardcoded.
        TODO: Make this configurable via config file.
        """
        game_state: GameState = data.get("state")
        if not game_state:
            return
        
        # Ensure daemon connection
        if not self.daemon.is_connected:
            await self.connect_to_daemon()
            if not self.daemon.is_connected:
                return
        
        # === DAMAGE ===
        damage = detect_damage(game_state, self._previous_health)
        if damage:
            await self._trigger_damage(damage)
            self.emit_event("damage", {"amount": damage})
        
        # === DEATH ===
        if detect_death(game_state):
            await self._trigger_death()
            self.emit_event("death", {})
        
        # === FLASH ===
        flash_intensity = detect_flash(game_state)
        if flash_intensity:
            await self._trigger_flash(flash_intensity)
            self.emit_event("flash", {"intensity": flash_intensity})
        
        # === BOMB PLANTED ===
        if detect_bomb_planted(game_state):
            await self._trigger_bomb_planted()
            self.emit_event("bomb_planted", {})
        
        # === BOMB EXPLODED ===
        if detect_bomb_exploded(game_state):
            await self._trigger_bomb_exploded()
            self.emit_event("bomb_exploded", {})
        
        # === ROUND START ===
        if detect_round_start(game_state):
            await self._trigger_round_start()
            self.emit_event("round_start", {})
        
        # === GOT A KILL ===
        if detect_kill(game_state):
            await self._trigger_kill()
            self.emit_event("kill", {})
    
    # =========================================================================
    # Haptic Effect Triggers
    # =========================================================================
    # 
    # The Third Space Vest has 8 cells (0-7):
    #   0: Front left upper
    #   1: Front right upper
    #   2: Front left lower
    #   3: Front right lower
    #   4: Back left upper
    #   5: Back right upper
    #   6: Back left lower
    #   7: Back right lower
    #
    # Speed ranges from 1 (slow) to 10 (fast/intense)
    # =========================================================================
    
    async def _trigger_damage(self, damage: int):
        """
        Trigger haptics for taking damage.
        
        Intensity scales with damage amount.
        Higher damage = more cells, higher speed.
        """
        logger.info(f"CS2: Player took {damage} damage")
        
        # Scale speed based on damage (1-10)
        speed = min(10, max(1, damage // 10))
        
        if damage < 25:
            # Light damage: front cells only
            await self.daemon.send_trigger(0, speed)
            await self.daemon.send_trigger(1, speed)
        elif damage < 50:
            # Medium damage: front + some back
            for cell in [0, 1, 2, 3]:
                await self.daemon.send_trigger(cell, speed)
        else:
            # Heavy damage: all cells
            for cell in range(8):
                await self.daemon.send_trigger(cell, speed)
    
    async def _trigger_death(self):
        """Trigger haptics for player death - full vest pulse."""
        logger.info("CS2: Player died")
        
        # Full intensity on all cells
        for cell in range(8):
            await self.daemon.send_trigger(cell, 10)
        
        # Brief delay then stop
        await asyncio.sleep(0.5)
        await self.daemon.send_stop()
    
    async def _trigger_flash(self, intensity: int):
        """Trigger haptics for flashbang - quick burst on upper cells."""
        logger.info(f"CS2: Player flashed (intensity: {intensity})")
        
        # Upper cells only, intensity based on flash amount
        speed = min(10, max(5, intensity // 25))
        
        for cell in [0, 1, 4, 5]:  # Upper cells
            await self.daemon.send_trigger(cell, speed)
        
        # Quick burst
        await asyncio.sleep(0.2)
        await self.daemon.send_stop()
    
    async def _trigger_bomb_planted(self):
        """Trigger haptics for bomb planted - subtle pulse."""
        logger.info("CS2: Bomb planted")
        
        # Light pulse on lower cells
        for cell in [2, 3, 6, 7]:
            await self.daemon.send_trigger(cell, 3)
        
        await asyncio.sleep(0.3)
        await self.daemon.send_stop()
    
    async def _trigger_bomb_exploded(self):
        """Trigger haptics for bomb explosion - maximum intensity."""
        logger.info("CS2: Bomb exploded")
        
        # Full intensity, all cells
        for cell in range(8):
            await self.daemon.send_trigger(cell, 10)
        
        await asyncio.sleep(0.8)
        await self.daemon.send_stop()
    
    async def _trigger_round_start(self):
        """Trigger haptics for round start - light activation."""
        logger.info("CS2: Round started")
        
        # Quick light pulse
        for cell in range(8):
            await self.daemon.send_trigger(cell, 2)
        
        await asyncio.sleep(0.2)
        await self.daemon.send_stop()
    
    async def _trigger_kill(self):
        """Trigger haptics for getting a kill - quick feedback."""
        logger.info("CS2: Player got a kill")
        
        # Quick pulse on front cells
        await self.daemon.send_trigger(0, 5)
        await self.daemon.send_trigger(1, 5)
        
        await asyncio.sleep(0.15)
        await self.daemon.send_stop()


# =============================================================================
# Config File Generator
# =============================================================================

CS2_CONFIG_TEMPLATE = '''"ThirdSpace Vest Integration"
{{
    "uri"          "http://{host}:{port}/"
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


def generate_gsi_config(host: str = "127.0.0.1", port: int = 3000) -> str:
    """Generate CS2 GSI config file content."""
    return CS2_CONFIG_TEMPLATE.format(host=host, port=port)


def get_cs2_cfg_path() -> Optional[str]:
    """
    Try to find CS2 config directory.
    
    Common paths (CS2 still uses legacy folder names):
    - Windows: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\cfg
    - macOS: ~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg
    - Linux: ~/.steam/steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg
    """
    import os
    import platform
    
    system = platform.system()
    
    # CS2 still uses the legacy "Counter-Strike Global Offensive" folder name
    if system == "Windows":
        paths = [
            r"C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg",
            r"C:\Program Files\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg",
        ]
    elif system == "Darwin":  # macOS
        home = os.path.expanduser("~")
        paths = [
            f"{home}/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg",
        ]
    else:  # Linux
        home = os.path.expanduser("~")
        paths = [
            f"{home}/.steam/steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg",
            f"{home}/.local/share/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg",
        ]
    
    for path in paths:
        if os.path.isdir(path):
            return path
    
    return None


# =============================================================================
# Daemon Auto-Discovery
# =============================================================================

def find_daemon_port(
    host: str = "127.0.0.1",
    ports: list = [5050, 5051, 5052]
) -> Optional[int]:
    """
    Try to find a running daemon by checking common ports.
    
    Returns the first port that accepts a connection, or None.
    """
    for port in ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                logger.info(f"Found daemon on port {port}")
                return port
        except Exception:
            pass
    
    return None


# =============================================================================
# Entry Point
# =============================================================================

async def run_cs2_gsi(
    gsi_host: str = "127.0.0.1",
    gsi_port: int = 3000,
    daemon_host: str = "127.0.0.1",
    daemon_port: Optional[int] = None,
    auto_discover: bool = True
):
    """
    Run the CS2 GSI integration.
    
    Args:
        gsi_host: Host to bind GSI HTTP server
        gsi_port: Port for GSI HTTP server (CS2 will POST here)
        daemon_host: Vest daemon host
        daemon_port: Vest daemon port (None = auto-discover)
        auto_discover: Try to find daemon automatically
    """
    # Auto-discover daemon if no port specified
    if daemon_port is None and auto_discover:
        daemon_port = find_daemon_port(daemon_host)
        if daemon_port is None:
            logger.error("Could not find running daemon. Start it with:")
            logger.error("  python -m modern_third_space.cli daemon start")
            return
    
    daemon_port = daemon_port or 5050
    
    integration = CS2GSIIntegration(
        gsi_host=gsi_host,
        gsi_port=gsi_port,
        daemon_host=daemon_host,
        daemon_port=daemon_port
    )
    
    try:
        await integration.start()
    except KeyboardInterrupt:
        pass
    finally:
        await integration.stop()

