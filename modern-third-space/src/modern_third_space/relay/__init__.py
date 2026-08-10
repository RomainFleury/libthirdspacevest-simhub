"""
USB LC relay package for solenoid / recoil prototyping.

Isolated from vest/ — this drives a COM-port relay module, not the haptic vest.
"""

from .controller import RelayController, RelayStatus
from .discovery import list_ports
from .protocol import DEFAULT_ADDRESS, DEFAULT_BAUD, START_BYTE, build_frame

__all__ = [
    "RelayController",
    "RelayStatus",
    "list_ports",
    "DEFAULT_ADDRESS",
    "DEFAULT_BAUD",
    "START_BYTE",
    "build_frame",
]
