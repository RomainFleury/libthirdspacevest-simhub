"""
Age of Empires 2: Definitive Edition integration manager.

This module provides integration with Age of Empires 2: DE via Capture Age,
a popular community spectating tool that provides a WebSocket API for
real-time game events.

Architecture:
    AoE2:DE → Capture Age (spectating) → WebSocket → AoE2Manager → Daemon → Vest

Capture Age provides real-time game data including:
- Unit deaths
- Building destruction
- Age advancement
- Combat events
- Victory/Defeat

The integration requires:
1. Capture Age installed and running (https://captureage.com/)
2. Capture Age connected to an AoE2:DE game (spectating self or others)
3. Player number specified to track the correct player's events

Event flow:
1. User starts AoE2:DE and begins a game
2. Capture Age connects to the game (spectating)
3. AoE2 integration connects to Capture Age's WebSocket API
4. Game events trigger haptic feedback on the vest
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from threading import Thread
from typing import Callable, Dict, List, Optional, Any

from ..vest.cell_layout import (
    Cell,
    ALL_CELLS,
    FRONT_CELLS,
    BACK_CELLS,
    UPPER_CELLS,
    LOWER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Haptic Mapping
# =============================================================================

@dataclass
class HapticMapping:
    """Defines how a game event maps to vest haptics."""
    cells: List[int]
    speed: int
    duration_ms: int = 200


# Event-to-haptic mappings
EVENT_MAPPINGS: Dict[str, HapticMapping] = {
    # Unit events
    "unit_damaged": HapticMapping(
        cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT],
        speed=3,
        duration_ms=100
    ),
    "unit_death": HapticMapping(
        cells=FRONT_CELLS,
        speed=5,
        duration_ms=200
    ),
    
    # Building events
    "building_damaged": HapticMapping(
        cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT],
        speed=4,
        duration_ms=150
    ),
    "building_destroyed": HapticMapping(
        cells=BACK_CELLS,
        speed=7,
        duration_ms=400
    ),
    
    # Milestones
    "age_up": HapticMapping(
        cells=ALL_CELLS,
        speed=4,
        duration_ms=300
    ),
    "research_completed": HapticMapping(
        cells=UPPER_CELLS,
        speed=3,
        duration_ms=150
    ),
    
    # Combat
    "combat_started": HapticMapping(
        cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT],
        speed=2,
        duration_ms=100
    ),
    
    # Game end
    "victory": HapticMapping(
        cells=ALL_CELLS,
        speed=6,
        duration_ms=500
    ),
    "defeat": HapticMapping(
        cells=ALL_CELLS,
        speed=8,
        duration_ms=800
    ),
}


def map_event_to_haptics(event_type: str, params: Dict[str, Any] = None) -> List[tuple]:
    """
    Map an AoE2 event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    mapping = EVENT_MAPPINGS.get(event_type)
    if not mapping:
        return []
    
    commands = []
    for cell in mapping.cells:
        commands.append((cell, mapping.speed))
    
    return commands


# =============================================================================
# Capture Age WebSocket Client
# =============================================================================

class CaptureAgeClient:
    """
    WebSocket client for Capture Age.
    
    Capture Age runs a local WebSocket server (default port 50506)
    that streams game events in JSON format.
    
    Note: This is a simplified implementation. Capture Age's actual API
    may vary. Check the Capture Age documentation or Discord for the
    exact WebSocket endpoint and message format.
    """
    
    DEFAULT_HOST = "localhost"
    DEFAULT_PORT = 50506
    RECONNECT_DELAY = 5.0  # Seconds between reconnection attempts
    
    def __init__(
        self,
        host: str = DEFAULT_HOST,
        port: int = DEFAULT_PORT,
        on_event: Callable[[str, Dict], None] = None,
    ):
        self.host = host
        self.port = port
        self.on_event = on_event
        
        self._running = False
        self._websocket = None
        self._task: Optional[asyncio.Task] = None
        self._thread: Optional[Thread] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    def start(self) -> tuple[bool, Optional[str]]:
        """Start the WebSocket client in a background thread."""
        if self._running:
            return False, "Already running"
        
        self._running = True
        self._thread = Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Capture Age client started, connecting to ws://{self.host}:{self.port}")
        return True, None
    
    def stop(self):
        """Stop the WebSocket client."""
        self._running = False
        
        if self._loop and self._task:
            self._loop.call_soon_threadsafe(self._task.cancel)
        
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None
        
        logger.info("Capture Age client stopped")
    
    def _run_loop(self):
        """Run the asyncio event loop in the background thread."""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        
        try:
            self._task = self._loop.create_task(self._connect_loop())
            self._loop.run_until_complete(self._task)
        except asyncio.CancelledError:
            pass
        finally:
            self._loop.close()
    
    async def _connect_loop(self):
        """Main connection loop with reconnection logic."""
        while self._running:
            try:
                await self._connect_and_listen()
            except Exception as e:
                if self._running:
                    logger.warning(f"WebSocket connection failed: {e}")
                    logger.info(f"Retrying in {self.RECONNECT_DELAY}s...")
                    await asyncio.sleep(self.RECONNECT_DELAY)
    
    async def _connect_and_listen(self):
        """Connect to Capture Age WebSocket and listen for events."""
        try:
            import websockets
        except ImportError:
            logger.error("websockets package not installed. Install with: pip install websockets")
            raise RuntimeError("websockets package required for Capture Age integration")
        
        uri = f"ws://{self.host}:{self.port}"
        
        async with websockets.connect(uri) as websocket:
            self._websocket = websocket
            logger.info(f"Connected to Capture Age at {uri}")
            
            while self._running:
                try:
                    message = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=5.0
                    )
                    self._handle_message(message)
                except asyncio.TimeoutError:
                    # Send ping to keep connection alive
                    await websocket.ping()
                except Exception as e:
                    logger.error(f"Error receiving message: {e}")
                    raise
    
    def _handle_message(self, message: str):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            event_type = data.get("type", data.get("event", "unknown"))
            
            if self.on_event:
                self.on_event(event_type, data)
                
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON from Capture Age: {e}")


