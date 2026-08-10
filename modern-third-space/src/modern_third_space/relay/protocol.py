"""
USB LC relay serial protocol helpers.

Default module framing (9600 baud):
  [0xA0, address, state, checksum]

Where:
  - address defaults to 0x01 (first switch)
  - state is 0x00 (off) or 0x01 (on)
  - checksum is (start + address + state) & 0xFF

Examples:
  ON:  A0 01 01 A2
  OFF: A0 01 00 A1
"""

from __future__ import annotations

START_BYTE = 0xA0
DEFAULT_ADDRESS = 0x01
DEFAULT_BAUD = 9600


def build_frame(on: bool, address: int = DEFAULT_ADDRESS) -> bytes:
    """Build a 4-byte LC USB relay command frame."""
    if not 0 <= address <= 0xFF:
        raise ValueError(f"address must be 0-255, got {address}")
    state = 0x01 if on else 0x00
    checksum = (START_BYTE + address + state) & 0xFF
    return bytes((START_BYTE, address, state, checksum))
