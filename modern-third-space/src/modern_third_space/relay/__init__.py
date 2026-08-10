"""
USB LC relay package for solenoid / recoil prototyping.

Isolated from vest/ — this drives a COM-port relay module, not the haptic vest.
"""

from .controller import RelayController, RelayStatus
from .discovery import list_ports
from .protocol import DEFAULT_ADDRESS, DEFAULT_BAUD, START_BYTE, build_frame
from .recoil import (
    DEFAULT_RECOIL_MS,
    MIN_RECOIL_MS,
    MAX_RECOIL_MS,
    MAX_ON_MS,
    clamp_duration_ms,
    clamp_on_ms,
    duration_ms_for_weapon,
    parse_solenoid_settings,
)

__all__ = [
    "RelayController",
    "RelayStatus",
    "list_ports",
    "DEFAULT_ADDRESS",
    "DEFAULT_BAUD",
    "START_BYTE",
    "build_frame",
    "DEFAULT_RECOIL_MS",
    "MIN_RECOIL_MS",
    "MAX_RECOIL_MS",
    "MAX_ON_MS",
    "clamp_duration_ms",
    "clamp_on_ms",
    "duration_ms_for_weapon",
    "parse_solenoid_settings",
]
