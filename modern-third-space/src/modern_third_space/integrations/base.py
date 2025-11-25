"""
Base class for game integrations.

Game integrations are daemon clients that:
1. Receive telemetry from a game (HTTP, WebSocket, etc.)
2. Map game events to haptic effects
3. Send commands to the vest daemon

This base class provides common functionality for daemon communication.
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Callable

logger = logging.getLogger(__name__)


@dataclass
class DaemonConnection:
    """Manages TCP connection to the vest daemon."""
    
    host: str = "127.0.0.1"
    port: int = 5050
    reader: Optional[asyncio.StreamReader] = None
    writer: Optional[asyncio.StreamWriter] = None
    _connected: bool = False
    
    async def connect(self) -> bool:
        """Connect to the daemon."""
        try:
            self.reader, self.writer = await asyncio.open_connection(
                self.host, self.port
            )
            self._connected = True
            logger.info(f"Connected to daemon at {self.host}:{self.port}")
            return True
        except (ConnectionRefusedError, OSError) as e:
            logger.error(f"Failed to connect to daemon: {e}")
            self._connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from the daemon."""
        if self.writer:
            self.writer.close()
            try:
                await self.writer.wait_closed()
            except Exception:
                pass
        self._connected = False
        logger.info("Disconnected from daemon")
    
    async def send_command(self, cmd: dict) -> Optional[dict]:
        """Send a command and wait for response."""
        if not self._connected or not self.writer:
            logger.warning("Not connected to daemon")
            return None
        
        try:
            message = json.dumps(cmd) + "\n"
            self.writer.write(message.encode())
            await self.writer.drain()
            
            # Read response
            if self.reader:
                line = await asyncio.wait_for(
                    self.reader.readline(),
                    timeout=5.0
                )
                if line:
                    return json.loads(line.decode().strip())
        except asyncio.TimeoutError:
            logger.warning("Timeout waiting for daemon response")
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            self._connected = False
        
        return None
    
    async def send_trigger(self, cell: int, speed: int = 5) -> bool:
        """Send a trigger command to the daemon."""
        response = await self.send_command({
            "cmd": "trigger",
            "cell": cell,
            "speed": speed
        })
        return response is not None and response.get("response") != "error"
    
    async def send_stop(self) -> bool:
        """Send a stop command to the daemon."""
        response = await self.send_command({"cmd": "stop"})
        return response is not None and response.get("response") != "error"
    
    @property
    def is_connected(self) -> bool:
        return self._connected


class BaseGameIntegration(ABC):
    """
    Base class for game integrations.
    
    Subclasses should implement:
    - start(): Start receiving game telemetry
    - stop(): Stop receiving telemetry
    - _handle_game_event(): Process a game event
    """
    
    name: str = "base"
    
    def __init__(
        self,
        daemon_host: str = "127.0.0.1",
        daemon_port: int = 5050,
        on_event: Optional[Callable[[str, dict], None]] = None
    ):
        self.daemon = DaemonConnection(host=daemon_host, port=daemon_port)
        self.on_event = on_event  # Callback for logging/UI
        self._running = False
    
    async def connect_to_daemon(self) -> bool:
        """Connect to the vest daemon."""
        return await self.daemon.connect()
    
    async def disconnect_from_daemon(self):
        """Disconnect from the vest daemon."""
        await self.daemon.disconnect()
    
    def emit_event(self, event_type: str, data: dict):
        """Emit an event for logging/UI purposes."""
        if self.on_event:
            self.on_event(event_type, data)
        logger.debug(f"Event: {event_type} - {data}")
    
    @abstractmethod
    async def start(self):
        """Start the integration (receive game telemetry)."""
        pass
    
    @abstractmethod
    async def stop(self):
        """Stop the integration."""
        pass
    
    @abstractmethod
    async def _handle_game_event(self, event_type: str, data: dict):
        """
        Handle a game event and trigger appropriate haptics.
        
        This is where the event-to-haptic mapping happens.
        """
        pass

