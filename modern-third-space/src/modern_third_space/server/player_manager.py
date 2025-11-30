"""
Player Management for Multi-Vest Support.

This module manages the assignment of players to vests, allowing games
to target specific players (Player 1, Player 2, etc.) which map to
specific device_ids.
"""

from __future__ import annotations

from typing import Dict, Optional, List
from dataclasses import dataclass


@dataclass
class Player:
    """Represents a player assignment."""
    player_id: str
    device_id: Optional[str]  # None if unassigned
    name: Optional[str] = None  # Optional human-readable name


class PlayerManager:
    """
    Manages player-to-device assignments.
    
    Players are identified by player_id (e.g., "player_1", "player_2").
    Each player can be assigned to a device_id, or left unassigned.
    Unassigned players will use the main device when triggered.
    """
    
    def __init__(self):
        """Initialize the player manager."""
        self._players: Dict[str, Player] = {}
    
    def create_player(self, player_id: str, name: Optional[str] = None) -> Player:
        """
        Create a new player (or return existing).
        
        Args:
            player_id: Unique identifier for the player (e.g., "player_1")
            name: Optional human-readable name
        
        Returns:
            The Player object
        """
        if player_id in self._players:
            # Update name if provided
            if name is not None:
                self._players[player_id].name = name
            return self._players[player_id]
        
        player = Player(player_id=player_id, device_id=None, name=name)
        self._players[player_id] = player
        return player
    
    def assign_player(self, player_id: str, device_id: str) -> bool:
        """
        Assign a player to a device.
        
        Args:
            player_id: The player to assign
            device_id: The device to assign to
        
        Returns:
            True if assignment successful, False if player doesn't exist
        """
        if player_id not in self._players:
            return False
        
        self._players[player_id].device_id = device_id
        return True
    
    def unassign_player(self, player_id: str) -> bool:
        """
        Unassign a player from their device.
        
        Args:
            player_id: The player to unassign
        
        Returns:
            True if unassignment successful, False if player doesn't exist
        """
        if player_id not in self._players:
            return False
        
        self._players[player_id].device_id = None
        return True
    
    def get_player_device(self, player_id: str) -> Optional[str]:
        """
        Get the device_id assigned to a player.
        
        Args:
            player_id: The player to query
        
        Returns:
            device_id if assigned, None if unassigned or player doesn't exist
        """
        if player_id not in self._players:
            return None
        
        return self._players[player_id].device_id
    
    def get_player(self, player_id: str) -> Optional[Player]:
        """
        Get a player object.
        
        Args:
            player_id: The player to get
        
        Returns:
            Player object or None if not found
        """
        return self._players.get(player_id)
    
    def list_players(self) -> List[Dict[str, any]]:
        """
        List all players with their assignments.
        
        Returns:
            List of player info dictionaries
        """
        return [
            {
                "player_id": player.player_id,
                "device_id": player.device_id,
                "name": player.name,
            }
            for player in self._players.values()
        ]
    
    def has_player(self, player_id: str) -> bool:
        """Check if a player exists."""
        return player_id in self._players
    
    def remove_player(self, player_id: str) -> bool:
        """
        Remove a player entirely.
        
        Args:
            player_id: The player to remove
        
        Returns:
            True if removed, False if player doesn't exist
        """
        if player_id not in self._players:
            return False
        
        del self._players[player_id]
        return True
    
    def count(self) -> int:
        """Get the number of players."""
        return len(self._players)
    
    def clear(self):
        """Clear all players."""
        self._players.clear()

