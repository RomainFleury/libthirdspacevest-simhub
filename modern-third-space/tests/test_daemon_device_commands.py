"""
Integration tests for multi-vest device management commands via daemon.

These tests verify that device management commands work correctly
through the daemon protocol, including set_main_device.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import asyncio
from unittest.mock import Mock, patch, AsyncMock
from modern_third_space.server.daemon import VestDaemon
from modern_third_space.server.protocol import Command, CommandType


async def test_device_commands():
    """Test device management commands through daemon."""
    print("Testing device management commands via daemon...")
    
    # Create daemon instance
    daemon = VestDaemon(host="127.0.0.1", port=0)  # Port 0 = auto-assign
    
    # Mock registry to avoid actual USB connections
    with patch.object(daemon._registry, 'has_device', return_value=True):
        with patch.object(daemon._registry, 'set_main_device', return_value=True):
            with patch.object(daemon._registry, 'get_device_info', return_value={"device_id": "device_123", "bus": 1, "address": 5}):
                with patch.object(daemon._clients, 'broadcast', new_callable=AsyncMock) as mock_broadcast:
                    
                    # Test 1: Set main device (success)
                    cmd = Command(
                        cmd=CommandType.SET_MAIN_DEVICE.value,
                        device_id="device_123"
                    )
                    response = await daemon._handle_command(Mock(), cmd)
                    assert response.response == "set_main_device", "Should be set_main_device response"
                    assert response.success is True, "Should succeed"
                    assert response.device is not None, "Should have device"
                    assert response.device.get("device_id") == "device_123", "Should return device_id"
                    assert mock_broadcast.called, "Should broadcast event"
                    print("✓ SET_MAIN_DEVICE command works (success)")
                    
                    # Test 2: Set main device (missing device_id)
                    cmd = Command(
                        cmd=CommandType.SET_MAIN_DEVICE.value
                        # device_id is missing
                    )
                    response = await daemon._handle_command(Mock(), cmd)
                    assert response.response == "set_main_device", "Should be set_main_device response"
                    assert response.success is False, "Should fail"
                    assert "device_id is required" in response.message, "Should have error message"
                    print("✓ SET_MAIN_DEVICE command works (missing device_id)")
                    
                    # Test 3: Set main device (device not found)
                    with patch.object(daemon._registry, 'set_main_device', return_value=False):
                        cmd = Command(
                            cmd=CommandType.SET_MAIN_DEVICE.value,
                            device_id="device_nonexistent"
                        )
                        response = await daemon._handle_command(Mock(), cmd)
                        assert response.response == "set_main_device", "Should be set_main_device response"
                        assert response.success is False, "Should fail"
                        assert "not found" in response.message.lower(), "Should have error message"
                        print("✓ SET_MAIN_DEVICE command works (device not found)")
                    
                    # Test 4: Set main device (broadcast error handling)
                    # Test that response is still returned even if broadcast fails
                    mock_broadcast.reset_mock()
                    mock_broadcast.side_effect = Exception("Broadcast failed")
                    with patch.object(daemon._registry, 'set_main_device', return_value=True):
                        cmd = Command(
                            cmd=CommandType.SET_MAIN_DEVICE.value,
                            device_id="device_123"
                        )
                        response = await daemon._handle_command(Mock(), cmd)
                        # Should still succeed even if broadcast fails
                        assert response.response == "set_main_device", "Should be set_main_device response"
                        assert response.success is True, "Should succeed despite broadcast error"
                        assert response.device is not None, "Should have device"
                        assert response.device.get("device_id") == "device_123", "Should return device_id"
                        print("✓ SET_MAIN_DEVICE command works (broadcast error handled)")
    
    print("\n[OK] All device management command tests passed!")


if __name__ == "__main__":
    asyncio.run(test_device_commands())

