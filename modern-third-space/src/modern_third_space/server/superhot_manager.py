"""
SUPERHOT VR integration manager.

Handles events from the SUPERHOT VR MelonLoader mod and maps them
to haptic feedback on the Third Space Vest.

The mod connects directly to this daemon via TCP and sends events
in JSON format. This manager processes those events and triggers
the appropriate vest cells.

Event format from mod:
    {"cmd": "superhot_event", "event": "death"}
    {"cmd": "superhot_event", "event": "pistol_recoil", "hand": "right"}
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Any

logger = logging.getLogger(__name__)


@dataclass
class HapticMapping:
    """Defines how a game event maps to vest haptics."""
    cells: List[int]
    speed: int
    duration_ms: int = 200


class SuperHotManager:
    """
    Manager for SUPERHOT VR game events.
    
    Unlike CS2/Alyx which run servers, SuperHot events come directly
    from the MelonLoader mod as TCP commands. This manager just handles
    the event processing and haptic mapping.
    """
    
    # Vest cell layout:
    #   FRONT          BACK
    # ┌───┬───┐    ┌───┬───┐
    # │ 0 │ 1 │    │ 4 │ 5 │  Upper
    # ├───┼───┤    ├───┼───┤
    # │ 2 │ 3 │    │ 6 │ 7 │  Lower
    # └───┴───┘    └───┴───┘
    #   L   R        L   R
    
    # Hand-specific cell mappings
    LEFT_ARM = [0, 4]       # Left upper front + back
    RIGHT_ARM = [1, 5]      # Right upper front + back
    LEFT_SIDE = [0, 2, 4, 6]
    RIGHT_SIDE = [1, 3, 5, 7]
    ALL_CELLS = [0, 1, 2, 3, 4, 5, 6, 7]
    TORSO = [2, 3, 6, 7]    # Lower cells (torso)
    
    # Event to haptic mappings
    EVENT_MAPPINGS: Dict[str, HapticMapping] = {
        # Combat
        "death": HapticMapping(cells=ALL_CELLS, speed=10, duration_ms=1500),
        "punch_hit": HapticMapping(cells=[], speed=7, duration_ms=150),  # Hand-specific
        "bullet_parry": HapticMapping(cells=[], speed=6, duration_ms=100),  # Hand-specific
        
        # Weapons
        "pistol_recoil": HapticMapping(cells=[], speed=5, duration_ms=100),  # Hand-specific
        "shotgun_recoil": HapticMapping(cells=[], speed=8, duration_ms=200),  # Full side
        "uzi_recoil": HapticMapping(cells=[], speed=3, duration_ms=50),  # Hand-specific, rapid
        "no_ammo": HapticMapping(cells=[], speed=2, duration_ms=50),  # Hand-specific
        
        # Actions
        "grab_object": HapticMapping(cells=[], speed=2, duration_ms=100),  # Hand-specific
        "grab_pyramid": HapticMapping(cells=[], speed=3, duration_ms=150),  # Hand-specific
        "throw": HapticMapping(cells=[], speed=4, duration_ms=150),  # Hand-specific
        
        # Special abilities
        "mindwave_charge": HapticMapping(cells=TORSO, speed=5, duration_ms=300),
        "mindwave_release": HapticMapping(cells=ALL_CELLS, speed=10, duration_ms=300),
    }
    
    def __init__(self):
        self._enabled = True
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._on_event: Optional[Callable[[str, str, Optional[str]], None]] = None
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
    
    def set_event_callback(self, callback: Callable[[str, str, Optional[str]], None]) -> None:
        """Set callback for broadcasting events: callback(event_type, event_name, hand)"""
        self._on_event = callback
    
    def set_trigger_callback(self, callback: Callable[[int, int], None]) -> None:
        """Set callback for triggering vest cells: callback(cell, speed)"""
        self._trigger_callback = callback
    
    def enable(self) -> None:
        """Enable SuperHot event processing."""
        self._enabled = True
        logger.info("SUPERHOT VR integration enabled")
    
    def disable(self) -> None:
        """Disable SuperHot event processing."""
        self._enabled = False
        logger.info("SUPERHOT VR integration disabled")
    
    def process_event(self, event_name: str, hand: Optional[str] = None, priority: int = 0) -> bool:
        """
        Process a game event from the SUPERHOT VR mod.
        
        Args:
            event_name: Event name ("death", "pistol_recoil", etc.)
            hand: "left" or "right" for hand-specific events
            priority: Event priority (not currently used for vest)
            
        Returns:
            True if event was processed, False if disabled or unknown event
        """
        if not self._enabled:
            return False
        
        self._events_received += 1
        self._last_event_ts = time.time()
        
        # Get mapping for this event
        mapping = self.EVENT_MAPPINGS.get(event_name)
        if not mapping:
            logger.warning(f"Unknown SUPERHOT event: {event_name}")
            return False
        
        # Determine cells based on hand
        cells = self._get_cells_for_event(event_name, mapping, hand)
        
        # Trigger haptics
        if cells and self._trigger_callback:
            for cell in cells:
                self._trigger_callback(cell, mapping.speed)
        
        # Broadcast event
        if self._on_event:
            self._on_event("superhot_game_event", event_name, hand)
        
        logger.debug(f"SUPERHOT event: {event_name} (hand={hand}, cells={cells}, speed={mapping.speed})")
        return True
    
    def _get_cells_for_event(
        self,
        event_name: str,
        mapping: HapticMapping,
        hand: Optional[str]
    ) -> List[int]:
        """
        Get vest cells for an event, handling hand-specific mappings.
        """
        # If mapping has predefined cells, use them
        if mapping.cells:
            return mapping.cells
        
        # Hand-specific mappings
        if hand == "right":
            if event_name == "shotgun_recoil":
                return self.RIGHT_SIDE
            return self.RIGHT_ARM
        elif hand == "left":
            if event_name == "shotgun_recoil":
                return self.LEFT_SIDE
            return self.LEFT_ARM
        
        # Default to right if no hand specified
        if event_name == "shotgun_recoil":
            return self.RIGHT_SIDE
        return self.RIGHT_ARM
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._enabled,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
        }

