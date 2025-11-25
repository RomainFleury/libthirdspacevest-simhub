"""
VestStatus dataclass - represents the connection state of a Third Space Vest.

This module is part of the vest core package and contains only data structures
for representing vest state. No business logic or hardware interaction here.
"""

from __future__ import annotations

import dataclasses
import json
from typing import Any, Dict, Optional


@dataclasses.dataclass
class VestStatus:
    """
    Immutable snapshot of vest connection status.
    
    Attributes:
        connected: Whether a vest is currently connected
        device_vendor_id: USB vendor ID (if connected)
        device_product_id: USB product ID (if connected)
        device_bus: USB bus number (if connected)
        device_address: USB device address (if connected)
        device_serial_number: Device serial number (if available)
        last_error: Last error message (if any)
    """
    connected: bool
    device_vendor_id: Optional[int] = None
    device_product_id: Optional[int] = None
    device_bus: Optional[int] = None
    device_address: Optional[int] = None
    device_serial_number: Optional[str] = None
    last_error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return dataclasses.asdict(self)

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)

