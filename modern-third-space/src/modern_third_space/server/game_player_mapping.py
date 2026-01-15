"""
Game-Specific Player Mapping for Multi-Vest Support.

This module manages per-game player-to-device mappings, allowing each game
to map its players (1, 2, 3...) to specific vests independently.
"""

from __future__ import annotations

from typing import Dict, Optional, List, Tuple


class GamePlayerMapping:
    """
    Manages game-specific player-to-device mappings.
    
    Each game can have its own mapping of player numbers (1, 2, 3...) to device_ids.
    This allows different games to use different vest assignments for the same
    player numbers.
    
    Example:
        - Game "cs2" maps Player 1 → device_123, Player 2 → device_456
        - Game "alyx" maps Player 1 → device_789 (different assignment)
    """
    
    def __init__(self):
        """Initialize the game player mapping manager."""
        # Structure: {game_id: {player_num: device_id}}
        self._mappings: Dict[str, Dict[int, str]] = {}
    
    def set_mapping(self, game_id: str, player_num: int, device_id: str) -> bool:
        """
        Set a player mapping for a game.
        
        Args:
            game_id: The game identifier (e.g., "cs2", "alyx")
            player_num: Player number (1, 2, 3...)
            device_id: The device to map to
        
        Returns:
            True if mapping was set successfully
        """
        if game_id not in self._mappings:
            self._mappings[game_id] = {}
        
        self._mappings[game_id][player_num] = device_id
        return True
    
    def get_mapping(self, game_id: str, player_num: int) -> Optional[str]:
        """
        Get the device_id for a game's player number.
        
        Args:
            game_id: The game identifier
            player_num: Player number (1, 2, 3...)
        
        Returns:
            device_id if mapped, None if not mapped
        """
        if game_id not in self._mappings:
            return None
        
        return self._mappings[game_id].get(player_num)
    
    def clear_mapping(self, game_id: str, player_num: Optional[int] = None) -> bool:
        """
        Clear a mapping for a game.
        
        Args:
            game_id: The game identifier
            player_num: If provided, clear only this player's mapping.
                       If None, clear all mappings for the game.
        
        Returns:
            True if mapping(s) were cleared, False if game not found
        """
        if game_id not in self._mappings:
            return False
        
        if player_num is None:
            # Clear all mappings for this game
            del self._mappings[game_id]
        else:
            # Clear specific player mapping
            if player_num in self._mappings[game_id]:
                del self._mappings[game_id][player_num]
                # If no mappings left for this game, remove the game entry
                if not self._mappings[game_id]:
                    del self._mappings[game_id]
        
        return True
    
    def list_mappings(self, game_id: Optional[str] = None) -> List[Dict[str, any]]:
        """
        List all mappings.
        
        Args:
            game_id: If provided, list only mappings for this game.
                    If None, list all mappings.
        
        Returns:
            List of mapping dictionaries with game_id, player_num, device_id
        """
        result = []
        
        if game_id:
            # List mappings for specific game
            if game_id in self._mappings:
                for player_num, device_id in self._mappings[game_id].items():
                    result.append({
                        "game_id": game_id,
                        "player_num": player_num,
                        "device_id": device_id,
                    })
        else:
            # List all mappings
            for gid, mappings in self._mappings.items():
                for player_num, device_id in mappings.items():
                    result.append({
                        "game_id": gid,
                        "player_num": player_num,
                        "device_id": device_id,
                    })
        
        return result
    
    def has_game(self, game_id: str) -> bool:
        """Check if a game has any mappings."""
        return game_id in self._mappings
    
    def has_mapping(self, game_id: str, player_num: int) -> bool:
        """Check if a specific mapping exists."""
        if game_id not in self._mappings:
            return False
        return player_num in self._mappings[game_id]
    
    def count(self) -> int:
        """Get total number of mappings across all games."""
        return sum(len(mappings) for mappings in self._mappings.values())
    
    def clear_all(self):
        """Clear all mappings."""
        self._mappings.clear()

