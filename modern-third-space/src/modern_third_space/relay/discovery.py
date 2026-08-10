"""Serial port discovery for USB LC relay modules."""

from __future__ import annotations

from typing import Any, Dict, List


def list_ports() -> List[Dict[str, Any]]:
    """
    List available serial ports.

    Returns dicts with: device, description, hwid, manufacturer, product, serial_number.
    """
    try:
        from serial.tools import list_ports as serial_list_ports
    except ImportError as exc:
        raise RuntimeError(
            "pyserial is required for USB relay support. Install with: pip install pyserial"
        ) from exc

    ports: List[Dict[str, Any]] = []
    for info in serial_list_ports.comports():
        ports.append(
            {
                "device": info.device,
                "description": info.description or "",
                "hwid": info.hwid or "",
                "manufacturer": getattr(info, "manufacturer", None),
                "product": getattr(info, "product", None),
                "serial_number": getattr(info, "serial_number", None),
            }
        )
    return ports
