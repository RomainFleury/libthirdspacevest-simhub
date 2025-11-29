"""
Tests for GamePlayerMapping.

These tests verify that the GamePlayerMapping can manage per-game
player-to-device mappings correctly.
"""

import pytest
from modern_third_space.server.game_player_mapping import GamePlayerMapping


class TestGamePlayerMapping:
    """Test suite for GamePlayerMapping."""
    
    def test_init(self):
        """Test manager initialization."""
        mapping = GamePlayerMapping()
        assert mapping.count() == 0
        assert mapping.list_mappings() == []
    
    def test_set_mapping(self):
        """Test setting a mapping."""
        mapping = GamePlayerMapping()
        
        success = mapping.set_mapping("cs2", 1, "device_123")
        assert success is True
        assert mapping.count() == 1
        assert mapping.has_game("cs2")
        assert mapping.has_mapping("cs2", 1)
    
    def test_get_mapping(self):
        """Test getting a mapping."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        device_id = mapping.get_mapping("cs2", 1)
        assert device_id == "device_123"
    
    def test_get_mapping_nonexistent(self):
        """Test getting a non-existent mapping."""
        mapping = GamePlayerMapping()
        
        device_id = mapping.get_mapping("cs2", 1)
        assert device_id is None
        
        mapping.set_mapping("cs2", 1, "device_123")
        device_id = mapping.get_mapping("cs2", 2)
        assert device_id is None
    
    def test_clear_mapping_specific_player(self):
        """Test clearing a specific player mapping."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        mapping.set_mapping("cs2", 2, "device_456")
        assert mapping.count() == 2
        
        success = mapping.clear_mapping("cs2", 1)
        assert success is True
        assert mapping.count() == 1
        assert not mapping.has_mapping("cs2", 1)
        assert mapping.has_mapping("cs2", 2)
    
    def test_clear_mapping_all_players(self):
        """Test clearing all mappings for a game."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        mapping.set_mapping("cs2", 2, "device_456")
        mapping.set_mapping("gtav", 1, "device_789")
        assert mapping.count() == 3
        
        success = mapping.clear_mapping("cs2")
        assert success is True
        assert mapping.count() == 1
        assert not mapping.has_game("cs2")
        assert mapping.has_game("gtav")
    
    def test_clear_mapping_nonexistent(self):
        """Test clearing a non-existent mapping."""
        mapping = GamePlayerMapping()
        
        success = mapping.clear_mapping("cs2", 1)
        assert success is False
    
    def test_list_mappings_all(self):
        """Test listing all mappings."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        mapping.set_mapping("cs2", 2, "device_456")
        mapping.set_mapping("gtav", 1, "device_789")
        
        mappings = mapping.list_mappings()
        assert len(mappings) == 3
        
        # Check structure
        assert all("game_id" in m for m in mappings)
        assert all("player_num" in m for m in mappings)
        assert all("device_id" in m for m in mappings)
    
    def test_list_mappings_specific_game(self):
        """Test listing mappings for a specific game."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        mapping.set_mapping("cs2", 2, "device_456")
        mapping.set_mapping("gtav", 1, "device_789")
        
        mappings = mapping.list_mappings("cs2")
        assert len(mappings) == 2
        assert all(m["game_id"] == "cs2" for m in mappings)
    
    def test_list_mappings_empty_game(self):
        """Test listing mappings for a game with no mappings."""
        mapping = GamePlayerMapping()
        
        mappings = mapping.list_mappings("cs2")
        assert len(mappings) == 0
    
    def test_has_game(self):
        """Test checking if a game has mappings."""
        mapping = GamePlayerMapping()
        
        assert mapping.has_game("cs2") is False
        
        mapping.set_mapping("cs2", 1, "device_123")
        assert mapping.has_game("cs2") is True
        
        mapping.clear_mapping("cs2", 1)
        assert mapping.has_game("cs2") is False
    
    def test_has_mapping(self):
        """Test checking if a specific mapping exists."""
        mapping = GamePlayerMapping()
        
        assert mapping.has_mapping("cs2", 1) is False
        
        mapping.set_mapping("cs2", 1, "device_123")
        assert mapping.has_mapping("cs2", 1) is True
        assert mapping.has_mapping("cs2", 2) is False
    
    def test_count(self):
        """Test counting mappings."""
        mapping = GamePlayerMapping()
        
        assert mapping.count() == 0
        
        mapping.set_mapping("cs2", 1, "device_123")
        assert mapping.count() == 1
        
        mapping.set_mapping("cs2", 2, "device_456")
        assert mapping.count() == 2
        
        mapping.set_mapping("gtav", 1, "device_789")
        assert mapping.count() == 3
    
    def test_clear_all(self):
        """Test clearing all mappings."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        mapping.set_mapping("gtav", 1, "device_789")
        assert mapping.count() == 2
        
        mapping.clear_all()
        assert mapping.count() == 0
        assert mapping.list_mappings() == []
    
    def test_multiple_games(self):
        """Test multiple games with different mappings."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        mapping.set_mapping("cs2", 2, "device_456")
        mapping.set_mapping("gtav", 1, "device_789")
        mapping.set_mapping("roulette", 1, "device_123")
        
        assert mapping.get_mapping("cs2", 1) == "device_123"
        assert mapping.get_mapping("cs2", 2) == "device_456"
        assert mapping.get_mapping("gtav", 1) == "device_789"
        assert mapping.get_mapping("roulette", 1) == "device_123"
    
    def test_reassign_player(self):
        """Test reassigning a player to a different device."""
        mapping = GamePlayerMapping()
        
        mapping.set_mapping("cs2", 1, "device_123")
        assert mapping.get_mapping("cs2", 1) == "device_123"
        
        mapping.set_mapping("cs2", 1, "device_456")
        assert mapping.get_mapping("cs2", 1) == "device_456"
        assert mapping.count() == 1  # Still only one mapping

