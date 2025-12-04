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
from .vest_registry import VestControllerRegistry
from .player_manager import PlayerManager
from .game_player_mapping import GamePlayerMapping
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
    event_device_connected,
    event_device_disconnected,
    event_main_device_changed,
    event_mock_device_created,
    event_mock_device_removed,
    event_player_assigned,
    event_player_unassigned,
    event_game_player_mapping_changed,
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
    response_list_connected_devices,
    response_set_main_device,
    response_disconnect_device,
    response_create_mock_device,
    response_remove_mock_device,
    response_create_player,
    response_assign_player,
    response_unassign_player,
    response_list_players,
    response_get_player_device,
    response_set_game_player_mapping,
    response_clear_game_player_mapping,
    response_list_game_player_mappings,
)
from .cs2_manager import CS2Manager, generate_cs2_config
from .alyx_manager import AlyxManager, get_mod_info as get_alyx_mod_info
from .superhot_manager import SuperHotManager
from .gtav_manager import GTAVManager
from .pistolwhip_manager import PistolWhipManager
from .starcitizen_manager import StarCitizenManager
from .l4d2_manager import L4D2Manager
from .hl2dm_manager import HL2DMManager
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
    event_starcitizen_started,
    event_starcitizen_stopped,
    event_starcitizen_game_event,
    response_starcitizen_start,
    response_starcitizen_stop,
    response_starcitizen_status,
    event_l4d2_started,
    event_l4d2_stopped,
    event_l4d2_game_event,
    response_l4d2_start,
    response_l4d2_stop,
    response_l4d2_status,
    # Half-Life 2: Deathmatch integration
    event_hl2dm_started,
    event_hl2dm_stopped,
    event_hl2dm_game_event,
    response_hl2dm_start,
    response_hl2dm_stop,
    response_hl2dm_status,
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
        
        # State - Multi-vest support
        self._registry = VestControllerRegistry()
        self._player_manager = PlayerManager()
        self._game_mapping = GamePlayerMapping()
        # Keep _selected_device for backward compatibility (refers to main device)
        self._selected_device: Optional[Dict[str, Any]] = None
        # Legacy: _controller now refers to main device controller (for backward compatibility)
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
        
        # Star Citizen manager
        self._starcitizen_manager = StarCitizenManager(
            on_game_event=self._on_starcitizen_game_event,
            on_trigger=self._on_starcitizen_trigger,
        )
        
        # Left 4 Dead 2 manager
        self._l4d2_manager = L4D2Manager(
            on_game_event=self._on_l4d2_game_event,
            on_trigger=self._on_l4d2_trigger,
        )
        
        # Half-Life 2: Deathmatch manager
        self._hl2dm_manager = HL2DMManager(
            on_game_event=self._on_hl2dm_game_event,
            on_trigger=self._on_hl2dm_trigger,
        )
        
        self._loop: Optional[asyncio.AbstractEventLoop] = None
    
    @property
    def selected_device(self) -> Optional[Dict[str, Any]]:
        """Currently selected device."""
        return self._selected_device
    
    @property
    def is_connected(self) -> bool:
        """Whether connected to a vest (main device)."""
        controller = self._registry.get_controller()
        return controller is not None and controller.status().connected
    
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
        
        # Stop L4D2 integration if running
        if self._l4d2_manager.is_running:
            self._l4d2_manager.stop()
        
        # Stop HL2DM integration if running
        if self._hl2dm_manager.is_running:
            self._hl2dm_manager.stop()
        
        # Disconnect from all vests
        for device_id in list(self._registry._controllers.keys()):
            self._registry.remove_device(device_id)
        self._controller = None
        self._selected_device = None
        
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
                # Check if writer is already closed before attempting to close
                if not writer.is_closing() and not writer.transport.is_closing():
                    writer.close()
                    try:
                        await writer.wait_closed()
                    except (BrokenPipeError, ConnectionResetError, OSError, RuntimeError):
                        # Client already disconnected or transport closed - this is normal
                        pass
            except (BrokenPipeError, ConnectionResetError, OSError, RuntimeError, AttributeError):
                # Client already disconnected or transport already closed - this is normal
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
        
        # Multi-vest commands
        if cmd_type == CommandType.LIST_CONNECTED_DEVICES:
            return await self._cmd_list_connected_devices(command)
        
        if cmd_type == CommandType.SET_MAIN_DEVICE:
            return await self._cmd_set_main_device(command)
        
        if cmd_type == CommandType.DISCONNECT_DEVICE:
            return await self._cmd_disconnect_device(command)
        
        # Mock device commands
        if cmd_type == CommandType.CREATE_MOCK_DEVICE:
            return await self._cmd_create_mock_device(command)
        
        if cmd_type == CommandType.REMOVE_MOCK_DEVICE:
            return await self._cmd_remove_mock_device(command)
        
        # Player management commands
        if cmd_type == CommandType.CREATE_PLAYER:
            return await self._cmd_create_player(command)
        
        if cmd_type == CommandType.ASSIGN_PLAYER:
            return await self._cmd_assign_player(command)
        
        if cmd_type == CommandType.UNASSIGN_PLAYER:
            return await self._cmd_unassign_player(command)
        
        if cmd_type == CommandType.LIST_PLAYERS:
            return await self._cmd_list_players(command)
        
        if cmd_type == CommandType.GET_PLAYER_DEVICE:
            return await self._cmd_get_player_device(command)
        
        # Game-specific player mapping commands
        if cmd_type == CommandType.SET_GAME_PLAYER_MAPPING:
            return await self._cmd_set_game_player_mapping(command)
        
        if cmd_type == CommandType.CLEAR_GAME_PLAYER_MAPPING:
            return await self._cmd_clear_game_player_mapping(command)
        
        if cmd_type == CommandType.LIST_GAME_PLAYER_MAPPINGS:
            return await self._cmd_list_game_player_mappings(command)
        
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
        
        # Star Citizen commands
        if cmd_type == CommandType.STARCITIZEN_START:
            return await self._cmd_starcitizen_start(command)
        
        if cmd_type == CommandType.STARCITIZEN_STOP:
            return await self._cmd_starcitizen_stop(command)
        
        if cmd_type == CommandType.STARCITIZEN_STATUS:
            return await self._cmd_starcitizen_status(command)
        
        # Left 4 Dead 2 commands
        if cmd_type == CommandType.L4D2_START:
            return await self._cmd_l4d2_start(command)
        
        if cmd_type == CommandType.L4D2_STOP:
            return await self._cmd_l4d2_stop(command)
        
        if cmd_type == CommandType.L4D2_STATUS:
            return await self._cmd_l4d2_status(command)
        
        # Half-Life 2: Deathmatch commands
        if cmd_type == CommandType.HL2DM_START:
            return await self._cmd_hl2dm_start(command)
        
        if cmd_type == CommandType.HL2DM_STOP:
            return await self._cmd_hl2dm_stop(command)
        
        if cmd_type == CommandType.HL2DM_STATUS:
            return await self._cmd_hl2dm_status(command)
        
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
        """List available devices (includes real USB devices and mock devices)."""
        # Get real USB devices
        devices = list_devices()
        
        # Add mock devices from registry
        mock_devices = self._registry.list_devices()
        for mock_device in mock_devices:
            if self._registry.is_mock_device(mock_device["device_id"]):
                # Format mock device to match real device format
                devices.append({
                    "vendor_id": mock_device.get("vendor_id", "0x1234"),
                    "product_id": mock_device.get("product_id", "0x5678"),
                    "bus": mock_device.get("bus"),
                    "address": mock_device.get("address"),
                    "serial_number": mock_device.get("serial_number"),
                    "is_mock": True,  # Flag to identify mock devices
                })
        
        return response_list(devices, command.req_id)
    
    async def _cmd_select_device(self, command: Command) -> Response:
        """Select a device to use (adds to registry, doesn't replace)."""
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
        
        # Add device to registry (or get existing if already connected)
        try:
            device_id, controller = self._registry.add_device(
                device_id=command.device_id,  # Optional: allow specifying device_id
                device_info=selected
            )
            
            # Update selected device (for backward compatibility)
            self._selected_device = selected
            self._controller = controller  # Keep for backward compatibility
            
            # Broadcast device selected event (include device_id)
            event_data = selected.copy()
            event_data["device_id"] = device_id
            await self._clients.broadcast(event_device_selected(event_data))
            
            # Also broadcast device_connected event for multi-vest support
            await self._clients.broadcast(event_device_connected(selected, device_id))
            
            return response_ok(command.req_id)
        except ValueError as e:
            return response_error(str(e), command.req_id)
    
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
    
    async def _cmd_list_connected_devices(self, command: Command) -> Response:
        """List all currently connected devices."""
        devices = self._registry.list_devices()
        return response_list_connected_devices(devices, command.req_id)
    
    async def _cmd_set_main_device(self, command: Command) -> Response:
        """Set the main device."""
        if not command.device_id:
            return response_set_main_device(
                success=False,
                error="device_id is required",
                req_id=command.req_id,
            )
        
        success = self._registry.set_main_device(command.device_id)
        if not success:
            return response_set_main_device(
                success=False,
                error=f"Device {command.device_id} not found",
                req_id=command.req_id,
            )
        
        # Get device info for event (may be None for mock devices)
        device_info = self._registry.get_device_info(command.device_id)
        
        # Broadcast main device changed event (non-blocking, don't fail on error)
        try:
            await self._clients.broadcast(
                event_main_device_changed(command.device_id, device_info)
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast main_device_changed event: {e}")
        
        return response_set_main_device(
            success=True,
            device_id=command.device_id,
            req_id=command.req_id,
        )
    
    async def _cmd_disconnect_device(self, command: Command) -> Response:
        """Disconnect a specific device by device_id."""
        if not command.device_id:
            return response_disconnect_device(
                success=False,
                error="device_id is required",
                req_id=command.req_id,
            )
        
        if not self._registry.has_device(command.device_id):
            return response_disconnect_device(
                success=False,
                error=f"Device {command.device_id} not found",
                req_id=command.req_id,
            )
        
        # Remove device from registry
        self._registry.remove_device(command.device_id)
        
        # Update _controller if it was the disconnected device
        main_id = self._registry.get_main_device_id()
        if main_id:
            self._controller = self._registry.get_controller()
        else:
            self._controller = None
            self._selected_device = None
        
        # Check if it's a mock device
        is_mock = self._registry.is_mock_device(command.device_id)
        
        # Broadcast device disconnected event
        if is_mock:
            await self._clients.broadcast(event_mock_device_removed(command.device_id))
        else:
            await self._clients.broadcast(event_device_disconnected(command.device_id))
        
        return response_disconnect_device(
            success=True,
            device_id=command.device_id,
            req_id=command.req_id,
        )
    
    async def _cmd_create_mock_device(self, command: Command) -> Response:
        """Create a new mock device for testing."""
        try:
            device_id, controller = self._registry.add_mock_device()
            device_info = self._registry.get_device_info(device_id)
            
            # Broadcast mock device created event
            await self._clients.broadcast(event_mock_device_created(device_info, device_id))
            
            return response_create_mock_device(
                success=True,
                device_id=device_id,
                device=device_info,
                req_id=command.req_id,
            )
        except ValueError as e:
            return response_create_mock_device(
                success=False,
                error=str(e),
                req_id=command.req_id,
            )
    
    async def _cmd_remove_mock_device(self, command: Command) -> Response:
        """Remove a mock device."""
        if not command.device_id:
            return response_remove_mock_device(
                success=False,
                error="device_id is required",
                req_id=command.req_id,
            )
        
        if not self._registry.is_mock_device(command.device_id):
            return response_remove_mock_device(
                success=False,
                error=f"Device {command.device_id} is not a mock device",
                req_id=command.req_id,
            )
        
        if not self._registry.has_device(command.device_id):
            return response_remove_mock_device(
                success=False,
                error=f"Device {command.device_id} not found",
                req_id=command.req_id,
            )
        
        # Remove device from registry
        self._registry.remove_device(command.device_id)
        
        # Broadcast mock device removed event
        await self._clients.broadcast(event_mock_device_removed(command.device_id))
        
        return response_remove_mock_device(
            success=True,
            device_id=command.device_id,
            req_id=command.req_id,
        )
    
    async def _cmd_connect(self, command: Command) -> Response:
        """Connect to the selected device (or device_id if specified)."""
        # If device_id specified, connect to that device
        if command.device_id:
            controller = self._registry.get_controller(command.device_id)
            if controller is None:
                return response_error(f"Device {command.device_id} not found in registry", command.req_id)
            
            device_info = self._registry.get_device_info(command.device_id)
            if device_info:
                await self._clients.broadcast(event_connected(device_info))
            return response_ok(command.req_id)
        
        # Otherwise, connect to selected device (backward compatibility)
        if self._selected_device is None:
            return response_error("No device selected", command.req_id)
        
        # Device should already be in registry from select_device
        # Just verify connection
        controller = self._registry.get_controller()
        if controller is None or not controller.status().connected:
            return response_error("Device not connected. Use select_device first.", command.req_id)
        
        # Broadcast connected event
        await self._clients.broadcast(event_connected(self._selected_device))
        return response_ok(command.req_id)
    
    async def _cmd_disconnect(self, command: Command) -> Response:
        """Disconnect from the vest (or specific device_id if provided)."""
        # If device_id specified, disconnect that device
        if command.device_id:
            if not self._registry.has_device(command.device_id):
                return response_error(f"Device {command.device_id} not found", command.req_id)
            
            self._registry.remove_device(command.device_id)
            # Update _controller if it was the disconnected device
            if self._controller == self._registry.get_controller():
                self._controller = self._registry.get_controller()
            await self._clients.broadcast(event_disconnected())
            return response_ok(command.req_id)
        
        # Otherwise, disconnect main device (backward compatibility)
        main_id = self._registry.get_main_device_id()
        if main_id:
            self._registry.remove_device(main_id)
            self._controller = None
            self._selected_device = None
        
        # Broadcast disconnected event
        await self._clients.broadcast(event_disconnected())
        
        return response_ok(command.req_id)
    
    async def _cmd_create_player(self, command: Command) -> Response:
        """Create a new player."""
        if not command.player_id:
            return response_create_player(
                success=False,
                error="player_id is required",
                req_id=command.req_id,
            )
        
        # Get name from command (could be in a name field or message field)
        # For now, we'll use a simple approach - name can be passed via message or a new field
        name = getattr(command, 'name', None) or (command.message if hasattr(command, 'message') else None)
        
        player = self._player_manager.create_player(command.player_id, name)
        
        return response_create_player(
            success=True,
            player_id=player.player_id,
            name=player.name,
            req_id=command.req_id,
        )
    
    async def _cmd_assign_player(self, command: Command) -> Response:
        """Assign a player to a device."""
        if not command.player_id:
            return response_assign_player(
                success=False,
                error="player_id is required",
                req_id=command.req_id,
            )
        
        if not command.device_id:
            return response_assign_player(
                success=False,
                error="device_id is required",
                req_id=command.req_id,
            )
        
        # Verify device exists
        if not self._registry.has_device(command.device_id):
            return response_assign_player(
                success=False,
                error=f"Device {command.device_id} not found",
                req_id=command.req_id,
            )
        
        # Create player if doesn't exist
        if not self._player_manager.has_player(command.player_id):
            self._player_manager.create_player(command.player_id)
        
        # Assign player to device
        success = self._player_manager.assign_player(command.player_id, command.device_id)
        if not success:
            return response_assign_player(
                success=False,
                error="Failed to assign player",
                req_id=command.req_id,
            )
        
        # Get player info for event
        player = self._player_manager.get_player(command.player_id)
        
        # Broadcast player assigned event
        await self._clients.broadcast(
            event_player_assigned(command.player_id, command.device_id, player.name if player else None)
        )
        
        return response_assign_player(
            success=True,
            player_id=command.player_id,
            device_id=command.device_id,
            req_id=command.req_id,
        )
    
    async def _cmd_unassign_player(self, command: Command) -> Response:
        """Unassign a player from their device."""
        if not command.player_id:
            return response_unassign_player(
                success=False,
                error="player_id is required",
                req_id=command.req_id,
            )
        
        if not self._player_manager.has_player(command.player_id):
            return response_unassign_player(
                success=False,
                error=f"Player {command.player_id} not found",
                req_id=command.req_id,
            )
        
        success = self._player_manager.unassign_player(command.player_id)
        if not success:
            return response_unassign_player(
                success=False,
                error="Failed to unassign player",
                req_id=command.req_id,
            )
        
        # Broadcast player unassigned event
        await self._clients.broadcast(
            event_player_unassigned(command.player_id)
        )
        
        return response_unassign_player(
            success=True,
            player_id=command.player_id,
            req_id=command.req_id,
        )
    
    async def _cmd_list_players(self, command: Command) -> Response:
        """List all players."""
        players = self._player_manager.list_players()
        return response_list_players(players, command.req_id)
    
    async def _cmd_get_player_device(self, command: Command) -> Response:
        """Get the device_id assigned to a player."""
        if not command.player_id:
            return response_get_player_device(
                device_id=None,
                error="player_id is required",
                req_id=command.req_id,
            )
        
        device_id = self._player_manager.get_player_device(command.player_id)
        return response_get_player_device(
            device_id=device_id,
            player_id=command.player_id,
            req_id=command.req_id,
        )
    
    async def _cmd_set_game_player_mapping(self, command: Command) -> Response:
        """Set a game-specific player mapping."""
        if not command.game_id:
            return response_set_game_player_mapping(
                success=False,
                error="game_id is required",
                req_id=command.req_id,
            )
        
        if command.player_num is None:
            return response_set_game_player_mapping(
                success=False,
                error="player_num is required",
                req_id=command.req_id,
            )
        
        if not command.device_id:
            return response_set_game_player_mapping(
                success=False,
                error="device_id is required",
                req_id=command.req_id,
            )
        
        # Verify device exists
        if not self._registry.has_device(command.device_id):
            return response_set_game_player_mapping(
                success=False,
                error=f"Device {command.device_id} not found",
                req_id=command.req_id,
            )
        
        # Set the mapping
        self._game_mapping.set_mapping(command.game_id, command.player_num, command.device_id)
        
        # Broadcast mapping changed event
        await self._clients.broadcast(
            event_game_player_mapping_changed(command.game_id, command.player_num, command.device_id)
        )
        
        return response_set_game_player_mapping(
            success=True,
            game_id=command.game_id,
            player_num=command.player_num,
            device_id=command.device_id,
            req_id=command.req_id,
        )
    
    async def _cmd_clear_game_player_mapping(self, command: Command) -> Response:
        """Clear a game-specific player mapping."""
        if not command.game_id:
            return response_clear_game_player_mapping(
                success=False,
                error="game_id is required",
                req_id=command.req_id,
            )
        
        # Clear mapping (player_num is optional - if None, clears all for game)
        success = self._game_mapping.clear_mapping(command.game_id, command.player_num)
        if not success:
            return response_clear_game_player_mapping(
                success=False,
                error=f"Game {command.game_id} has no mappings",
                req_id=command.req_id,
            )
        
        # Broadcast mapping changed event (device_id=None indicates cleared)
        await self._clients.broadcast(
            event_game_player_mapping_changed(command.game_id, command.player_num or 0, None)
        )
        
        return response_clear_game_player_mapping(
            success=True,
            game_id=command.game_id,
            req_id=command.req_id,
        )
    
    async def _cmd_list_game_player_mappings(self, command: Command) -> Response:
        """List all game-specific player mappings."""
        # If game_id provided, list only for that game
        mappings = self._game_mapping.list_mappings(command.game_id if command.game_id else None)
        return response_list_game_player_mappings(mappings, command.req_id)
    
    def _resolve_device_id(self, command: Command) -> Optional[str]:
        """
        Resolve device_id from command using fallback logic:
        1. Direct device_id
        2. Game-specific mapping (game_id + player_num)
        3. Global player mapping (player_id)
        4. Main device
        """
        # 1. Direct device_id
        if command.device_id:
            return command.device_id
        
        # 2. Game-specific mapping (game_id + player_num)
        if command.game_id and command.player_num is not None:
            device_id = self._game_mapping.get_mapping(command.game_id, command.player_num)
            if device_id:
                return device_id
        
        # 3. Global player mapping (player_id)
        if command.player_id:
            device_id = self._player_manager.get_player_device(command.player_id)
            if device_id:
                return device_id
        
        # 4. Main device (fallback)
        return self._registry.get_main_device_id()
    
    async def _cmd_trigger(self, command: Command) -> Response:
        """Trigger an effect (on specified device_id, game_id+player_num, player_id, or main device)."""
        if command.cell is None or command.speed is None:
            return response_error("Must specify cell and speed", command.req_id)
        
        # Resolve device_id using fallback logic
        target_device_id = self._resolve_device_id(command)
        
        # Get controller for resolved device_id
        controller = self._registry.get_controller(target_device_id)
        
        # If no controller found, try to auto-connect main device (backward compatibility)
        if controller is None:
            if self._selected_device is None:
                return response_error("No device selected and no device_id specified", command.req_id)
            
            # Auto-connect main device
            try:
                device_id, controller = self._registry.add_device(
                    device_id=None,
                    device_info=self._selected_device
                )
                self._controller = controller  # Update for backward compatibility
                await self._clients.broadcast(event_connected(self._selected_device))
            except ValueError as e:
                return response_error(str(e), command.req_id)
        
        # Check if connected
        if not controller.status().connected:
            return response_error("Device not connected", command.req_id)
        
        # Trigger the effect
        success = controller.trigger_effect(command.cell, command.speed)
        
        if success:
            # Broadcast effect triggered event (include resolved device_id)
            await self._clients.broadcast(event_effect_triggered(
                command.cell, 
                command.speed,
                device_id=target_device_id
            ))
            return response_ok(command.req_id)
        else:
            error_msg = controller.status().last_error or "Failed to trigger effect"
            return response_error(error_msg, command.req_id)
    
    async def _cmd_stop(self, command: Command) -> Response:
        """Stop all effects (on specified device_id or all devices)."""
        # If device_id specified, stop that device only
        if command.device_id:
            controller = self._registry.get_controller(command.device_id)
            if controller is None:
                return response_error(f"Device {command.device_id} not found", command.req_id)
            controller.stop_all()
            await self._clients.broadcast(event_all_stopped(device_id=command.device_id))
            return response_ok(command.req_id)
        
        # Otherwise, stop all devices (backward compatibility)
        for controller in self._registry._controllers.values():
            controller.stop_all()
        
        # Broadcast all stopped event
        await self._clients.broadcast(event_all_stopped())
        
        return response_ok(command.req_id)
    
    async def _cmd_status(self, command: Command) -> Response:
        """Get connection status (for specified device_id or main device)."""
        # If device_id specified, get status for that device
        if command.device_id:
            controller = self._registry.get_controller(command.device_id)
            if controller is None:
                return response_status(
                    connected=False,
                    device=None,
                    req_id=command.req_id,
                )
            status = controller.status()
            device_info = self._registry.get_device_info(command.device_id)
            return response_status(
                connected=status.connected,
                device=device_info,
                req_id=command.req_id,
            )
        
        # Otherwise, get status for main device (backward compatibility)
        controller = self._registry.get_controller()
        if controller is None:
            return response_status(
                connected=False,
                device=self._selected_device,
                req_id=command.req_id,
            )
        
        status = controller.status()
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
        
        Defaults to main device (backward compatible).
        This performs the actual vest trigger synchronously since
        the vest controller is thread-safe for simple operations.
        """
        # Get main device controller (backward compatible - always uses main device)
        main_device_id = self._registry.get_main_device_id()
        if main_device_id is None:
            return  # No device available
        
        controller = self._registry.get_controller(main_device_id)
        if controller is None or not controller.status().connected:
            return  # Device not connected
        
        # Trigger effect (synchronous, thread-safe)
        controller.trigger_effect(cell, speed)
        
        # Broadcast event (async)
        if self._loop is not None:
            event = event_effect_triggered(cell, speed, device_id=main_device_id)
            asyncio.run_coroutine_threadsafe(
                self._clients.broadcast(event),
                self._loop,
            )
    
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
        
        Defaults to main device (backward compatible).
        This performs the actual vest trigger synchronously since
        the vest controller is thread-safe for simple operations.
        """
        # Get main device controller (backward compatible - always uses main device)
        main_device_id = self._registry.get_main_device_id()
        if main_device_id is None:
            return  # No device available
        
        controller = self._registry.get_controller(main_device_id)
        if controller is None or not controller.status().connected:
            return  # Device not connected
        
        # Trigger effect (synchronous, thread-safe)
        controller.trigger_effect(cell, speed)
        
        # Broadcast effect triggered event (async)
        if self._loop is not None:
            event = event_effect_triggered(cell, speed, device_id=main_device_id)
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
    # Star Citizen commands
    # -------------------------------------------------------------------------
    
    async def _cmd_starcitizen_start(self, command: Command) -> Response:
        """Start watching Star Citizen Game.log."""
        logger.info(f"[STARCITIZEN] Received start command: log_path={command.log_path}, player_name={command.message}")
        log_path = command.log_path
        player_name = command.message  # Using message field for player name
        
        logger.info(f"[STARCITIZEN] Calling manager.start() with log_path={log_path}, player_name={player_name}")
        try:
            success, error = self._starcitizen_manager.start(
                log_path=log_path,
                player_name=player_name,
            )
            logger.info(f"[STARCITIZEN] manager.start() returned: success={success}, error={error}")
        except Exception as e:
            logger.exception(f"[STARCITIZEN] Exception in manager.start(): {e}")
            return response_starcitizen_start(
                success=False,
                error=f"Exception: {str(e)}",
                req_id=command.req_id,
            )
        
        if success:
            log_path_str = str(self._starcitizen_manager.log_path) if self._starcitizen_manager.log_path else None
            logger.info(f"[STARCITIZEN] Broadcasting started event with log_path={log_path_str}")
            await self._clients.broadcast(event_starcitizen_started(log_path_str or ""))
            logger.info(f"[STARCITIZEN] Returning success response")
            return response_starcitizen_start(
                success=True,
                log_path=log_path_str,
                req_id=command.req_id,
            )
        else:
            logger.warning(f"[STARCITIZEN] Returning error response: {error}")
            return response_starcitizen_start(
                success=False,
                error=error,
                req_id=command.req_id,
            )
    
    async def _cmd_starcitizen_stop(self, command: Command) -> Response:
        """Stop watching Star Citizen Game.log."""
        success = self._starcitizen_manager.stop()
        if success:
            await self._clients.broadcast(event_starcitizen_stopped())
        return response_starcitizen_stop(success=success, req_id=command.req_id)
    
    async def _cmd_starcitizen_status(self, command: Command) -> Response:
        """Get Star Citizen integration status."""
        log_path_str = str(self._starcitizen_manager.log_path) if self._starcitizen_manager.log_path else None
        return response_starcitizen_status(
            enabled=self._starcitizen_manager.is_running,
            events_received=self._starcitizen_manager.events_received,
            last_event_ts=self._starcitizen_manager.last_event_ts,
            last_event_type=self._starcitizen_manager.last_event_type,
            log_path=log_path_str,
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # Star Citizen callbacks
    # -------------------------------------------------------------------------
    
    def _on_starcitizen_game_event(self, event_type: str, params: dict):
        """
        Called when Star Citizen manager processes a game event.
        
        Broadcasts the event to all connected clients for UI display.
        """
        if self._loop is None:
            return
        
        # Schedule broadcast in event loop
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event_starcitizen_game_event(event_type, params)),
            self._loop,
        )
    
    def _on_starcitizen_trigger(self, cell: int, speed: int):
        """
        Called when Star Citizen manager wants to trigger a haptic effect.
        
        Triggers the effect on the main device.
        """
        if self._loop is None:
            return
        
        # Schedule trigger in event loop
        asyncio.run_coroutine_threadsafe(
            self._trigger_main_device(cell, speed),
            self._loop,
        )
    
    # -------------------------------------------------------------------------
    # Left 4 Dead 2 commands
    # -------------------------------------------------------------------------
    
    async def _cmd_l4d2_start(self, command: Command) -> Response:
        """Start watching Left 4 Dead 2 console.log."""
        logger.info(f"[L4D2] Received start command: log_path={command.log_path}, player_name={command.message}")
        log_path = command.log_path
        player_name = command.message  # Using message field for player name
        
        success, error = self._l4d2_manager.start(log_path=log_path, player_name=player_name)
        
        if success:
            log_path_str = str(self._l4d2_manager.log_path) if self._l4d2_manager.log_path else None
            await self._clients.broadcast(event_l4d2_started(log_path_str or ""))
            return response_l4d2_start(success=True, log_path=log_path_str, req_id=command.req_id)
        else:
            return response_l4d2_start(success=False, error=error, req_id=command.req_id)
    
    async def _cmd_l4d2_stop(self, command: Command) -> Response:
        """Stop watching Left 4 Dead 2 console.log."""
        success = self._l4d2_manager.stop()
        if success:
            await self._clients.broadcast(event_l4d2_stopped())
        return response_l4d2_stop(success=success, req_id=command.req_id)
    
    async def _cmd_l4d2_status(self, command: Command) -> Response:
        """Get Left 4 Dead 2 integration status."""
        log_path_str = str(self._l4d2_manager.log_path) if self._l4d2_manager.log_path else None
        return response_l4d2_status(
            running=self._l4d2_manager.is_running,
            events_received=self._l4d2_manager.events_received,
            last_event_ts=self._l4d2_manager.last_event_ts,
            last_event_type=None,  # L4D2 manager doesn't track last event type yet
            log_path=log_path_str,
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # Left 4 Dead 2 callbacks
    # -------------------------------------------------------------------------
    
    def _on_l4d2_game_event(self, event_type: str, params: dict):
        """
        Called when Left 4 Dead 2 manager processes a game event.
        
        Broadcasts the event to all connected clients for UI display.
        """
        if self._loop is None:
            return
        
        # Schedule broadcast in event loop
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event_l4d2_game_event(event_type, params)),
            self._loop,
        )
    
    def _on_l4d2_trigger(self, cell: int, speed: int):
        """
        Called when Left 4 Dead 2 manager wants to trigger a haptic effect.
        
        Triggers the effect on the main device.
        """
        # Get main device controller
        main_device_id = self._registry.get_main_device_id()
        if main_device_id is None:
            return  # No device available
        
        controller = self._registry.get_controller(main_device_id)
        if controller is None or not controller.status().connected:
            return  # Device not connected
        
        # Trigger effect (synchronous, thread-safe)
        controller.trigger_effect(cell, speed)
        
        # Broadcast event (async)
        if self._loop is not None:
            event = event_effect_triggered(cell, speed, device_id=main_device_id)
            asyncio.run_coroutine_threadsafe(
                self._clients.broadcast(event),
                self._loop,
            )
    
    # -------------------------------------------------------------------------
    # Half-Life 2: Deathmatch commands
    # -------------------------------------------------------------------------
    
    async def _cmd_hl2dm_start(self, command: Command) -> Response:
        """Start watching Half-Life 2: Deathmatch console.log."""
        logger.info(f"[HL2DM] Received start command: log_path={command.log_path}, player_name={command.message}")
        log_path = command.log_path
        player_name = command.message  # Using message field for player name
        
        success, error = self._hl2dm_manager.start(log_path=log_path, player_name=player_name)
        
        if success:
            log_path_str = str(self._hl2dm_manager.log_path) if self._hl2dm_manager.log_path else None
            await self._clients.broadcast(event_hl2dm_started(log_path_str or ""))
            return response_hl2dm_start(success=True, log_path=log_path_str, req_id=command.req_id)
        else:
            return response_hl2dm_start(success=False, error=error, req_id=command.req_id)
    
    async def _cmd_hl2dm_stop(self, command: Command) -> Response:
        """Stop watching Half-Life 2: Deathmatch console.log."""
        success = self._hl2dm_manager.stop()
        if success:
            await self._clients.broadcast(event_hl2dm_stopped())
        return response_hl2dm_stop(success=success, req_id=command.req_id)
    
    async def _cmd_hl2dm_status(self, command: Command) -> Response:
        """Get Half-Life 2: Deathmatch integration status."""
        log_path_str = str(self._hl2dm_manager.log_path) if self._hl2dm_manager.log_path else None
        return response_hl2dm_status(
            running=self._hl2dm_manager.is_running,
            events_received=self._hl2dm_manager.events_received,
            last_event_ts=self._hl2dm_manager.last_event_ts,
            last_event_type=self._hl2dm_manager.last_event_type,
            log_path=log_path_str,
            req_id=command.req_id,
        )
    
    # -------------------------------------------------------------------------
    # Half-Life 2: Deathmatch callbacks
    # -------------------------------------------------------------------------
    
    def _on_hl2dm_game_event(self, event_type: str, params: dict):
        """
        Called when Half-Life 2: Deathmatch manager processes a game event.
        
        Broadcasts the event to all connected clients for UI display.
        """
        if self._loop is None:
            return
        
        # Schedule broadcast in event loop
        asyncio.run_coroutine_threadsafe(
            self._clients.broadcast(event_hl2dm_game_event(event_type, params)),
            self._loop,
        )
    
    def _on_hl2dm_trigger(self, cell: int, speed: int):
        """
        Called when Half-Life 2: Deathmatch manager wants to trigger a haptic effect.
        
        Triggers the effect on the main device.
        """
        # Get main device controller
        main_device_id = self._registry.get_main_device_id()
        if main_device_id is None:
            return  # No device available
        
        controller = self._registry.get_controller(main_device_id)
        if controller is None or not controller.status().connected:
            return  # Device not connected
        
        # Trigger effect (synchronous, thread-safe)
        controller.trigger_effect(cell, speed)
        
        # Broadcast event (async)
        if self._loop is not None:
            event = event_effect_triggered(cell, speed, device_id=main_device_id)
            asyncio.run_coroutine_threadsafe(
                self._clients.broadcast(event),
                self._loop,
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
        
        Defaults to main device (backward compatible).
        This performs the actual vest trigger.
        """
        # Get main device controller (backward compatible - always uses main device)
        main_device_id = self._registry.get_main_device_id()
        if main_device_id is None:
            return  # No device available
        
        controller = self._registry.get_controller(main_device_id)
        if controller is None or not controller.status().connected:
            return  # Device not connected
        
        # Trigger effect (synchronous, thread-safe)
        controller.trigger_effect(cell, speed)
        
        # Broadcast effect triggered event (async)
        if self._loop is not None:
            event = event_effect_triggered(cell, speed, device_id=main_device_id)
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

