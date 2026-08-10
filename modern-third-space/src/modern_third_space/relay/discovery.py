"""Serial port discovery for USB LC relay modules."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

# WCH CH340/CH341 — common USB-UART on LC USB relay sticks
CH340_VID = 0x1A86
CH340_PID = 0x7523

_VID_PID_RE = re.compile(
    r"VID[:_]?PID[=:_]\s*([0-9A-Fa-f]{4})[:_]([0-9A-Fa-f]{4})"
    r"|VID[_:]([0-9A-Fa-f]{4}).*?PID[_:]([0-9A-Fa-f]{4})",
    re.IGNORECASE,
)


def parse_vid_pid(hwid: str) -> Tuple[Optional[int], Optional[int]]:
    """Extract USB vendor/product IDs from a pyserial hwid string."""
    if not hwid:
        return None, None
    match = _VID_PID_RE.search(hwid)
    if not match:
        return None, None
    vid_s = match.group(1) or match.group(3)
    pid_s = match.group(2) or match.group(4)
    if not vid_s or not pid_s:
        return None, None
    return int(vid_s, 16), int(pid_s, 16)


def is_likely_lc_relay(port: Dict[str, Any]) -> bool:
    """True for typical LC USB relay USB-UART chips (CH340)."""
    vid = port.get("vid")
    pid = port.get("pid")
    if vid == CH340_VID and pid == CH340_PID:
        return True
    blob = " ".join(
        str(port.get(k) or "")
        for k in ("description", "manufacturer", "product", "hwid")
    ).lower()
    return "ch340" in blob or "ch341" in blob or "wch.cn" in blob


def _port_sort_key(port: Dict[str, Any]) -> Tuple[int, str]:
    # Likely relays first, then other USB serial, then the rest
    if port.get("likely_relay"):
        return (0, port.get("device") or "")
    hwid = (port.get("hwid") or "").upper()
    if "USB" in hwid and "BTHENUM" not in hwid:
        return (1, port.get("device") or "")
    return (2, port.get("device") or "")


def list_ports() -> List[Dict[str, Any]]:
    """
    List available serial ports.

    Returns dicts with: device, description, hwid, manufacturer, product,
    serial_number, vid, pid, likely_relay.
    Likely LC USB relay ports (CH340 1A86:7523) are sorted first.
    """
    try:
        from serial.tools import list_ports as serial_list_ports
    except ImportError as exc:
        raise RuntimeError(
            "pyserial is required for USB relay support. Install with: pip install pyserial"
        ) from exc

    ports: List[Dict[str, Any]] = []
    for info in serial_list_ports.comports():
        hwid = info.hwid or ""
        vid, pid = parse_vid_pid(hwid)
        # Prefer pyserial's own vid/pid when present
        if getattr(info, "vid", None) is not None:
            vid = int(info.vid)
        if getattr(info, "pid", None) is not None:
            pid = int(info.pid)

        entry: Dict[str, Any] = {
            "device": info.device,
            "description": info.description or "",
            "hwid": hwid,
            "manufacturer": getattr(info, "manufacturer", None),
            "product": getattr(info, "product", None),
            "serial_number": getattr(info, "serial_number", None),
            "vid": vid,
            "pid": pid,
        }
        entry["likely_relay"] = is_likely_lc_relay(entry)
        ports.append(entry)

    ports.sort(key=_port_sort_key)
    return ports
