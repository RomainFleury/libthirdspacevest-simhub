from __future__ import annotations

import contextlib
import dataclasses
import json
from typing import Any, Dict, List, Optional

try:
    import usb.core
except ImportError:
    usb = None  # type: ignore

from .legacy_adapter import LegacyLoaderError, load_vest_class


@dataclasses.dataclass
class VestStatus:
    connected: bool
    device_vendor_id: Optional[int] = None
    device_product_id: Optional[int] = None
    device_bus: Optional[int] = None
    device_address: Optional[int] = None
    device_serial_number: Optional[str] = None
    last_error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class VestController:
    """
    Thin wrapper that exposes a friendlier API on top of the legacy driver.
    """

    def __init__(self) -> None:
        self._vest = None
        self._status = VestStatus(connected=False)

    def connect(self) -> VestStatus:
        """Connect to the first available device (default behavior)."""
        return self.connect_to_device(None)

    def connect_to_device(
        self, device_info: Optional[Dict[str, Any]]
    ) -> VestStatus:
        """
        Connect to a specific device.
        
        Args:
            device_info: Dictionary with device information. Can contain:
                - bus: USB bus number (required with address)
                - address: USB device address (required with bus)
                - serial_number: Device serial number (optional, for matching)
                - index: Device index in list (optional, fallback)
        
        If device_info is None, connects to the first available device.
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
                devices = self.list_devices()
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
        if self._vest is not None:
            with contextlib.suppress(Exception):
                self._vest.close()
        self._vest = None
        self._status.connected = False

    def status(self) -> VestStatus:
        return self._status

    def trigger_effect(self, cell_index: int, speed: int) -> bool:
        if self._vest is None:
            self.connect()
        if self._vest is None:
            self._status.last_error = "Unable to connect to vest"
            return False
        try:
            self._vest.send_actuator_command(cell_index, speed)
            return True
        except Exception as exc:  # pragma: no cover
            self._status.last_error = str(exc)
            return False

    def stop_all(self) -> None:
        if self._vest is None:
            return
        for idx in range(8):
            with contextlib.suppress(Exception):
                self._vest.send_actuator_command(idx, 0)

    @staticmethod
    def list_devices() -> List[Dict[str, Any]]:
        """
        Enumerate all connected Third Space Vest devices.
        Returns a list of device information dictionaries.
        """
        if usb is None:
            # Return a fake device to indicate PyUSB is not available
            return [{
                "vendor_id": "0x0000",
                "product_id": "0x0000",
                "bus": 0,
                "address": 0,
                "serial_number": "sorry-bro",
            }]
        
        try:
            vest_cls = load_vest_class()
            vendor_id = getattr(vest_cls, "TSV_VENDOR_ID", None)
            product_id = getattr(vest_cls, "TSV_PRODUCT_ID", None)
            
            if vendor_id is None or product_id is None:
                return []
            
            devices = usb.core.find(
                find_all=True,
                idVendor=vendor_id,
                idProduct=product_id
            )
            
            result = []
            # find_all returns an iterator, convert to list
            device_list = list(devices) if devices else []
            for device in device_list:
                try:
                    result.append({
                        "vendor_id": f"0x{device.idVendor:04X}",
                        "product_id": f"0x{device.idProduct:04X}",
                        "bus": device.bus,
                        "address": device.address,
                        "serial_number": getattr(device, "serial_number", None),
                    })
                except Exception:
                    # Skip devices we can't read info from
                    continue
            
            return result
        except Exception:
            # Return empty list on any error (e.g., PyUSB not available)
            return []

    @staticmethod
    def default_effects() -> List[Dict[str, Any]]:
        return [
            {"label": "Front Left", "cell": 0, "speed": 5},
            {"label": "Front Right", "cell": 1, "speed": 5},
            {"label": "Back Left", "cell": 2, "speed": 5},
            {"label": "Back Right", "cell": 3, "speed": 5},
            {"label": "Full Blast", "cell": 0, "speed": 10},
        ]


