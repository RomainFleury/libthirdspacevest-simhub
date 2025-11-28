"""
Vest Daemon - centralized TCP server for vest control.

This daemon:
- Maintains a single connection to the vest hardware
- Accepts multiple TCP client connections
- Routes commands to the vest
- Broadcasts events to all connected clients

Usage:
    python -m modern_third_space.cli daemon --port 5050
"""

from __future__ import annotations

import asyncio
import json
import logging
import signal
from typing import Any, Dict, Optional

from ..vest import VestController, VestStatus, list_devices, get_effect, all_effects_to_dict, effect_to_dict
from .client_manager import Client, ClientManager
from .protocol import (
    Command,
    CommandType,
    Event,
    Response,
    event_connected,
    event_device_cleared,
    event_device_selected,
    event_disconnected,
    event_effect_triggered,
    event_all_stopped,
    event_error,
    event_cs2_started,
    event_cs2_stopped,
    event_cs2_game_event,
    response_error,
    response_get_selected_device,
    response_list,
    response_ok,
    response_ping,
    response_status,
    response_cs2_start,
    response_cs2_stop,
    response_cs2_status,
    response_cs2_generate_config,
)
from .cs2_manager import CS2Manager, generate_cs2_config
from .alyx_manager import AlyxManager, get_mod_info as get_alyx_mod_info
from .superhot_manager import SuperHotManager
from .gtav_manager import GTAVManager
from .pistolwhip_manager import PistolWhipManager
from .ultrakill_manager import UltrakillManager
from .protocol import (
    event_alyx_started,
    event_alyx_stopped,
    event_alyx_game_event,
    response_alyx_start,
    response_alyx_stop,
    response_alyx_status,
    response_alyx_get_mod_info,
    event_superhot_started,
    event_superhot_stopped,
    event_superhot_game_event,
    response_superhot_status,
    event_gtav_started,
    event_gtav_stopped,
    event_gtav_game_event,
    response_gtav_status,
    event_pistolwhip_started,
    event_pistolwhip_stopped,
    event_pistolwhip_game_event,
    response_pistolwhip_status,
    event_ultrakill_started,
    event_ultrakill_stopped,
    event_ultrakill_game_event,
    response_ultrakill_status,
    # Predefined effects
    event_effect_started,
    event_effect_completed,
    response_play_effect,
    response_list_effects,
)

logger = logging.getLogger(__name__)


