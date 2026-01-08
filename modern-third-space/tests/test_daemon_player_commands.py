"""
Integration tests for player management commands via daemon.

These tests verify that player management commands work correctly
through the daemon protocol.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import asyncio
import json
import pytest
from unittest.mock import Mock, patch, AsyncMock
from modern_third_space.server.daemon import VestDaemon
from modern_third_space.server.protocol import Command, CommandType

pytestmark = pytest.mark.asyncio


async def test_player_commands():
    """Test player management commands through daemon."""
    print("Testing player management commands via daemon...")
    
    # Create daemon instance
    daemon = VestDaemon(host="127.0.0.1", port=0)  # Port 0 = auto-assign
    
    # Mock registry to avoid actual USB connections
    with patch.object(daemon._registry, 'has_device', return_value=True):
        with patch.object(daemon._registry, 'get_device_info', return_value={"bus": 1, "address": 5}):
            
            # Test 1: Create player
            cmd = Command(cmd=CommandType.CREATE_PLAYER.value, player_id="player_1")
            response = await daemon._handle_command(Mock(), cmd)
            assert response.response == "create_player", "Should be create_player response"
            assert response.success is True, "Should succeed"
            print("✓ CREATE_PLAYER command works")
            
            # Test 2: List players
            cmd = Command(cmd=CommandType.LIST_PLAYERS.value)
            response = await daemon._handle_command(Mock(), cmd)
            assert response.response == "list_players", "Should be list_players response"
            assert len(response.devices) == 1, "Should have 1 player"
            assert response.devices[0]["player_id"] == "player_1", "Should have player_1"
            print("✓ LIST_PLAYERS command works")
            
            # Test 3: Assign player
            cmd = Command(
                cmd=CommandType.ASSIGN_PLAYER.value,
                player_id="player_1",
                device_id="device_123"
            )
            response = await daemon._handle_command(Mock(), cmd)
            assert response.response == "assign_player", "Should be assign_player response"
            assert response.success is True, "Should succeed"
            print("✓ ASSIGN_PLAYER command works")
            
            # Test 4: Get player device
            cmd = Command(cmd=CommandType.GET_PLAYER_DEVICE.value, player_id="player_1")
            response = await daemon._handle_command(Mock(), cmd)
            assert response.response == "get_player_device", "Should be get_player_device response"
            assert response.device is not None, "Should have device"
            assert response.device.get("device_id") == "device_123", "Should return device_123"
            print("✓ GET_PLAYER_DEVICE command works")
            
            # Test 5: Unassign player
            cmd = Command(cmd=CommandType.UNASSIGN_PLAYER.value, player_id="player_1")
            response = await daemon._handle_command(Mock(), cmd)
            assert response.response == "unassign_player", "Should be unassign_player response"
            assert response.success is True, "Should succeed"
            print("✓ UNASSIGN_PLAYER command works")
            
            # Test 6: Get player device after unassign
            cmd = Command(cmd=CommandType.GET_PLAYER_DEVICE.value, player_id="player_1")
            response = await daemon._handle_command(Mock(), cmd)
            assert response.device is None, "Should return None after unassign"
            print("✓ GET_PLAYER_DEVICE after unassign works")
            
            # Test 7: Error handling - missing player_id
            cmd = Command(cmd=CommandType.ASSIGN_PLAYER.value, device_id="device_123")
            response = await daemon._handle_command(Mock(), cmd)
            assert response.success is False, "Should fail without player_id"
            assert "player_id is required" in response.message, "Should have error message"
            print("✓ Error handling works (missing player_id)")
            
            # Test 8: Error handling - missing device_id
            cmd = Command(cmd=CommandType.ASSIGN_PLAYER.value, player_id="player_1")
            response = await daemon._handle_command(Mock(), cmd)
            assert response.success is False, "Should fail without device_id"
            assert "device_id is required" in response.message, "Should have error message"
            print("✓ Error handling works (missing device_id)")
            
            # Test 9: Error handling - non-existent device
            cmd = Command(
                cmd=CommandType.ASSIGN_PLAYER.value,
                player_id="player_1",
                device_id="nonexistent_device"
            )
            with patch.object(daemon._registry, 'has_device', return_value=False):
                response = await daemon._handle_command(Mock(), cmd)
                assert response.success is False, "Should fail with non-existent device"
                assert "not found" in response.message, "Should have error message"
            print("✓ Error handling works (non-existent device)")
    
    print("\n[OK] All daemon player command tests passed!")


async def test_player_id_resolution():
    """Test that player_id resolves to device_id in trigger command."""
    print("\nTesting player_id resolution in trigger command...")
    
    daemon = VestDaemon(host="127.0.0.1", port=0)
    
    # Setup: Create player and assign to device
    daemon._player_manager.create_player("player_1")
    daemon._player_manager.assign_player("player_1", "device_123")
    
    # Mock registry and controller
    mock_controller = Mock()
    mock_status = Mock()
    mock_status.connected = True
    mock_controller.status.return_value = mock_status
    mock_controller.trigger.return_value = None
    
    # Mock get_controller to track calls
    original_get_controller = daemon._registry.get_controller
    call_args = []
    
    def tracked_get_controller(device_id=None):
        call_args.append(device_id)
        if device_id == "device_123":
            return mock_controller
        return None
    
    daemon._registry.get_controller = tracked_get_controller
    
    with patch.object(daemon._registry, 'get_main_device_id', return_value="device_main"):
        with patch.object(daemon._registry, 'has_device', return_value=True):
            # Test: Trigger with player_id
            cmd = Command(
                cmd=CommandType.TRIGGER.value,
                player_id="player_1",
                cell=0,
                speed=5
            )
            response = await daemon._handle_command(Mock(), cmd)
            # Should succeed and use device_123
            assert response.response == "ok", "Should succeed"
            # Verify controller was called with device_123
            assert "device_123" in call_args, "Should have called get_controller with device_123"
            print("✓ player_id resolves to device_id in trigger")
    
    # Test: Unassigned player falls back to main device
    daemon._player_manager.unassign_player("player_1")
    call_args.clear()
    
    def tracked_get_controller2(device_id=None):
        call_args.append(device_id)
        if device_id == "device_main":
            return mock_controller
        return None
    
    daemon._registry.get_controller = tracked_get_controller2
    
    with patch.object(daemon._registry, 'get_main_device_id', return_value="device_main"):
        with patch.object(daemon._registry, 'has_device', return_value=True):
            cmd = Command(
                cmd=CommandType.TRIGGER.value,
                player_id="player_1",
                cell=0,
                speed=5
            )
            response = await daemon._handle_command(Mock(), cmd)
            # Should succeed and use main device
            assert response.response == "ok", "Should succeed"
            # Verify controller was called with main device
            assert "device_main" in call_args, "Should have called get_controller with main device"
            print("✓ Unassigned player falls back to main device")
    
    print("[OK] Player ID resolution tests passed!")


if __name__ == "__main__":
    try:
        asyncio.run(test_player_commands())
        asyncio.run(test_player_id_resolution())
        print("\n[SUCCESS] All player management tests passed!")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

