"""
MockVestController - mock vest controller for testing without hardware.

This controller implements the same interface as VestController but
only logs effects instead of sending USB commands. Useful for testing
multi-vest features without physical hardware.
"""

from __future__ import annotations

import logging
from typing import Optional
from .status import VestStatus

logger = logging.getLogger(__name__)


class MockVestController:
    """
    Mock controller for testing without physical hardware.
    
    Implements the same interface as VestController but:
    - Always reports as connected
    - Logs effects instead of sending USB commands
    - Tracks last triggered effects for debugging
    """
    
    def __init__(self, mock_serial_number: str) -> None:
        """
        Initialize mock controller.
        
        Args:
            mock_serial_number: Serial number for this mock device (e.g., "MOCK-001")
        """
        self._mock_serial = mock_serial_number
        self._status = VestStatus(
            connected=True,
            device_serial_number=mock_serial_number,
            device_vendor_id=0x1234,  # Fake vendor ID
            device_product_id=0x5678,  # Fake product ID
        )
        self._last_effects: list[tuple[int, int]] = []  # List of (cell, speed) tuples
    
    def connect(self) -> VestStatus:
        """Mock connect - always succeeds."""
        return self._status
    
    def connect_to_device(self, device_info: Optional[dict]) -> VestStatus:
        """Mock connect - always succeeds."""
        return self._status
    
    def disconnect(self) -> None:
        """Mock disconnect - clears last effects."""
        self._last_effects = []
        logger.info(f"[MOCK {self._mock_serial}] Disconnected")
    
    def status(self) -> VestStatus:
        """Get current status (always connected for mock)."""
        return self._status
    
    def trigger_effect(self, cell_index: int, speed: int) -> bool:
        """
        Log an effect instead of sending to hardware.
        
        Args:
            cell_index: Actuator cell index (0-7)
            speed: Vibration speed (0-10)
        
        Returns:
            Always True (mock always succeeds)
        """
        self._last_effects.append((cell_index, speed))
        # Keep only last 100 effects to avoid memory issues
        if len(self._last_effects) > 100:
            self._last_effects = self._last_effects[-100:]
        
        logger.info(
            f"[MOCK {self._mock_serial}] Effect triggered: cell={cell_index}, speed={speed}"
        )
        return True
    
    def stop_all(self) -> None:
        """Log stop all command."""
        self._last_effects.append((-1, 0))  # Special marker for "stop all"
        logger.info(f"[MOCK {self._mock_serial}] Stop all effects")
    
    @property
    def mock_serial_number(self) -> str:
        """Get the mock serial number."""
        return self._mock_serial
    
    @property
    def last_effects(self) -> list[tuple[int, int]]:
        """Get the last triggered effects (for debugging)."""
        return self._last_effects.copy()