class VestDaemon:
    """
    TCP server daemon for vest control.
    
    Manages:
    - TCP server accepting client connections
    - Device selection state
    - Vest controller instance
    - Event broadcasting
    """
    
    DEFAULT_PORT = 5050
    DEFAULT_HOST = "127.0.0.1"
    
    def __init__(self, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
        self.host = host
        self.port = port
        
        # State
        self._selected_device: Optional[Dict[str, Any]] = None
        self._controller: Optional[VestController] = None
        self._clients = ClientManager()
        self._server: Optional[asyncio.Server] = None
        self._running = False
        
        # CS2 GSI manager
        self._cs2_manager = CS2Manager(
            on_game_event=self._on_cs2_game_event,
            on_trigger=self._on_cs2_trigger,
        )
        
        # Half-Life: Alyx manager
        self._alyx_manager = AlyxManager(
            on_game_event=self._on_alyx_game_event,
            on_trigger=self._on_alyx_trigger,
        )
        
        # SUPERHOT VR manager
        self._superhot_manager = SuperHotManager()
        self._superhot_manager.set_event_callback(self._on_superhot_game_event)
        self._superhot_manager.set_trigger_callback(self._on_superhot_trigger)
        
        self._gtav_manager = GTAVManager()
        self._gtav_manager.set_event_callback(self._on_gtav_game_event)
        self._gtav_manager.set_trigger_callback(self._on_gtav_trigger)
        
        self._pistolwhip_manager = PistolWhipManager()
        self._pistolwhip_manager.set_event_callback(self._on_pistolwhip_game_event)
        self._pistolwhip_manager.set_trigger_callback(self._on_pistolwhip_trigger)
        
        self._ultrakill_manager = UltrakillManager()
        self._ultrakill_manager.set_event_callback(self._on_ultrakill_game_event)
        self._ultrakill_manager.set_trigger_callback(self._on_ultrakill_trigger)
        
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    @property
    def selected_device(self) -> Optional[Dict[str, Any]]:
        """Currently selected device."""
        return self._selected_device
    
    @property
    def is_connected(self) -> bool:
        """Whether connected to a vest."""
        if self._controller is None:
            return False
        return self._controller.status().connected
    
    async def start(self) -> None:
        """Start the daemon server."""
        self._running = True
        self._loop = asyncio.get_running_loop()
        self._server = await asyncio.start_server(
            self._handle_client,
            self.host,
            self.port,
        )
        
        addr = self._server.sockets[0].getsockname()
        logger.info(f"Vest daemon listening on {addr[0]}:{addr[1]}")
        print(f"[VEST] Daemon started on {addr[0]}:{addr[1]}")
        
        async with self._server:
            await self._server.serve_forever()
    
    async def stop(self) -> None:
        """Stop the daemon server."""
        self._running = False
        
        # Stop CS2 GSI if running
        if self._cs2_manager.is_running:
            self._cs2_manager.stop()
        
        # Stop Alyx integration if running
        if self._alyx_manager.is_running:
            self._alyx_manager.stop()
        
        # Disconnect from vest
        if self._controller is not None:
            self._controller.disconnect()
            self._controller = None
        
        # Close server
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
        
        logger.info("Vest daemon stopped")
        print("🛑 Vest daemon stopped")
    
    async def _handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        """Handle a client connection."""
        client = await self._clients.add_client(writer)
        addr = writer.get_extra_info("peername")
        logger.info(f"Client {client.id} connected from {addr}")
        print(f"📱 Client {client.id} connected from {addr}")
        
        try:
            while self._running:
                # Read a line (command)
                try:
                    line = await asyncio.wait_for(
                        reader.readline(),
                        timeout=None,  # No timeout, wait indefinitely
                    )
                except asyncio.CancelledError:
                    break
                
                if not line:
                    # Client disconnected
                    break
                
                # Parse and handle command
                try:
                    line_str = line.decode().strip()
                    if not line_str:
                        continue
                    
                    command = Command.from_json(line_str)
                    response = await self._handle_command(client, command)
                    
                    # Send response to this client
                    if response:
                        await self._clients.send_to_client(client, response.to_json())
                        
                except json.JSONDecodeError as e:
                    error_resp = response_error(f"Invalid JSON: {e}")
                    await self._clients.send_to_client(client, error_resp.to_json())
                except Exception as e:
                    logger.exception(f"Error handling command from {client.id}")
                    error_resp = response_error(str(e))
                    await self._clients.send_to_client(client, error_resp.to_json())
        
        finally:
            await self._clients.remove_client(client)
            try:
                writer.close()
                await writer.wait_closed()
            except (BrokenPipeError, ConnectionResetError, OSError):
                # Client already disconnected - this is normal
                pass
            except Exception as e:
                logger.debug(f"Error closing client connection: {e}")
            logger.info(f"Client {client.id} disconnected")
            print(f"📴 Client {client.id} disconnected")
    
    async def _handle_command(self, client: Client, command: Command) -> Optional[Response]:
        """
        Handle a command and return a response.
        
        Also broadcasts events as side effects.
        """
        if not command.is_valid():
            return response_error(f"Unknown command: {command.cmd}", command.req_id)
        
        cmd_type = CommandType(command.cmd)
        
        # Health check
        if cmd_type == CommandType.PING:
            return await self._cmd_ping(command)
        
        # Device discovery & selection
        if cmd_type == CommandType.LIST:
            return await self._cmd_list(command)
        
        if cmd_type == CommandType.SELECT_DEVICE:
            return await self._cmd_select_device(command)
        
        if cmd_type == CommandType.GET_SELECTED_DEVICE:
            return await self._cmd_get_selected_device(command)
        
        if cmd_type == CommandType.CLEAR_DEVICE:
            return await self._cmd_clear_device(command)
        
        # Vest control (requires selected device)
        if cmd_type == CommandType.CONNECT:
            return await self._cmd_connect(command)
        
        if cmd_type == CommandType.DISCONNECT:
            return await self._cmd_disconnect(command)
        
        if cmd_type == CommandType.TRIGGER:
            return await self._cmd_trigger(command)
        
        if cmd_type == CommandType.STOP:
            return await self._cmd_stop(command)
        
        if cmd_type == CommandType.STATUS:
            return await self._cmd_status(command)
        
        # CS2 GSI commands
        if cmd_type == CommandType.CS2_START:
            return await self._cmd_cs2_start(command)
        
        if cmd_type == CommandType.CS2_STOP:
            return await self._cmd_cs2_stop(command)
        
        if cmd_type == CommandType.CS2_STATUS:
            return await self._cmd_cs2_status(command)
        
        if cmd_type == CommandType.CS2_GENERATE_CONFIG:
            return await self._cmd_cs2_generate_config(command)
        
        # Half-Life: Alyx commands
        if cmd_type == CommandType.ALYX_START:
            return await self._cmd_alyx_start(command)
        
        if cmd_type == CommandType.ALYX_STOP:
            return await self._cmd_alyx_stop(command)
        
        if cmd_type == CommandType.ALYX_STATUS:
            return await self._cmd_alyx_status(command)
        
        if cmd_type == CommandType.ALYX_GET_MOD_INFO:
            return await self._cmd_alyx_get_mod_info(command)
        
        # SUPERHOT VR commands
        if cmd_type == CommandType.SUPERHOT_EVENT:
            return await self._cmd_superhot_event(command)
        
        if cmd_type == CommandType.SUPERHOT_START:
            return await self._cmd_superhot_start(command)
        
        if cmd_type == CommandType.SUPERHOT_STOP:
            return await self._cmd_superhot_stop(command)
        
        if cmd_type == CommandType.SUPERHOT_STATUS:
            return await self._cmd_superhot_status(command)
        
        # GTA V commands
        if cmd_type == CommandType.GTAV_EVENT:
            return await self._cmd_gtav_event(command)
        
        if cmd_type == CommandType.GTAV_START:
            return await self._cmd_gtav_start(command)
        
        if cmd_type == CommandType.GTAV_STOP:
            return await self._cmd_gtav_stop(command)
        
        if cmd_type == CommandType.GTAV_STATUS:
            return await self._cmd_gtav_status(command)
        
        # Pistol Whip commands
        if cmd_type == CommandType.PISTOLWHIP_EVENT:
            return await self._cmd_pistolwhip_event(command)
        
        if cmd_type == CommandType.PISTOLWHIP_START:
            return await self._cmd_pistolwhip_start(command)
        
        if cmd_type == CommandType.PISTOLWHIP_STOP:
            return await self._cmd_pistolwhip_stop(command)
        
        if cmd_type == CommandType.PISTOLWHIP_STATUS:
            return await self._cmd_pistolwhip_status(command)
        
        # ULTRAKILL commands
        if cmd_type == CommandType.ULTRAKILL_EVENT:
            return await self._cmd_ultrakill_event(command)
        
        if cmd_type == CommandType.ULTRAKILL_START:
            return await self._cmd_ultrakill_start(command)
        
        if cmd_type == CommandType.ULTRAKILL_STOP:
            return await self._cmd_ultrakill_stop(command)
        
        if cmd_type == CommandType.ULTRAKILL_STATUS:
            return await self._cmd_ultrakill_status(command)
        
        # Predefined effects commands
        if cmd_type == CommandType.PLAY_EFFECT:
            return await self._cmd_play_effect(command)
        
        if cmd_type == CommandType.LIST_EFFECTS:
            return await self._cmd_list_effects(command)
        
        if cmd_type == CommandType.STOP_EFFECT:
            return await self._cmd_stop_effect(command)
        
        return response_error(f"Command not implemented: {command.cmd}", command.req_id)
    
    # -------------------------------------------------------------------------
    # Command handlers
    # -------------------------------------------------------------------------
    
    async def _cmd_ping(self, command: Command) -> Response:
        """
        Health check - returns daemon state summary.
        
        Useful for clients to check if daemon is alive and get
        a quick overview of the current state.
        """
        return response_ping(
            connected=self.is_connected,
            has_device_selected=self._selected_device is not None,
            client_count=self._clients.client_count,
            req_id=command.req_id,
        )
    
    async def _cmd_list(self, command: Command) -> Response:
        """List available devices."""
        devices = list_devices()
        return response_list(devices, command.req_id)
    
    async def _cmd_select_device(self, command: Command) -> Response:
        """Select a device to use."""
        # Find the device
        devices = list_devices()
        selected = None
        
        if command.serial:
            # Select by serial
            for d in devices:
                if d.get("serial_number") == command.serial:
                    selected = d
                    break
        elif command.bus is not None and command.address is not None:
            # Select by bus + address
            for d in devices:
                if d.get("bus") == command.bus and d.get("address") == command.address:
                    selected = d
                    break
        else:
            return response_error("Must specify bus+address or serial", command.req_id)
        
        if selected is None:
            return response_error("Device not found", command.req_id)
        
        # Disconnect from previous device if any
        if self._controller is not None:
            self._controller.disconnect()
            self._controller = None
        
        self._selected_device = selected
        
        # Broadcast device selected event
        await self._clients.broadcast(event_device_selected(selected))
        
        return response_ok(command.req_id)
    
    async def _cmd_get_selected_device(self, command: Command) -> Response:
        """Get the currently selected device."""
        return response_get_selected_device(self._selected_device, command.req_id)
    
    async def _cmd_clear_device(self, command: Command) -> Response:
        """Clear device selection."""
        # Disconnect first
        if self._controller is not None:
            self._controller.disconnect()
            self._controller = None
        
        self._selected_device = None
        
        # Broadcast device cleared event
        await self._clients.broadcast(event_device_cleared())
        
        return response_ok(command.req_id)
    
    async def _cmd_connect(self, command: Command) -> Response:
        """Connect to the selected device."""
        if self._selected_device is None:
            return response_error("No device selected", command.req_id)
        
        # Create controller and connect
        self._controller = VestController()
        status = self._controller.connect_to_device({
            "bus": self._selected_device.get("bus"),
            "address": self._selected_device.get("address"),
        })
        
        if status.connected:
            # Broadcast connected event
            await self._clients.broadcast(event_connected(self._selected_device))
            return response_ok(command.req_id)
        else:
            error_msg = status.last_error or "Failed to connect"
            await self._clients.broadcast(event_error(error_msg))
            return response_error(error_msg, command.req_id)
    
    async def _cmd_disconnect(self, command: Command) -> Response:
        """Disconnect from the vest."""
        if self._controller is not None:
            self._controller.disconnect()
            self._controller = None
        
        # Broadcast disconnected event
        await self._clients.broadcast(event_disconnected())
        
        return response_ok(command.req_id)
    
    async def _cmd_trigger(self, command: Command) -> Response:
        """Trigger an effect."""
        if self._selected_device is None:
            return response_error("No device selected", command.req_id)
        
        if command.cell is None or command.speed is None:
            return response_error("Must specify cell and speed", command.req_id)
        
        # Auto-connect if needed
        if self._controller is None or not self._controller.status().connected:
            self._controller = VestController()
            status = self._controller.connect_to_device({
                "bus": self._selected_device.get("bus"),
                "address": self._selected_device.get("address"),
            })
            if status.connected:
                await self._clients.broadcast(event_connected(self._selected_device))
        
        # Trigger the effect
        if self._controller is None:
            return response_error("Not connected to vest", command.req_id)
        
        success = self._controller.trigger_effect(command.cell, command.speed)
        
        if success:
            # Broadcast effect triggered event
            await self._clients.broadcast(event_effect_triggered(command.cell, command.speed))
            return response_ok(command.req_id)
        else:
            error_msg = self._controller.status().last_error or "Failed to trigger effect"
            return response_error(error_msg, command.req_id)
    
    async def _cmd_stop(self, command: Command) -> Response:
        """Stop all effects."""
        if self._controller is not None:
            self._controller.stop_all()
        
        # Broadcast all stopped event
        await self._clients.broadcast(event_all_stopped())
        
        return response_ok(command.req_id)
    
    async def _cmd_status(self, command: Command) -> Response:
        """Get connection status."""
        if self._controller is None:
            return response_status(
                connected=False,
                device=self._selected_device,
                req_id=command.req_id,
            )
        
        status = self._controller.status()
        device_info = None
        if status.connected:
            device_info = {
                "bus": status.device_bus,
                "address": status.device_address,
                "serial_number": status.device_serial_number,
                "vendor_id": status.device_vendor_id,
                "product_id": status.device_product_id,
            }
        
        return response_status(
            connected=status.connected,
            device=device_info,
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # CS2 GSI command handlers
    # -------------------------------------------------------------------------
    
    async def _cmd_cs2_start(self, command: Command) -> Response:
        """Start the CS2 GSI server."""
        gsi_port = command.gsi_port or CS2Manager.DEFAULT_GSI_PORT
        
        success, error = self._cs2_manager.start(gsi_port)
        
        if success:
            # Broadcast CS2 started event
            await self._clients.broadcast(event_cs2_started(gsi_port))
            print(f"[CS2] GSI started on port {gsi_port}")
        
        return response_cs2_start(
            success=success,
            gsi_port=gsi_port,
            error=error,
            req_id=command.req_id,
        )
    
    async def _cmd_cs2_stop(self, command: Command) -> Response:
        """Stop the CS2 GSI server."""
        success = self._cs2_manager.stop()
        
        if success:
            # Broadcast CS2 stopped event
            await self._clients.broadcast(event_cs2_stopped())
            print("[CS2] GSI stopped")
        
        return response_cs2_stop(success=success, req_id=command.req_id)
    
    async def _cmd_cs2_status(self, command: Command) -> Response:
        """Get CS2 GSI status."""
        return response_cs2_status(
            running=self._cs2_manager.is_running,
            gsi_port=self._cs2_manager.gsi_port,
            events_received=self._cs2_manager.events_received,
            last_event_ts=self._cs2_manager.last_event_ts,
            req_id=command.req_id,
        )
    
    async def _cmd_cs2_generate_config(self, command: Command) -> Response:
        """Generate CS2 GSI config file content."""
        gsi_port = command.gsi_port or CS2Manager.DEFAULT_GSI_PORT
        config_content = generate_cs2_config(gsi_port)
        
        return response_cs2_generate_config(
            config_content=config_content,
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # CS2 GSI callbacks (called from HTTP thread)
    # -------------------------------------------------------------------------
    
    def _on_cs2_game_event(self, event_type: str, amount: Optional[int], intensity: Optional[int]):
        """
        Called when CS2 detects a game event.
        
        This is called from the HTTP server thread, so we need to schedule
        the broadcast on the event loop.
        """
        if self._loop is None:
            return
        
        event = event_cs2_game_event(event_type, amount, intensity)
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event),
            self._loop,
        )
    
    def _on_cs2_trigger(self, cell: int, speed: int):
        """
        Called when CS2 wants to trigger a haptic effect.
        
        This performs the actual vest trigger synchronously since
        the vest controller is thread-safe for simple operations.
        """
        if self._selected_device is None:
            return
        
        # Auto-connect if needed
        if self._controller is None or not self._controller.status().connected:
            self._controller = VestController()
            self._controller.connect_to_device({
                "bus": self._selected_device.get("bus"),
                "address": self._selected_device.get("address"),
            })
        
        if self._controller is not None:
            self._controller.trigger_effect(cell, speed)
    
    # -------------------------------------------------------------------------
    # Half-Life: Alyx command handlers
    # -------------------------------------------------------------------------
    
    async def _cmd_alyx_start(self, command: Command) -> Response:
        """Start the Alyx console log watcher."""
        log_path = command.log_path  # Can be None for auto-detect
        
        success, error = self._alyx_manager.start(log_path)
        
        if success:
            actual_path = str(self._alyx_manager.log_path) if self._alyx_manager.log_path else None
            # Broadcast Alyx started event
            await self._clients.broadcast(event_alyx_started(actual_path or ""))
            print(f"[ALYX] Integration started, watching: {actual_path}")
        
        return response_alyx_start(
            success=success,
            log_path=str(self._alyx_manager.log_path) if self._alyx_manager.log_path else None,
            error=error,
            req_id=command.req_id,
        )
    
    async def _cmd_alyx_stop(self, command: Command) -> Response:
        """Stop the Alyx console log watcher."""
        success = self._alyx_manager.stop()
        
        if success:
            # Broadcast Alyx stopped event
            await self._clients.broadcast(event_alyx_stopped())
            print("[ALYX] Integration stopped")
        
        return response_alyx_stop(success=success, req_id=command.req_id)
    
    async def _cmd_alyx_status(self, command: Command) -> Response:
        """Get Alyx integration status."""
        return response_alyx_status(
            running=self._alyx_manager.is_running,
            log_path=str(self._alyx_manager.log_path) if self._alyx_manager.log_path else None,
            events_received=self._alyx_manager.events_received,
            last_event_ts=self._alyx_manager.last_event_ts,
            req_id=command.req_id,
        )
    
    async def _cmd_alyx_get_mod_info(self, command: Command) -> Response:
        """Get Alyx mod info (download URLs, install instructions)."""
        mod_info = get_alyx_mod_info()
        return response_alyx_get_mod_info(
            mod_info=mod_info,
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # Alyx callbacks (called from watcher thread)
    # -------------------------------------------------------------------------
    
    def _on_alyx_game_event(self, event_type: str, params: dict):
        """
        Called when Alyx detects a game event.
        
        This is called from the file watcher thread, so we need to schedule
        the broadcast on the event loop.
        """
        if self._loop is None:
            return
        
        event = event_alyx_game_event(event_type, params)
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event),
            self._loop,
        )
    
    def _on_alyx_trigger(self, cell: int, speed: int):
        """
        Called when Alyx wants to trigger a haptic effect.
        
        This performs the actual vest trigger synchronously since
        the vest controller is thread-safe for simple operations.
        """
        if self._selected_device is None:
            return
        
        # Auto-connect if needed
        if self._controller is None or not self._controller.status().connected:
            self._controller = VestController()
            self._controller.connect_to_device({
                "bus": self._selected_device.get("bus"),
                "address": self._selected_device.get("address"),
            })
        
        if self._controller is not None:
            self._controller.trigger_effect(cell, speed)
            
        # Broadcast effect triggered event
        if self._loop is not None:
            event = event_effect_triggered(cell, speed)
            asyncio.run_coroutine_threadsafe(
                self._clients.broadcast(event),
                self._loop,
            )
    
    # -------------------------------------------------------------------------
    # SUPERHOT VR command handlers
    # -------------------------------------------------------------------------
    
    async def _cmd_superhot_event(self, command: Command) -> Response:
        """
        Process a SUPERHOT VR game event from the MelonLoader mod.
        
        This is the main entry point for events from the game.
        """
        if not command.event:
            return response_error("Missing event name", command.req_id)
        
        success = self._superhot_manager.process_event(
            event_name=command.event,
            hand=command.hand,
            priority=command.priority or 0,
        )
        
        if success:
            return response_ok(command.req_id)
        else:
            return response_error(f"Failed to process event: {command.event}", command.req_id)
    
    async def _cmd_superhot_start(self, command: Command) -> Response:
        """Enable SUPERHOT VR event processing."""
        self._superhot_manager.enable()
        await self._clients.broadcast(event_superhot_started())
        return response_ok(command.req_id)
    
    async def _cmd_superhot_stop(self, command: Command) -> Response:
        """Disable SUPERHOT VR event processing."""
        self._superhot_manager.disable()
        await self._clients.broadcast(event_superhot_stopped())
        return response_ok(command.req_id)
    
    async def _cmd_superhot_status(self, command: Command) -> Response:
        """Get SUPERHOT VR integration status."""
        status = self._superhot_manager.get_status()
        return response_superhot_status(
            enabled=status["enabled"],
            events_received=status["events_received"],
            last_event_ts=status["last_event_ts"],
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # GTA V command handlers
    # -------------------------------------------------------------------------
    
    async def _cmd_gtav_event(self, command: Command) -> Response:
        """
        Process a GTA V game event from the Script Hook V .NET mod.
        
        This is the main entry point for events from the game.
        """
        if not command.event:
            return response_error("Missing event name", command.req_id)
        
        success = self._gtav_manager.process_event(
            event_name=command.event,
            angle=command.angle,
            damage=command.damage,
            health_remaining=command.health_remaining,
            cause=command.cause,
        )
        
        if success:
            return response_ok(command.req_id)
        else:
            return response_error(f"Failed to process event: {command.event}", command.req_id)
    
    async def _cmd_gtav_start(self, command: Command) -> Response:
        """Enable GTA V event processing."""
        self._gtav_manager.enable()
        await self._clients.broadcast(event_gtav_started())
        return response_ok(command.req_id)
    
    async def _cmd_gtav_stop(self, command: Command) -> Response:
        """Disable GTA V event processing."""
        self._gtav_manager.disable()
        await self._clients.broadcast(event_gtav_stopped())
        return response_ok(command.req_id)
    
    async def _cmd_gtav_status(self, command: Command) -> Response:
        """Get GTA V integration status."""
        status = self._gtav_manager.get_status()
        return response_gtav_status(
            enabled=status["enabled"],
            events_received=status["events_received"],
            last_event_ts=status["last_event_ts"],
            last_event_type=status.get("last_event_type"),
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # Pistol Whip command handlers
    # -------------------------------------------------------------------------
    
    async def _cmd_pistolwhip_event(self, command: Command) -> Response:
        """
        Process a Pistol Whip game event from the MelonLoader mod.
        
        This is the main entry point for events from the game.
        """
        if not command.event:
            return response_error("Missing event name", command.req_id)
        
        success = self._pistolwhip_manager.process_event(
            event_name=command.event,
            hand=command.hand,
            priority=command.priority or 0,
        )
        
        if success:
            return response_ok(command.req_id)
        else:
            return response_error(f"Failed to process event: {command.event}", command.req_id)
    
    async def _cmd_pistolwhip_start(self, command: Command) -> Response:
        """Enable Pistol Whip event processing."""
        self._pistolwhip_manager.enable()
        await self._clients.broadcast(event_pistolwhip_started())
        return response_ok(command.req_id)
    
    async def _cmd_pistolwhip_stop(self, command: Command) -> Response:
        """Disable Pistol Whip event processing."""
        self._pistolwhip_manager.disable()
        await self._clients.broadcast(event_pistolwhip_stopped())
        return response_ok(command.req_id)
    
    async def _cmd_pistolwhip_status(self, command: Command) -> Response:
        """Get Pistol Whip integration status."""
        status = self._pistolwhip_manager.get_status()
        return response_pistolwhip_status(
            enabled=status["enabled"],
            events_received=status["events_received"],
            last_event_ts=status["last_event_ts"],
            last_event_type=status.get("last_event_type"),
            req_id=command.req_id,
        )

    # -------------------------------------------------------------------------
    # ULTRAKILL command handlers
    # -------------------------------------------------------------------------

    async def _cmd_ultrakill_event(self, command: Command) -> Response:
        """
        Process an ULTRAKILL game event from the BepInEx mod.
        
        This is the main entry point for events from the game.
        """
        if not command.event:
            return response_error("Missing event name", command.req_id)
        
        success = self._ultrakill_manager.process_event(
            event_name=command.event,
            direction=command.direction,
            intensity=command.intensity,
        )
        
        if success:
            return response_ok(command.req_id)
        else:
            return response_error(f"Failed to process event: {command.event}", command.req_id)

    async def _cmd_ultrakill_start(self, command: Command) -> Response:
        """Enable ULTRAKILL event processing."""
        self._ultrakill_manager.enable()
        await self._clients.broadcast(event_ultrakill_started())
        return response_ok(command.req_id)

    async def _cmd_ultrakill_stop(self, command: Command) -> Response:
        """Disable ULTRAKILL event processing."""
        self._ultrakill_manager.disable()
        await self._clients.broadcast(event_ultrakill_stopped())
        return response_ok(command.req_id)

    async def _cmd_ultrakill_status(self, command: Command) -> Response:
        """Get ULTRAKILL integration status."""
        status = self._ultrakill_manager.get_status()
        return response_ultrakill_status(
            enabled=status["enabled"],
            events_received=status["events_received"],
            last_event_ts=status["last_event_ts"],
            last_event_type=status.get("last_event_type"),
            req_id=command.req_id,
        )

    # -------------------------------------------------------------------------
    # Pistol Whip callbacks
    # -------------------------------------------------------------------------
    
    def _on_pistolwhip_game_event(self, event_type: str, event_name: str, hand: Optional[str]):
        """
        Called when Pistol Whip manager processes a game event.
        
        Broadcasts the event to all connected clients for UI display.
        """
        if self._loop is None:
            return
        
        event = event_pistolwhip_game_event(event_name, hand)
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event),
            self._loop,
        )
    
    def _on_pistolwhip_trigger(self, cell: int, speed: int):
        """
        Called when Pistol Whip manager wants to trigger a haptic effect.
        
        Routes the trigger command to the selected vest device.
        """
        if self._loop is None:
            return
        
        asyncio.run_coroutine_threadsafe(
            self._cmd_trigger(Command(cmd="trigger", cell=cell, speed=speed)),
            self._loop,
        )

    # -------------------------------------------------------------------------
    # ULTRAKILL callbacks
    # -------------------------------------------------------------------------

    def _on_ultrakill_game_event(self, event_type: str, event_name: str, direction: Optional[str]):
        """
        Called when ULTRAKILL manager processes a game event.
        
        Broadcasts the event to all connected clients for UI display.
        """
        if self._loop is None:
            return
        
        event = event_ultrakill_game_event(event_name, direction)
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event),
            self._loop,
        )

    def _on_ultrakill_trigger(self, cell: int, speed: int):
        """
        Called when ULTRAKILL manager wants to trigger a haptic effect.
        
        Routes the trigger command to the selected vest device.
        """
        if self._loop is None:
            return
        
        asyncio.run_coroutine_threadsafe(
            self._cmd_trigger(Command(cmd="trigger", cell=cell, speed=speed)),
            self._loop,
        )
    
    # -------------------------------------------------------------------------
    # GTA V callbacks
    # -------------------------------------------------------------------------
    
    def _on_gtav_game_event(self, event_type: str, params: Dict[str, Any]):
        """
        Called when GTA V manager processes a game event.
        
        Broadcasts the event to all connected clients for UI display.
        """
        if self._loop is None:
            return
        
        event = event_gtav_game_event(params)
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event),
            self._loop,
        )
    
    def _on_gtav_trigger(self, cell: int, speed: int):
        """
        Called when GTA V manager wants to trigger a haptic effect.
        
        Routes the trigger command to the selected vest device.
        """
        if self._loop is None:
            return
        
        asyncio.run_coroutine_threadsafe(
            self._cmd_trigger(Command(cmd="trigger", cell=cell, speed=speed)),
            self._loop,
        )
    
    # -------------------------------------------------------------------------
    # SUPERHOT VR callbacks
    # -------------------------------------------------------------------------
    
    def _on_superhot_game_event(self, event_type: str, event_name: str, hand: Optional[str]):
        """
        Called when SUPERHOT manager processes a game event.
        
        Broadcasts the event to all connected clients for UI display.
        """
        if self._loop is None:
            return
        
        event = event_superhot_game_event(event_name, hand)
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event),
            self._loop,
        )
    
    def _on_superhot_trigger(self, cell: int, speed: int):
        """
        Called when SUPERHOT manager wants to trigger a haptic effect.
        
        This performs the actual vest trigger.
        """
        if self._selected_device is None:
            return
        
        # Auto-connect if needed
        if self._controller is None or not self._controller.status().connected:
            self._controller = VestController()
            self._controller.connect_to_device({
                "bus": self._selected_device.get("bus"),
                "address": self._selected_device.get("address"),
            })
        
        if self._controller is not None:
            self._controller.trigger_effect(cell, speed)
            
        # Broadcast effect triggered event
        if self._loop is not None:
            event = event_effect_triggered(cell, speed)
            asyncio.run_coroutine_threadsafe(
                self._clients.broadcast(event),
                self._loop,
            )
    
    # -------------------------------------------------------------------------
    # Predefined Effects command handlers
    # -------------------------------------------------------------------------
    
    async def _cmd_play_effect(self, command: Command) -> Response:
        """
        Play a predefined effect.
        
        The effect will run asynchronously, triggering cells according to
        its step pattern.
        """
        if not command.effect_name:
            return response_error("Missing effect_name", command.req_id)
        
        effect = get_effect(command.effect_name)
        if effect is None:
            return response_error(f"Unknown effect: {command.effect_name}", command.req_id)
        
        # Check if we have a device
        if self._selected_device is None:
            return response_error("No device selected", command.req_id)
        
        # Auto-connect if needed
        if self._controller is None or not self._controller.status().connected:
            self._controller = VestController()
            status = self._controller.connect_to_device({
                "bus": self._selected_device.get("bus"),
                "address": self._selected_device.get("address"),
            })
            if not status.connected:
                return response_error("Failed to connect to vest", command.req_id)
        
        # Start the effect playback in background
        asyncio.create_task(self._play_effect_sequence(effect))
        
        return response_play_effect(
            success=True,
            effect_name=command.effect_name,
            req_id=command.req_id,
        )
    
    async def _play_effect_sequence(self, effect) -> None:
        """
        Play an effect's step sequence.
        
        This runs asynchronously, triggering cells according to the effect's
        timing pattern.
        """
        from ..vest.effects import Effect
        
        # Broadcast effect started
        await self._clients.broadcast(event_effect_started(effect.name))
        
        try:
            for step in effect.steps:
                # Trigger all cells in this step
                for cell in step.cells:
                    if self._controller is not None:
                        self._controller.trigger_effect(cell, step.speed)
                    # Broadcast individual trigger
                    await self._clients.broadcast(event_effect_triggered(cell, step.speed))
                
                # Wait for step duration
                await asyncio.sleep(step.duration_ms / 1000.0)
                
                # Stop cells (speed 0)
                for cell in step.cells:
                    if self._controller is not None:
                        self._controller.trigger_effect(cell, 0)
                
                # Wait for delay before next step
                if step.delay_ms > 0:
                    await asyncio.sleep(step.delay_ms / 1000.0)
        
        finally:
            # Broadcast effect completed
            await self._clients.broadcast(event_effect_completed(effect.name))
    
    async def _cmd_list_effects(self, command: Command) -> Response:
        """
        List all available predefined effects.
        
        Returns effects organized by category.
        """
        effects_data = all_effects_to_dict()
        return response_list_effects(
            effects=effects_data["effects"],
            categories=effects_data["categories"],
            req_id=command.req_id,
        )
    
    async def _cmd_stop_effect(self, command: Command) -> Response:
        """
        Stop all cells (emergency stop for effects).
        
        This stops all cells immediately.
        """
        if self._controller is not None:
            for cell in range(8):
                self._controller.trigger_effect(cell, 0)
        
        await self._clients.broadcast(event_all_stopped())
        return response_ok(command.req_id)


