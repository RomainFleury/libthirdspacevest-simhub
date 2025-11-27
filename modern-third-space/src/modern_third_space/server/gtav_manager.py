"""
GTA V integration manager.

Handles events from the GTA V Script Hook V .NET mod and maps them
to haptic feedback on the Third Space Vest.

The mod connects directly to this daemon via TCP and sends events
in JSON format. This manager processes those events and triggers
the appropriate vest cells.

Event format from mod:
    {"cmd": "gtav_event", "event": "player_damage", "angle": 45.0, "damage": 25, "health_remaining": 75}
    {"cmd": "gtav_event", "event": "player_death", "cause": "gunshot"}
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Any

from ..vest.cell_layout import (
    ALL_CELLS,
    Cell,
    FRONT_CELLS,
    BACK_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
)

logger = logging.getLogger(__name__)


@dataclass
class HapticMapping:
    """Defines how a game event maps to vest haptics."""
    cells: List[int]
    speed: int
    duration_ms: int = 200


def angle_to_cells(angle: float) -> List[int]:
    """
    Convert damage angle (degrees) to vest cells.
    
    Angle convention:
    - 0° = front
    - 90° = right
    - 180° = back
    - 270° = left
    
    Returns list of cell indices (0-7) that should be activated.
    """
    # Normalize angle to 0-360
    while angle < 0:
        angle += 360
    while angle >= 360:
        angle -= 360
    
    # Vest cell layout (hardware indices):
    # Front: 2 (UL), 5 (UR), 3 (LL), 4 (LR)
    # Back:  1 (UL), 6 (UR), 0 (LL), 7 (LR)
    
    if angle >= 315 or angle < 45:
        # Front (0-45° and 315-360°)
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    elif angle >= 45 and angle < 135:
        # Right side (45-135°)
        return RIGHT_SIDE
    elif angle >= 135 and angle < 225:
        # Back (135-225°)
        return BACK_CELLS
    else:  # 225-315
        # Left side (225-315°)
        return LEFT_SIDE


def damage_to_intensity(damage: float) -> int:
    """
    Calculate haptic intensity (speed 1-10) based on damage amount.
    
    Scaling:
    - Light damage (0-25): speed 3-5
    - Medium damage (25-50): speed 5-7
    - Heavy damage (50-100): speed 7-10
    """
    if damage <= 0:
        return 0
    if damage < 25:
        return max(3, int(damage / 5))
    if damage < 50:
        return 5 + int((damage - 25) / 12.5)
    return min(10, 7 + int((damage - 50) / 16.67))


class GTAVManager:
    """
    Manager for GTA V game events.
    
    Events come directly from the Script Hook V .NET mod as TCP commands.
    This manager processes those events and triggers haptic feedback.
    
    Cell layout (hardware mapping from cell_layout.py):
    
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    
    def __init__(self):
        self._enabled = True
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
        self._on_event: Optional[Callable[[str, Dict[str, Any]], None]] = None
        self._trigger_callback: Optional[Callable[[int, int], None]] = None
        
    @property
    def enabled(self) -> bool:
        return self._enabled
    
    @property
    def events_received(self) -> int:
        return self._events_received
    
    @property
    def last_event_ts(self) -> Optional[float]:
        return self._last_event_ts
    
    @property
    def last_event_type(self) -> Optional[str]:
        return self._last_event_type
    
    def set_event_callback(self, callback: Callable[[str, Dict[str, Any]], None]) -> None:
        """Set callback for broadcasting events: callback(event_type, params)"""
        self._on_event = callback
    
    def set_trigger_callback(self, callback: Callable[[int, int], None]) -> None:
        """Set callback for triggering vest cells: callback(cell, speed)"""
        self._trigger_callback = callback
    
    def enable(self) -> None:
        """Enable GTA V event processing."""
        self._enabled = True
        logger.info("GTA V integration enabled")
    
    def disable(self) -> None:
        """Disable GTA V event processing."""
        self._enabled = False
        logger.info("GTA V integration disabled")
    
    def process_event(
        self,
        event_name: str,
        angle: Optional[float] = None,
        damage: Optional[float] = None,
        health_remaining: Optional[float] = None,
        cause: Optional[str] = None
    ) -> bool:
        """
        Process a game event from the GTA V mod.
        
        Args:
            event_name: Event name ("player_damage", "player_death")
            angle: Damage angle in degrees (0-360, 0=front, 90=right, 180=back, 270=left)
            damage: Damage amount (for player_damage)
            health_remaining: Remaining health (for player_damage)
            cause: Death cause (for player_death)
            
        Returns:
            True if event was processed, False if disabled or unknown event
        """
        if not self._enabled:
            return False
        
        self._events_received += 1
        self._last_event_ts = time.time()
        self._last_event_type = event_name
        
        # Build params dict for event callback
        params: Dict[str, Any] = {}
        if angle is not None:
            params["angle"] = angle
        if damage is not None:
            params["damage"] = damage
        if health_remaining is not None:
            params["health_remaining"] = health_remaining
        if cause is not None:
            params["cause"] = cause
        
        # Process event and trigger haptics
        if event_name == "player_damage":
            self._handle_player_damage(angle or 0, damage or 0)
        elif event_name == "player_death":
            self._handle_player_death()
        else:
            logger.warning(f"Unknown GTA V event: {event_name}")
            return False
        
        # Broadcast event
        if self._on_event:
            self._on_event("gtav_game_event", params)
        
        logger.debug(f"GTA V event: {event_name} (params={params})")
        return True
    
    def _handle_player_damage(self, angle: float, damage: float):
        """Handle player damage event - directional haptics."""
        # Calculate cells based on damage angle
        cells = angle_to_cells(angle)
        
        # Calculate intensity based on damage amount
        speed = damage_to_intensity(damage)
        
        # Trigger haptics
        if cells and self._trigger_callback:
            for cell in cells:
                self._trigger_callback(cell, speed)
        
        logger.info(f"GTA V: Player took {damage} damage from angle {angle}° (cells={cells}, speed={speed})")
    
    def _handle_player_death(self):
        """Handle player death event - full vest pulse."""
        # All cells at maximum intensity
        if self._trigger_callback:
            for cell in ALL_CELLS:
                self._trigger_callback(cell, 10)
        
        logger.info("GTA V: Player died - full vest pulse")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._enabled,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
            "last_event_type": self._last_event_type,
        }

