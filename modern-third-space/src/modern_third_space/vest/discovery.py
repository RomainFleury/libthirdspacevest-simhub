"""
Device discovery - enumerate connected Third Space Vest devices.

This module is part of the vest core package and handles USB device scanning.
It provides functions to find all connected vest hardware.
"""

from __future__ import annotations

from typing import Any, Dict, List

try:
    import usb.core
except ImportError:
    usb = None  # type: ignore

from ..legacy_adapter import load_vest_class


def list_devices() -> List[Dict[str, Any]]:
    """
    Enumerate all connected Third Space Vest devices.
    
    Returns:
        List of device information dictionaries, each containing:
        - vendor_id: USB vendor ID as hex string (e.g., "0x1BD7")
        - product_id: USB product ID as hex string (e.g., "0x5000")
        - bus: USB bus number
        - address: USB device address
        - serial_number: Device serial number (may be None)
    
    Note:
        If PyUSB is not installed, returns a single fake device with
        serial_number="sorry-bro" to indicate the setup issue.
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
        # Return empty list on any error
        return []