def run_daemon(
    host: str = VestDaemon.DEFAULT_HOST,
    port: int = VestDaemon.DEFAULT_PORT,
    check_existing: bool = True,
) -> None:
    """
    Run the vest daemon (blocking).
    
    This is the main entry point for running the daemon.
    
    Args:
        host: Host to bind to
        port: Port to listen on
        check_existing: If True, check if daemon is already running
    """
    from .lifecycle import (
        get_daemon_status,
        write_pid_file,
        remove_pid_file,
    )
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    
    # Check if daemon is already running
    if check_existing:
        is_running, pid, msg = get_daemon_status(host, port)
        if is_running:
            print(f"[ERROR] {msg}")
            print("Use 'daemon stop' to stop it first, or use a different port.")
            return
    
    daemon = VestDaemon(host=host, port=port)
    
    # Write PID file
    pid_file = write_pid_file(port)
    logger.info(f"PID file: {pid_file}")
    
    # Handle graceful shutdown
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    def shutdown_handler():
        print("\n⏹️  Shutting down...")
        loop.create_task(daemon.stop())
    
    # Register signal handlers
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, shutdown_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            signal.signal(sig, lambda s, f: shutdown_handler())
    
    try:
        loop.run_until_complete(daemon.start())
    except KeyboardInterrupt:
        pass
    finally:
        loop.run_until_complete(daemon.stop())
        loop.close()
        # Clean up PID file
        remove_pid_file(port)
        logger.info("PID file removed")

