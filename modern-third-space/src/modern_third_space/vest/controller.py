"""
VestController - manages connection and commands to a Third Space Vest.

This module is part of the vest core package. It handles:
- Opening/closing connections to vest hardware
- Sending actuator commands
- Tracking connection status

This module should NOT contain:
- Game integrations or listeners
- UI presets or effect definitions
- Device discovery (see discovery.py)
"""

from __future__ import annotations

import contextlib
from typing import Any, Dict, Optional

from .status import VestStatus
from .discovery import list_devices
from ..legacy_adapter import LegacyLoaderError, load_vest_class


class VestController:
    """
    Controller for a single Third Space Vest device.
    
    Provides a clean API for connecting to and controlling vest hardware.
    This class wraps the legacy driver and manages connection state.
    
    Usage:
        controller = VestController()
        status = controller.connect()  # Connect to first available device
        if status.connected:
            controller.trigger_effect(cell=0, speed=5)
            controller.stop_all()
        controller.disconnect()
    """

    def __init__(self) -> None:
        """Initialize controller (no connection yet)."""
        self._vest = None
        self._status = VestStatus(connected=False)

    def connect(self) -> VestStatus:
        """
        Connect to the first available vest device.
        
        Returns:
            VestStatus with connection result
        """
        return self.connect_to_device(None)

    def connect_to_device(
        self, device_info: Optional[Dict[str, Any]]
    ) -> VestStatus:
        """
        Connect to a specific vest device.
        
        Args:
            device_info: Dictionary with device selection criteria:
                - bus + address: Connect by USB location
                - serial_number: Connect by serial number
                - index: Connect by position in device list
                - None: Connect to first available device
        
        Returns:
            VestStatus with connection result
        """
        # Disconnect existing connection if switching devices
        if self._vest is not None:
            self.disconnect()

        try:
            vest_cls = load_vest_class()
        except LegacyLoaderError as exc:
            self._status = VestStatus(False, last_error=str(exc))
            return self._status

        self._vest = vest_cls()
        opened = False
        error_msg = None

        with contextlib.suppress(Exception):
            if device_info is None:
                # Default: connect to first device
                opened = bool(self._vest.open())
            elif device_info.get("bus") is not None and device_info.get("address") is not None:
                # Connect by bus + address
                opened = bool(
                    self._vest.open(
                        bus=device_info["bus"],
                        address=device_info["address"]
                    )
                )
                if not opened:
                    error_msg = f"Device not found at bus {device_info['bus']}, address {device_info['address']}"
            elif device_info.get("index") is not None:
                # Connect by index
                opened = bool(self._vest.open(index=device_info["index"]))
                if not opened:
                    error_msg = f"Device not found at index {device_info['index']}"
            elif device_info.get("serial_number"):
                # Try to find device by serial number
                devices = list_devices()
                matching_device = None
                for dev in devices:
                    if dev.get("serial_number") == device_info["serial_number"]:
                        matching_device = dev
                        break
                
                if matching_device:
                    opened = bool(
                        self._vest.open(
                            bus=matching_device["bus"],
                            address=matching_device["address"]
                        )
                    )
                    if not opened:
                        error_msg = f"Failed to open device with serial {device_info['serial_number']}"
                else:
                    error_msg = f"Device with serial {device_info['serial_number']} not found"
            else:
                # Invalid device_info, fall back to first device
                opened = bool(self._vest.open())
                if not opened:
                    error_msg = "Invalid device info, tried first device but failed"

        # Extract device information if connected
        device_bus = None
        device_address = None
        device_serial = None
        device_vendor_id = None
        device_product_id = None
        
        if opened and self._vest and self._vest.tsv_device:
            try:
                device = self._vest.tsv_device
                device_bus = device.bus
                device_address = device.address
                device_vendor_id = device.idVendor
                device_product_id = device.idProduct
                # Try to get serial number (may not always be available)
                try:
                    device_serial = getattr(device, "serial_number", None)
                except Exception:
                    device_serial = None
            except Exception:
                # Fallback to class constants if device info unavailable
                device_vendor_id = getattr(vest_cls, "TSV_VENDOR_ID", None)
                device_product_id = getattr(vest_cls, "TSV_PRODUCT_ID", None)
        else:
            # Not connected, use class constants
            device_vendor_id = getattr(vest_cls, "TSV_VENDOR_ID", None)
            device_product_id = getattr(vest_cls, "TSV_PRODUCT_ID", None)

        self._status = VestStatus(
            connected=opened,
            device_vendor_id=device_vendor_id,
            device_product_id=device_product_id,
            device_bus=device_bus,
            device_address=device_address,
            device_serial_number=device_serial,
            last_error=error_msg if not opened else None,
        )

        if not opened:
            self._vest = None
        return self._status

    def disconnect(self) -> None:
        """
        Disconnect from the current vest device.
        
        Safe to call even if not connected.
        """
        if self._vest is not None:
            with contextlib.suppress(Exception):
                self._vest.close()
        self._vest = None
        self._status = VestStatus(connected=False)

    def status(self) -> VestStatus:
        """
        Get current connection status.
        
        Returns:
            VestStatus snapshot (does not refresh from hardware)
        """
        return self._status

    def trigger_effect(self, cell_index: int, speed: int) -> bool:
        """
        Send an actuator command to the vest.
        
        Args:
            cell_index: Actuator cell index (0-7)
            speed: Vibration speed (0-10, where 0 = off)
        
        Returns:
            True if command sent successfully, False otherwise
        
        Note:
            If not connected, will attempt to auto-connect to first device.
        """
        if self._vest is None:
            self.connect()
        if self._vest is None:
            self._status = VestStatus(
                connected=False,
                last_error="Unable to connect to vest"
            )
            return False
        try:
            self._vest.send_actuator_command(cell_index, speed)
            return True
        except Exception as exc:
            self._status = VestStatus(
                connected=self._status.connected,
                device_vendor_id=self._status.device_vendor_id,
                device_product_id=self._status.device_product_id,
                device_bus=self._status.device_bus,
                device_address=self._status.device_address,
                device_serial_number=self._status.device_serial_number,
                last_error=str(exc),
            )
            return False

    def stop_all(self) -> None:
        """
        Stop all actuators (set all cells to speed 0).
        
        Safe to call even if not connected (will be a no-op).
        """
        if self._vest is None:
            return
        for idx in range(8):
            with contextlib.suppress(Exception):
                self._vest.send_actuator_command(idx, 0)

