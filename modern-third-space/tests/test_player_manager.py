"""
Tests for PlayerManager.

These tests verify that the PlayerManager can manage player assignments
and resolve player IDs to device IDs correctly.
"""

import pytest
from modern_third_space.server.player_manager import PlayerManager, Player


class TestPlayerManager:
    """Test suite for PlayerManager."""
    
    def test_init(self):
        """Test manager initialization."""
        manager = PlayerManager()
        assert manager.count() == 0
        assert manager.list_players() == []
    
    def test_create_player(self):
        """Test creating a player."""
        manager = PlayerManager()
        
        player = manager.create_player("player_1", "Player One")
        
        assert player.player_id == "player_1"
        assert player.name == "Player One"
        assert player.device_id is None
        assert manager.count() == 1
        assert manager.has_player("player_1")
    
    def test_create_player_existing(self):
        """Test creating an existing player (should return existing)."""
        manager = PlayerManager()
        
        player1 = manager.create_player("player_1", "Player One")
        player2 = manager.create_player("player_1", "Updated Name")
        
        assert player1 == player2
        assert player2.name == "Updated Name"  # Name should be updated
        assert manager.count() == 1
    
    def test_assign_player(self):
        """Test assigning a player to a device."""
        manager = PlayerManager()
        
        manager.create_player("player_1")
        success = manager.assign_player("player_1", "device_123")
        
        assert success is True
        assert manager.get_player_device("player_1") == "device_123"
    
    def test_assign_player_nonexistent(self):
        """Test assigning a non-existent player."""
        manager = PlayerManager()
        
        success = manager.assign_player("player_1", "device_123")
        assert success is False
    
    def test_unassign_player(self):
        """Test unassigning a player."""
        manager = PlayerManager()
        
        manager.create_player("player_1")
        manager.assign_player("player_1", "device_123")
        assert manager.get_player_device("player_1") == "device_123"
        
        success = manager.unassign_player("player_1")
        assert success is True
        assert manager.get_player_device("player_1") is None
    
    def test_unassign_player_nonexistent(self):
        """Test unassigning a non-existent player."""
        manager = PlayerManager()
        
        success = manager.unassign_player("player_1")
        assert success is False
    
    def test_get_player_device(self):
        """Test getting a player's device."""
        manager = PlayerManager()
        
        manager.create_player("player_1")
        assert manager.get_player_device("player_1") is None
        
        manager.assign_player("player_1", "device_123")
        assert manager.get_player_device("player_1") == "device_123"
        
        manager.unassign_player("player_1")
        assert manager.get_player_device("player_1") is None
    
    def test_get_player_device_nonexistent(self):
        """Test getting device for non-existent player."""
        manager = PlayerManager()
        
        device_id = manager.get_player_device("player_1")
        assert device_id is None
    
    def test_get_player(self):
        """Test getting a player object."""
        manager = PlayerManager()
        
        player = manager.create_player("player_1", "Player One")
        retrieved = manager.get_player("player_1")
        
        assert retrieved == player
        assert retrieved.player_id == "player_1"
        assert retrieved.name == "Player One"
    
    def test_get_player_nonexistent(self):
        """Test getting a non-existent player."""
        manager = PlayerManager()
        
        player = manager.get_player("player_1")
        assert player is None
    
    def test_list_players(self):
        """Test listing all players."""
        manager = PlayerManager()
        
        manager.create_player("player_1", "Player One")
        manager.create_player("player_2", "Player Two")
        manager.assign_player("player_1", "device_123")
        
        players = manager.list_players()
        assert len(players) == 2
        
        # Check first player
        assert players[0]["player_id"] == "player_1"
        assert players[0]["name"] == "Player One"
        assert players[0]["device_id"] == "device_123"
        
        # Check second player
        assert players[1]["player_id"] == "player_2"
        assert players[1]["name"] == "Player Two"
        assert players[1]["device_id"] is None
    
    def test_has_player(self):
        """Test checking if a player exists."""
        manager = PlayerManager()
        
        assert manager.has_player("player_1") is False
        
        manager.create_player("player_1")
        assert manager.has_player("player_1") is True
    
    def test_remove_player(self):
        """Test removing a player."""
        manager = PlayerManager()
        
        manager.create_player("player_1")
        assert manager.count() == 1
        
        success = manager.remove_player("player_1")
        assert success is True
        assert manager.count() == 0
        assert not manager.has_player("player_1")
    
    def test_remove_player_nonexistent(self):
        """Test removing a non-existent player."""
        manager = PlayerManager()
        
        success = manager.remove_player("player_1")
        assert success is False
    
    def test_clear(self):
        """Test clearing all players."""
        manager = PlayerManager()
        
        manager.create_player("player_1")
        manager.create_player("player_2")
        assert manager.count() == 2
        
        manager.clear()
        assert manager.count() == 0
        assert manager.list_players() == []
    
    def test_multiple_assignments(self):
        """Test multiple players with different assignments."""
        manager = PlayerManager()
        
        manager.create_player("player_1")
        manager.create_player("player_2")
        manager.create_player("player_3")
        
        manager.assign_player("player_1", "device_123")
        manager.assign_player("player_2", "device_456")
        # player_3 remains unassigned
        
        assert manager.get_player_device("player_1") == "device_123"
        assert manager.get_player_device("player_2") == "device_456"
        assert manager.get_player_device("player_3") is None
    
    def test_reassign_player(self):
        """Test reassigning a player to a different device."""
        manager = PlayerManager()
        
        manager.create_player("player_1")
        manager.assign_player("player_1", "device_123")
        assert manager.get_player_device("player_1") == "device_123"
        
        manager.assign_player("player_1", "device_456")
        assert manager.get_player_device("player_1") == "device_456"