# =============================================================================
# AoE2 Manager
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class AoE2Manager:
    """
    Manages Age of Empires 2 integration within the daemon.
    
    This class:
    1. Connects to Capture Age WebSocket for game events
    2. Filters events for the specified player
    3. Maps events to haptic commands
    4. Triggers haptic effects via callback
    5. Reports events via callback (for broadcasting to clients)
    
    Usage:
        manager = AoE2Manager(
            on_game_event=my_event_callback,
            on_trigger=my_trigger_callback,
        )
        manager.start(player_number=1)
    """
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._player_number: Optional[int] = None
        self._client: Optional[CaptureAgeClient] = None
        self._running = False
        
        # Stats
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
    
    @property
    def is_running(self) -> bool:
        return self._running
    
    @property
    def player_number(self) -> Optional[int]:
        return self._player_number
    
    @property
    def events_received(self) -> int:
        return self._events_received
    
    @property
    def last_event_ts(self) -> Optional[float]:
        return self._last_event_ts
    
    @property
    def last_event_type(self) -> Optional[str]:
        return self._last_event_type
    
    def start(
        self,
        player_number: int = 1,
        host: str = CaptureAgeClient.DEFAULT_HOST,
        port: int = CaptureAgeClient.DEFAULT_PORT,
    ) -> tuple[bool, Optional[str]]:
        """
        Start the AoE2 integration.
        
        Args:
            player_number: Which player to track (1-8)
            host: Capture Age WebSocket host
            port: Capture Age WebSocket port
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "AoE2 integration already running"
        
        if player_number < 1 or player_number > 8:
            return False, "Player number must be between 1 and 8"
        
        self._player_number = player_number
        
        # Create and start WebSocket client
        self._client = CaptureAgeClient(
            host=host,
            port=port,
            on_event=self._on_capture_age_event,
        )
        
        success, error = self._client.start()
        if not success:
            self._client = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        
        logger.info(f"AoE2 integration started, tracking player {player_number}")
        return True, None
    
    def stop(self) -> bool:
        """Stop the AoE2 integration."""
        if not self._running:
            return False
        
        if self._client:
            self._client.stop()
            self._client = None
        
        self._running = False
        logger.info("AoE2 integration stopped")
        return True
    
    def _on_capture_age_event(self, event_type: str, data: Dict[str, Any]):
        """Called when Capture Age sends a game event."""
        # Filter events for our player
        player = data.get("player", data.get("player_id"))
        if player is not None and player != self._player_number:
            # Event is for a different player
            return
        
        self._events_received += 1
        self._last_event_ts = time.time()
        self._last_event_type = event_type
        
        logger.debug(f"AoE2 event: {event_type} - {data}")
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event_type, data)
        
        # Map to haptics and trigger
        haptic_commands = map_event_to_haptics(event_type, data)
        for cell, speed in haptic_commands:
            self._trigger(cell, speed)
    
    def _trigger(self, cell: int, speed: int):
        """Trigger a haptic effect via callback."""
        if self.on_trigger:
            self.on_trigger(cell, speed)
    
    # =========================================================================
    # Simulated Events (for testing without Capture Age)
    # =========================================================================
    
    def simulate_event(self, event_type: str, params: Dict[str, Any] = None) -> bool:
        """
        Simulate a game event for testing.
        
        This allows testing haptic feedback without Capture Age running.
        
        Args:
            event_type: Type of event to simulate
            params: Optional event parameters
            
        Returns:
            True if event was processed
        """
        if not self._running:
            return False
        
        data = params or {}
        data["player"] = self._player_number
        
        self._on_capture_age_event(event_type, data)
        return True


# =============================================================================
# Public API
# =============================================================================

def get_integration_info() -> Dict[str, Any]:
    """Get information about the AoE2 integration."""
    return {
        "name": "Age of Empires 2: Definitive Edition",
        "description": "Haptic feedback for AoE2:DE via Capture Age",
        "requires": "Capture Age (https://captureage.com/)",
        "supported_events": list(EVENT_MAPPINGS.keys()),
        "setup_instructions": [
            "1. Install Capture Age from https://captureage.com/",
            "2. Start Age of Empires 2: Definitive Edition",
            "3. Start a game (single player, multiplayer, or watch recorded game)",
            "4. Open Capture Age and connect to the game",
            "5. Start the AoE2 integration with your player number",
        ],
    }
