"""
Integration tests for game-specific player mapping commands via daemon.

These tests verify that game mapping commands work correctly
through the daemon protocol.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import asyncio
from unittest.mock import Mock, patch
from modern_third_space.server.daemon import VestDaemon
from modern_third_space.server.protocol import Command, CommandType


async def test_game_mapping_commands():
    """Test game mapping commands through daemon."""
    print("Testing game mapping commands via daemon...")
    
    # Create daemon instance
    daemon = VestDaemon(host="127.0.0.1", port=0)
    
    # Mock registry to avoid actual USB connections
    with patch.object(daemon._registry, 'has_device', return_value=True):
        
        # Test 1: Set game player mapping
        cmd = Command(
            cmd=CommandType.SET_GAME_PLAYER_MAPPING.value,
            game_id="cs2",
            player_num=1,
            device_id="device_123"
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert response.response == "set_game_player_mapping", "Should be set_game_player_mapping response"
        assert response.success is True, "Should succeed"
        assert daemon._game_mapping.get_mapping("cs2", 1) == "device_123", "Mapping should be set"
        print("✓ SET_GAME_PLAYER_MAPPING command works")
        
        # Test 2: List game mappings (all)
        cmd = Command(cmd=CommandType.LIST_GAME_PLAYER_MAPPINGS.value)
        response = await daemon._handle_command(Mock(), cmd)
        assert response.response == "list_game_player_mappings", "Should be list_game_player_mappings response"
        assert len(response.devices) == 1, "Should have 1 mapping"
        assert response.devices[0]["game_id"] == "cs2", "Should have cs2 mapping"
        assert response.devices[0]["player_num"] == 1, "Should have player 1"
        assert response.devices[0]["device_id"] == "device_123", "Should have device_123"
        print("✓ LIST_GAME_PLAYER_MAPPINGS command works")
        
        # Test 3: List game mappings (specific game)
        daemon._game_mapping.set_mapping("gtav", 1, "device_456")
        cmd = Command(
            cmd=CommandType.LIST_GAME_PLAYER_MAPPINGS.value,
            game_id="cs2"
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert len(response.devices) == 1, "Should have 1 cs2 mapping"
        assert all(m["game_id"] == "cs2" for m in response.devices), "All should be cs2"
        print("✓ LIST_GAME_PLAYER_MAPPINGS for specific game works")
        
        # Test 4: Clear specific player mapping
        cmd = Command(
            cmd=CommandType.CLEAR_GAME_PLAYER_MAPPING.value,
            game_id="cs2",
            player_num=1
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert response.response == "clear_game_player_mapping", "Should be clear_game_player_mapping response"
        assert response.success is True, "Should succeed"
        assert daemon._game_mapping.get_mapping("cs2", 1) is None, "Mapping should be cleared"
        print("✓ CLEAR_GAME_PLAYER_MAPPING for specific player works")
        
        # Test 5: Clear all mappings for game
        daemon._game_mapping.set_mapping("cs2", 1, "device_123")
        daemon._game_mapping.set_mapping("cs2", 2, "device_456")
        cmd = Command(
            cmd=CommandType.CLEAR_GAME_PLAYER_MAPPING.value,
            game_id="cs2"
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert response.success is True, "Should succeed"
        assert not daemon._game_mapping.has_game("cs2"), "All cs2 mappings should be cleared"
        print("✓ CLEAR_GAME_PLAYER_MAPPING for all players works")
        
        # Test 6: Error handling - missing game_id
        cmd = Command(
            cmd=CommandType.SET_GAME_PLAYER_MAPPING.value,
            player_num=1,
            device_id="device_123"
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert response.success is False, "Should fail without game_id"
        assert "game_id is required" in response.message, "Should have error message"
        print("✓ Error handling works (missing game_id)")
        
        # Test 7: Error handling - missing player_num
        cmd = Command(
            cmd=CommandType.SET_GAME_PLAYER_MAPPING.value,
            game_id="cs2",
            device_id="device_123"
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert response.success is False, "Should fail without player_num"
        assert "player_num is required" in response.message, "Should have error message"
        print("✓ Error handling works (missing player_num)")
        
        # Test 8: Error handling - missing device_id
        cmd = Command(
            cmd=CommandType.SET_GAME_PLAYER_MAPPING.value,
            game_id="cs2",
            player_num=1
        )
        response = await daemon._handle_command(Mock(), cmd)
        assert response.success is False, "Should fail without device_id"
        assert "device_id is required" in response.message, "Should have error message"
        print("✓ Error handling works (missing device_id)")
        
        # Test 9: Error handling - non-existent device
        with patch.object(daemon._registry, 'has_device', return_value=False):
            cmd = Command(
                cmd=CommandType.SET_GAME_PLAYER_MAPPING.value,
                game_id="cs2",
                player_num=1,
                device_id="nonexistent_device"
            )
            response = await daemon._handle_command(Mock(), cmd)
            assert response.success is False, "Should fail with non-existent device"
            assert "not found" in response.message, "Should have error message"
            print("✓ Error handling works (non-existent device)")
    
    print("\n[OK] All daemon game mapping command tests passed!")


if __name__ == "__main__":
    try:
        asyncio.run(test_game_mapping_commands())
        print("\n[SUCCESS] All game mapping tests passed!")
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

