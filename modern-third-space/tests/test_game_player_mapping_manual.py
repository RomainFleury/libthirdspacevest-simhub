"""
Manual test script for GamePlayerMapping.

Run this script to verify the GamePlayerMapping works correctly:
    python tests/test_game_player_mapping_manual.py

This script uses no mocks and doesn't require actual hardware.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from modern_third_space.server.game_player_mapping import GamePlayerMapping


def test_basic_functionality():
    """Test basic GamePlayerMapping functionality."""
    print("Testing GamePlayerMapping...")
    
    mapping = GamePlayerMapping()
    
    # Test 1: Initial state
    assert mapping.count() == 0, "Mapping should start empty"
    assert mapping.list_mappings() == [], "Should have no mappings"
    print("✓ Initial state correct")
    
    # Test 2: Set mapping
    success = mapping.set_mapping("cs2", 1, "device_123")
    assert success is True, "Setting mapping should succeed"
    assert mapping.count() == 1, "Should have 1 mapping"
    assert mapping.has_game("cs2"), "Should have game cs2"
    assert mapping.has_mapping("cs2", 1), "Should have mapping for player 1"
    print("✓ Set mapping works")
    
    # Test 3: Get mapping
    device_id = mapping.get_mapping("cs2", 1)
    assert device_id == "device_123", "Should get correct device_id"
    print("✓ Get mapping works")
    
    # Test 4: Multiple players for same game
    mapping.set_mapping("cs2", 2, "device_456")
    assert mapping.count() == 2, "Should have 2 mappings"
    assert mapping.get_mapping("cs2", 2) == "device_456", "Should get correct device for player 2"
    print("✓ Multiple players for same game works")
    
    # Test 5: Multiple games
    mapping.set_mapping("gtav", 1, "device_789")
    assert mapping.count() == 3, "Should have 3 mappings"
    assert mapping.get_mapping("gtav", 1) == "device_789", "Should get correct device for gtav"
    print("✓ Multiple games works")
    
    # Test 6: List mappings (all)
    mappings = mapping.list_mappings()
    assert len(mappings) == 3, "Should list 3 mappings"
    assert all("game_id" in m for m in mappings), "All mappings should have game_id"
    assert all("player_num" in m for m in mappings), "All mappings should have player_num"
    assert all("device_id" in m for m in mappings), "All mappings should have device_id"
    print("✓ List all mappings works")
    
    # Test 7: List mappings (specific game)
    cs2_mappings = mapping.list_mappings("cs2")
    assert len(cs2_mappings) == 2, "Should list 2 cs2 mappings"
    assert all(m["game_id"] == "cs2" for m in cs2_mappings), "All should be cs2"
    print("✓ List mappings for specific game works")
    
    # Test 8: Clear specific player mapping
    success = mapping.clear_mapping("cs2", 1)
    assert success is True, "Clearing should succeed"
    assert mapping.count() == 2, "Should have 2 mappings left"
    assert not mapping.has_mapping("cs2", 1), "Player 1 mapping should be cleared"
    assert mapping.has_mapping("cs2", 2), "Player 2 mapping should still exist"
    print("✓ Clear specific player mapping works")
    
    # Test 9: Clear all mappings for game
    mapping.set_mapping("cs2", 1, "device_123")  # Re-add for test
    success = mapping.clear_mapping("cs2")
    assert success is True, "Clearing all should succeed"
    assert not mapping.has_game("cs2"), "cs2 should have no mappings"
    assert mapping.has_game("gtav"), "gtav should still have mappings"
    print("✓ Clear all mappings for game works")
    
    # Test 10: Clear all
    mapping.set_mapping("cs2", 1, "device_123")
    mapping.clear_all()
    assert mapping.count() == 0, "Should have no mappings"
    print("✓ Clear all works")
    
    print("\n✅ All tests passed!")


if __name__ == "__main__":
    try:
        test_basic_functionality()
        print("\n🎉 GamePlayerMapping is working correctly!")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

