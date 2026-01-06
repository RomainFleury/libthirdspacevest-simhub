"""
Manual test script for PlayerManager.

Run this script to verify the PlayerManager works correctly:
    python tests/test_player_manager_manual.py

This script uses no mocks and doesn't require actual hardware.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from modern_third_space.server.player_manager import PlayerManager


def test_basic_functionality():
    """Test basic PlayerManager functionality."""
    print("Testing PlayerManager...")
    
    manager = PlayerManager()
    
    # Test 1: Initial state
    assert manager.count() == 0, "Manager should start empty"
    assert manager.list_players() == [], "Should have no players"
    print("✓ Initial state correct")
    
    # Test 2: Create player
    player = manager.create_player("player_1", "Player One")
    assert player.player_id == "player_1", "Player ID should match"
    assert player.name == "Player One", "Player name should match"
    assert player.device_id is None, "Player should start unassigned"
    assert manager.count() == 1, "Should have 1 player"
    print("✓ Create player works")
    
    # Test 3: Assign player
    success = manager.assign_player("player_1", "device_123")
    assert success is True, "Assignment should succeed"
    assert manager.get_player_device("player_1") == "device_123", "Device should be assigned"
    print("✓ Assign player works")
    
    # Test 4: Unassign player
    success = manager.unassign_player("player_1")
    assert success is True, "Unassignment should succeed"
    assert manager.get_player_device("player_1") is None, "Device should be unassigned"
    print("✓ Unassign player works")
    
    # Test 5: Reassign player
    manager.assign_player("player_1", "device_456")
    assert manager.get_player_device("player_1") == "device_456", "Device should be reassigned"
    print("✓ Reassign player works")
    
    # Test 6: Create multiple players
    manager.create_player("player_2", "Player Two")
    manager.create_player("player_3")
    assert manager.count() == 3, "Should have 3 players"
    print("✓ Create multiple players works")
    
    # Test 7: List players
    players = manager.list_players()
    assert len(players) == 3, "Should list 3 players"
    assert players[0]["player_id"] == "player_1", "First player should be player_1"
    assert players[1]["player_id"] == "player_2", "Second player should be player_2"
    assert players[2]["player_id"] == "player_3", "Third player should be player_3"
    print("✓ List players works")
    
    # Test 8: Get player
    player = manager.get_player("player_1")
    assert player is not None, "Should get player"
    assert player.player_id == "player_1", "Player ID should match"
    print("✓ Get player works")
    
    # Test 9: Remove player
    success = manager.remove_player("player_2")
    assert success is True, "Removal should succeed"
    assert manager.count() == 2, "Should have 2 players left"
    assert not manager.has_player("player_2"), "Player should be removed"
    print("✓ Remove player works")
    
    # Test 10: Clear all
    manager.clear()
    assert manager.count() == 0, "Should have no players"
    print("✓ Clear all works")
    
    print("\n[OK] All tests passed!")


if __name__ == "__main__":
    try:
        test_basic_functionality()
        print("\n[SUCCESS] PlayerManager is working correctly!")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[ERROR] Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

