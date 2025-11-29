"""
VestControllerRegistry - manages multiple vest controller instances.

This module provides a registry for managing multiple vest connections
simultaneously, allowing the daemon to support multiple vests.
"""

from __future__ import annotations

import uuid
from typing import Dict, Optional, Any, Union
from ..vest import VestController, VestStatus
from ..vest.mock_controller import MockVestController


class VestControllerRegistry:
    """
    Manages multiple vest controller instances.
    
    Provides:
    - Multiple simultaneous vest connections
    - Device ID generation and tracking
    - Main device management (for backward compatibility)
    - Device lookup and management
    """
    
    def __init__(self) -> None:
        """Initialize an empty registry."""
        self._controllers: Dict[str, Union[VestController, MockVestController]] = {}
        self._device_info: Dict[str, Dict[str, Any]] = {}  # device_id -> device info
        self._main_device_id: Optional[str] = None
        self._mock_counter = 0  # Counter for generating mock serial numbers
    
    def generate_device_id(self) -> str:
        """Generate a unique device ID."""
        return f"device_{uuid.uuid4().hex[:8]}"
    
    def add_device(
        self, 
        device_id: Optional[str], 
        device_info: Dict[str, Any]
    ) -> tuple[str, VestController]:
        """
        Add a new device to the registry.
        
        Args:
            device_id: Optional device ID. If None, a new ID will be generated.
            device_info: Dictionary with device information (bus, address, serial_number, etc.)
        
        Returns:
            Tuple of (device_id, VestController)
        """
        # Generate device_id if not provided
        if device_id is None:
            device_id = self.generate_device_id()
        
        # Check if device already exists (by bus+address or serial)
        existing_id = self._find_existing_device(device_info)
        if existing_id:
            # Device already connected, return existing
            return existing_id, self._controllers[existing_id]
        
        # Create new controller and connect
        controller = VestController()
        status = controller.connect_to_device(device_info)
        
        if not status.connected:
            raise ValueError(f"Failed to connect to device: {status.last_error}")
        
        # Store controller and device info
        self._controllers[device_id] = controller
        self._device_info[device_id] = device_info.copy()
        
        # Set as main if it's the first device
        if self._main_device_id is None:
            self._main_device_id = device_id
        
        return device_id, controller
    
    def _find_existing_device(self, device_info: Dict[str, Any]) -> Optional[str]:
        """
        Find if a device with the same bus+address or serial already exists.
        
        Returns:
            device_id if found, None otherwise
        """
        for device_id, info in self._device_info.items():
            # Match by serial number (preferred)
            if (device_info.get("serial_number") and 
                info.get("serial_number") == device_info.get("serial_number")):
                return device_id
            
            # Match by bus + address
            if (device_info.get("bus") is not None and 
                device_info.get("address") is not None and
                info.get("bus") == device_info.get("bus") and
                info.get("address") == device_info.get("address")):
                return device_id
        
        return None
    
    def get_controller(self, device_id: Optional[str] = None) -> Optional[Union[VestController, MockVestController]]:
        """
        Get controller for device_id, or main device if None.
        
        Args:
            device_id: Device ID to get controller for. If None, returns main device controller.
        
        Returns:
            VestController or MockVestController if found, None otherwise
        """
        if device_id is None:
            device_id = self._main_device_id
        
        if device_id is None:
            return None
        
        return self._controllers.get(device_id)
    
    def remove_device(self, device_id: str) -> bool:
        """
        Remove and disconnect a device from the registry.
        
        Args:
            device_id: Device ID to remove
        
        Returns:
            True if device was removed, False if not found
        """
        if device_id not in self._controllers:
            return False
        
        controller = self._controllers[device_id]
        controller.disconnect()
        
        del self._controllers[device_id]
        del self._device_info[device_id]
        
        # If main device was removed, set new main
        if self._main_device_id == device_id:
            self._main_device_id = next(iter(self._controllers.keys()), None)
        
        return True
    
    def set_main_device(self, device_id: str) -> bool:
        """
        Set the main device (for backward compatibility).
        
        Args:
            device_id: Device ID to set as main
        
        Returns:
            True if device was set as main, False if device not found
        """
        if device_id not in self._controllers:
            return False
        
        self._main_device_id = device_id
        return True
    
    def get_main_device_id(self) -> Optional[str]:
        """Get the main device ID."""
        return self._main_device_id
    
    def list_devices(self) -> list[Dict[str, Any]]:
        """
        List all connected devices.
        
        Returns:
            List of device dictionaries with device_id, is_main, and device info
        """
        return [
            {
                "device_id": device_id,
                "is_main": device_id == self._main_device_id,
                **self._device_info[device_id]
            }
            for device_id in self._controllers.keys()
        ]
    
    def get_device_info(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get device info for a device_id."""
        return self._device_info.get(device_id)
    
    def has_device(self, device_id: str) -> bool:
        """Check if a device_id exists in the registry."""
        return device_id in self._controllers
    
    def count(self) -> int:
        """Get the number of connected devices."""
        return len(self._controllers)
    
    def is_mock_device(self, device_id: str) -> bool:
        """Check if a device is a mock device."""
        return device_id.startswith("mock_")
    
    def count_mock_devices(self) -> int:
        """Get the number of mock devices."""
        return sum(1 for device_id in self._controllers.keys() if self.is_mock_device(device_id))
    
    def add_mock_device(self) -> tuple[str, MockVestController]:
        """
        Add a new mock device to the registry.
        
        Returns:
            Tuple of (device_id, MockVestController)
        
        Raises:
            ValueError: If maximum number of mock devices (20) is reached
        """
        if self.count_mock_devices() >= 20:
            raise ValueError("Maximum number of mock devices (20) reached")
        
        self._mock_counter += 1
        mock_serial = f"MOCK-{self._mock_counter:03d}"
        device_id = f"mock_{uuid.uuid4().hex[:8]}"
        
        controller = MockVestController(mock_serial)
        
        # Store controller and device info
        self._controllers[device_id] = controller
        self._device_info[device_id] = {
            "serial_number": mock_serial,
            "bus": None,
            "address": None,
            "vendor_id": "0x1234",
            "product_id": "0x5678",
            "is_mock": True,
        }
        
        # Set as main if it's the first device
        if self._main_device_id is None:
            self._main_device_id = device_id
        
        return device_id, controller

