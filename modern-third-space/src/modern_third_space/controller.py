from __future__ import annotations

import contextlib
import dataclasses
import json
from typing import Any, Dict, List, Optional

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
    def default_effects() -> List[Dict[str, Any]]:
        return [
            {"label": "Front Left", "cell": 0, "speed": 5},
            {"label": "Front Right", "cell": 1, "speed": 5},
            {"label": "Back Left", "cell": 2, "speed": 5},
            {"label": "Back Right", "cell": 3, "speed": 5},
            {"label": "Full Blast", "cell": 0, "speed": 10},
        ]


