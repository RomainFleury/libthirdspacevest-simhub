"""
Tests for device resolution logic.

These tests verify that the device resolution fallback chain works correctly:
1. Direct device_id
2. Game-specific mapping (game_id + player_num)
3. Global player mapping (player_id)
4. Main device
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import asyncio
import pytest
from unittest.mock import Mock, patch
from modern_third_space.server.daemon import VestDaemon
from modern_third_space.server.protocol import Command, CommandType

pytestmark = pytest.mark.asyncio


async def test_device_resolution():
    """Test device resolution logic with all fallback scenarios."""
    print("Testing device resolution logic...")
    
    daemon = VestDaemon(host="127.0.0.1", port=0)
    
    # Setup: Create devices, players, and mappings
    with patch.object(daemon._registry, 'has_device', return_value=True):
        # Add devices to registry (mocked)
        daemon._registry._devices = {
            "device_main": Mock(),
            "device_123": Mock(),
            "device_456": Mock(),
        }
        daemon._registry._main_device_id = "device_main"
        
        # Create player and assign to device
        daemon._player_manager.create_player("player_1")
        daemon._player_manager.assign_player("player_1", "device_123")
        
        # Create game mapping
        daemon._game_mapping.set_mapping("cs2", 1, "device_456")
        
        # Test 1: Direct device_id (highest priority)
        device_id = daemon._resolve_device_id(Command(cmd="trigger", device_id="device_123"))
        assert device_id == "device_123", "Direct device_id should be used"
        print("✓ Direct device_id resolution works")
        
        # Test 2: Game-specific mapping
        device_id = daemon._resolve_device_id(Command(cmd="trigger", game_id="cs2", player_num=1))
        assert device_id == "device_456", "Game-specific mapping should be used"
        print("✓ Game-specific mapping resolution works")
        
        # Test 3: Global player mapping
        device_id = daemon._resolve_device_id(Command(cmd="trigger", player_id="player_1"))
        assert device_id == "device_123", "Global player mapping should be used"
        print("✓ Global player mapping resolution works")
        
        # Test 4: Main device fallback
        device_id = daemon._resolve_device_id(Command(cmd="trigger"))
        assert device_id == "device_main", "Main device should be used as fallback"
        print("✓ Main device fallback works")
        
        # Test 5: Game mapping takes priority over player mapping
        # (when both are specified, game mapping wins)
        device_id = daemon._resolve_device_id(Command(
            cmd="trigger",
            game_id="cs2",
            player_num=1,
            player_id="player_1"
        ))
        assert device_id == "device_456", "Game mapping should take priority over player mapping"
        print("✓ Game mapping priority over player mapping works")
        
        # Test 6: Player mapping when game mapping doesn't exist
        device_id = daemon._resolve_device_id(Command(
            cmd="trigger",
            game_id="gtav",  # No mapping for this game
            player_num=1,
            player_id="player_1"
        ))
        assert device_id == "device_123", "Should fall back to player mapping"
        print("✓ Fallback to player mapping works")
        
        # Test 7: Unassigned player falls back to main device
        daemon._player_manager.create_player("player_2")  # Unassigned
        device_id = daemon._resolve_device_id(Command(cmd="trigger", player_id="player_2"))
        assert device_id == "device_main", "Unassigned player should use main device"
        print("✓ Unassigned player fallback works")
        
        # Test 8: Non-existent game mapping falls back to player
        device_id = daemon._resolve_device_id(Command(
            cmd="trigger",
            game_id="nonexistent",
            player_num=1,
            player_id="player_1"
        ))
        assert device_id == "device_123", "Should fall back to player mapping"
        print("✓ Non-existent game mapping fallback works")
    
    print("\n[OK] All device resolution tests passed!")


async def test_trigger_with_resolution():
    """Test that trigger command uses resolution logic correctly."""
    print("\nTesting trigger command with device resolution...")
    
    daemon = VestDaemon(host="127.0.0.1", port=0)
    
    # Setup
    with patch.object(daemon._registry, 'has_device', return_value=True):
        mock_controller = Mock()
        mock_status = Mock()
        mock_status.connected = True
        mock_controller.status.return_value = mock_status
        mock_controller.trigger_effect.return_value = True
        
        daemon._registry._devices = {
            "device_main": mock_controller,
            "device_123": mock_controller,
        }
        daemon._registry._main_device_id = "device_main"
        
        # Mock get_controller to return our mock
        def get_controller(device_id=None):
            return mock_controller
        
        daemon._registry.get_controller = get_controller
        
        # Create game mapping
        daemon._game_mapping.set_mapping("cs2", 1, "device_123")
        
        # Test: Trigger with game_id + player_num
        cmd = Command(
            cmd=CommandType.TRIGGER.value,
            game_id="cs2",
            player_num=1,
            cell=0,
            speed=5
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert response.response == "ok", "Trigger should succeed"
        # Verify controller was called
        assert mock_controller.trigger_effect.called, "Controller should be called"
        print("✓ Trigger with game_id + player_num works")
    
    print("[OK] Trigger resolution tests passed!")


if __name__ == "__main__":
    try:
        asyncio.run(test_device_resolution())
        asyncio.run(test_trigger_with_resolution())
        print("\n[SUCCESS] All device resolution tests passed!")
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

