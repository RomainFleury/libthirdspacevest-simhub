"""
Pistol Whip integration manager.

Handles events from the Pistol Whip MelonLoader mod and maps them
to haptic feedback on the Third Space Vest.

The mod connects directly to this daemon via TCP and sends events
in JSON format. This manager processes those events and triggers
the appropriate vest cells.

Event format from mod:
    {"cmd": "pistolwhip_event", "event": "gun_fire", "hand": "right"}
    {"cmd": "pistolwhip_event", "event": "shotgun_fire", "hand": "left"}
    {"cmd": "pistolwhip_event", "event": "melee_hit", "hand": "right"}
    {"cmd": "pistolwhip_event", "event": "reload_hip", "hand": "left"}
    {"cmd": "pistolwhip_event", "event": "reload_shoulder", "hand": "right"}
    {"cmd": "pistolwhip_event", "event": "player_hit"}
    {"cmd": "pistolwhip_event", "event": "death"}
    {"cmd": "pistolwhip_event", "event": "low_health"}
    {"cmd": "pistolwhip_event", "event": "healing"}
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


class PistolWhipManager:
    """
    Manager for Pistol Whip game events.
    
    Events come directly from the MelonLoader mod as TCP commands.
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
    
    # Event to haptic mappings (adapted from bHaptics/OWO mods for 8-cell vest)
    EVENT_MAPPINGS: Dict[str, HapticMapping] = {
        # Gun fire - hand-specific recoil
        "gun_fire": HapticMapping(cells=[], speed=5, duration_ms=80),  # Hand-specific
        "shotgun_fire": HapticMapping(cells=[], speed=8, duration_ms=150),  # Hand-specific, stronger
        
        # Melee
        "melee_hit": HapticMapping(cells=[], speed=6, duration_ms=100),  # Hand-specific
        
        # Reload - position-specific
        "reload_hip": HapticMapping(cells=[], speed=4, duration_ms=200),  # Hand-specific, lower
        "reload_shoulder": HapticMapping(cells=[], speed=4, duration_ms=200),  # Hand-specific, upper
        
        # Player events
        "player_hit": HapticMapping(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=7, duration_ms=150),
        "death": HapticMapping(cells=ALL_CELLS, speed=10, duration_ms=1000),
        "low_health": HapticMapping(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=3, duration_ms=150),
        "healing": HapticMapping(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT, Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=4, duration_ms=300),
        # Empty gun - subtle click feedback
        "empty_gun_fire": HapticMapping(cells=[], speed=2, duration_ms=50),  # Hand-specific, very subtle
    }
    
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
    
    def set_event_callback(self, callback: Callable[[str, str, Optional[str]], None]) -> None:
        """Set callback for broadcasting events: callback(event_type, event_name, hand)"""
        self._on_event = callback
    
    def set_trigger_callback(self, callback: Callable[[int, int], None]) -> None:
        """Set callback for triggering vest cells: callback(cell, speed)"""
        self._trigger_callback = callback
    
    def enable(self) -> None:
        """Enable Pistol Whip event processing."""
        self._enabled = True
        logger.info("Pistol Whip integration enabled")
    
    def disable(self) -> None:
        """Disable Pistol Whip event processing."""
        self._enabled = False
        logger.info("Pistol Whip integration disabled")
    
    def process_event(
        self,
        event_name: str,
        hand: Optional[str] = None,
        priority: int = 0
    ) -> bool:
        """
        Process a game event from the Pistol Whip mod.
        
        Args:
            event_name: Event name ("gun_fire", "shotgun_fire", "melee_hit", etc.)
            hand: "left" or "right" for hand-specific events
            priority: Event priority (not currently used for vest)
            
        Returns:
            True if event was processed, False if disabled or unknown event
        """
        if not self._enabled:
            return False
        
        self._events_received += 1
        self._last_event_ts = time.time()
        self._last_event_type = event_name
        
        # Get mapping for this event
        mapping = self.EVENT_MAPPINGS.get(event_name)
        if not mapping:
            logger.warning(f"Unknown Pistol Whip event: {event_name}")
            return False
        
        # Determine cells based on event type and hand
        cells = self._get_cells_for_event(event_name, mapping, hand)
        
        # Trigger haptics
        if cells and self._trigger_callback:
            for cell in cells:
                self._trigger_callback(cell, mapping.speed)
        
        # Broadcast event (use event_type field like SUPERHOT)
        if self._on_event:
            self._on_event("pistolwhip_game_event", event_name, hand)
        
        logger.debug(f"Pistol Whip event: {event_name} (hand={hand}, cells={cells}, speed={mapping.speed})")
        return True
    
    def _get_cells_for_event(
        self,
        event_name: str,
        mapping: HapticMapping,
        hand: Optional[str]
    ) -> List[int]:
        """
        Get vest cells for an event, handling hand-specific mappings.
        
        Uses correct hardware cell layout from cell_layout module.
        """
        # If mapping has predefined cells, use them
        if mapping.cells:
            return mapping.cells
        
        # Hand-specific mappings (using correct hardware layout)
        if hand == "right":
            if event_name == "shotgun_fire":
                # Shotgun: full right side for heavy recoil
                return RIGHT_SIDE
            elif event_name in ["gun_fire", "melee_hit"]:
                # Regular gun/melee: right upper cells (front and back)
                return [Cell.FRONT_UPPER_RIGHT, Cell.BACK_UPPER_RIGHT]
            elif event_name == "reload_hip":
                # Hip reload: lower right
                return [Cell.FRONT_LOWER_RIGHT]
            elif event_name == "reload_shoulder":
                # Shoulder reload: upper back right
                return [Cell.BACK_UPPER_RIGHT]
            elif event_name == "empty_gun_fire":
                # Empty gun: very subtle click on hand side
                return [Cell.FRONT_UPPER_RIGHT]
        elif hand == "left":
            if event_name == "shotgun_fire":
                # Shotgun: full left side for heavy recoil
                return LEFT_SIDE
            elif event_name in ["gun_fire", "melee_hit"]:
                # Regular gun/melee: left upper cells (front and back)
                return [Cell.FRONT_UPPER_LEFT, Cell.BACK_UPPER_LEFT]
            elif event_name == "reload_hip":
                # Hip reload: lower left
                return [Cell.FRONT_LOWER_LEFT]
            elif event_name == "reload_shoulder":
                # Shoulder reload: upper back left
                return [Cell.BACK_UPPER_LEFT]
            elif event_name == "empty_gun_fire":
                # Empty gun: very subtle click on hand side
                return [Cell.FRONT_UPPER_LEFT]
        
        # Default to right if no hand specified
        if event_name == "shotgun_fire":
            return RIGHT_SIDE
        return [Cell.FRONT_UPPER_RIGHT, Cell.BACK_UPPER_RIGHT]
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._enabled,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
            "last_event_type": self._last_event_type,
        }

