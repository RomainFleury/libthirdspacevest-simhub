"""
Device discovery - enumerate connected Third Space Vest devices.

This module is part of the vest core package and handles USB device scanning.
It provides functions to find all connected vest hardware.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import usb.core
    import usb.util
    import usb.backend.libusb1
    _usb_available = True
except ImportError:
    usb = None  # type: ignore
    _usb_available = False

from ..legacy_adapter import load_vest_class


def _find_libusb_dll() -> Optional[str]:
    """Find the libusb-1.0.dll path from the libusb package."""
    try:
        import libusb
        # Get the libusb package location
        libusb_path = Path(libusb.__file__).parent
        # Try common DLL locations
        for dll_path in [
            libusb_path / "_platform" / "windows" / "x86_64" / "libusb-1.0.dll",
            libusb_path / "_platform" / "_windows" / "x64" / "libusb-1.0.dll",
            libusb_path / "_platform" / "windows" / "x86" / "libusb-1.0.dll",
            libusb_path / "_platform" / "_windows" / "x86" / "libusb-1.0.dll",
        ]:
            if dll_path.exists():
                return str(dll_path)
    except ImportError:
        pass
    
    # Fallback: search in site-packages
    for site_packages in sys.path:
        if "site-packages" in site_packages:
            for dll_path in [
                Path(site_packages) / "libusb" / "_platform" / "windows" / "x86_64" / "libusb-1.0.dll",
                Path(site_packages) / "libusb" / "_platform" / "_windows" / "x64" / "libusb-1.0.dll",
            ]:
                if dll_path.exists():
                    return str(dll_path)
    
    return None


def _get_usb_backend():
    """Get or create a libusb backend, explicitly loading the DLL if needed."""
    if not _usb_available:
        return None
    
    # Try to get existing backend
    backend = usb.backend.libusb1.get_backend()
    if backend is not None:
        return backend
    
    # If no backend found, try to load it explicitly
    dll_path = _find_libusb_dll()
    if dll_path:
        try:
            backend = usb.backend.libusb1.get_backend(find_library=lambda x: dll_path)
            return backend
        except Exception:
            pass
    
    return None


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
        
        # Get backend explicitly to ensure libusb DLL is loaded
        backend = _get_usb_backend()
        devices = usb.core.find(
            backend=backend,
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

