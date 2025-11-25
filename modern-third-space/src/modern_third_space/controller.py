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
        if self._vest is not None:
            return self._status

        try:
            vest_cls = load_vest_class()
        except LegacyLoaderError as exc:
            self._status = VestStatus(False, last_error=str(exc))
            return self._status

        self._vest = vest_cls()
        opened = False
        with contextlib.suppress(Exception):
            opened = bool(self._vest.open())

        self._status = VestStatus(
            connected=opened,
            device_vendor_id=getattr(vest_cls, "TSV_VENDOR_ID", None),
            device_product_id=getattr(vest_cls, "TSV_PRODUCT_ID", None),
            last_error=None if opened else "Device not detected",
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


