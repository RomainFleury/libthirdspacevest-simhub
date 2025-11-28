"""
ULTRAKILL integration manager.

Handles events from the ULTRAKILL BepInEx mod and maps them
to haptic feedback on the Third Space Vest.

The mod connects directly to this daemon via TCP and sends events
in JSON format. This manager processes those events and triggers
the appropriate vest cells.

Event format from mod:
    {"cmd": "ultrakill_event", "event": "damage", "direction": "front", "intensity": 50}
    {"cmd": "ultrakill_event", "event": "death"}
    {"cmd": "ultrakill_event", "event": "revolver_fire"}

Based on research from:
    - OWO_ULTRAKILL: https://github.com/OWODevelopers/OWO_ULTRAKILL
    - Bhaptics_Ultrakill: https://github.com/Evelyn3440/Bhaptics_Ultrakill
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Any

from ..vest.cell_layout import (
    Cell,
    ALL_CELLS,
    FRONT_CELLS,
    BACK_CELLS,
    LEFT_CELLS,
    RIGHT_CELLS,
    UPPER_CELLS,
    LOWER_CELLS,
    FRONT_UPPER,
    FRONT_LOWER,
    BACK_UPPER,
    BACK_LOWER,
)

logger = logging.getLogger(__name__)


@dataclass
class HapticMapping:
    """Defines how a game event maps to vest haptics."""
    cells: List[int]
    speed: int
    duration_ms: int = 200
    directional: bool = False  # If True, cells determined by direction


# Direction to cells mapping
# Based on angle calculation from OWO mod:
# angle = Vector3.SignedAngle(-hitForward, player.forward, Vector3.up) + 180
DIRECTION_CELLS = {
    "front": FRONT_CELLS,      # 135° - 225°
    "back": BACK_CELLS,        # 0° - 45° or 315° - 360°
    "left": LEFT_CELLS,        # 225° - 315°
    "right": RIGHT_CELLS,      # 45° - 135°
}


class UltrakillManager:
    """
    Manager for ULTRAKILL game events.
    
    Receives events from the BepInEx mod via TCP and maps them
    to haptic feedback on the vest.
    
    Cell layout (hardware mapping from cell_layout.py):
    
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    
    # Event to haptic mappings
    EVENT_MAPPINGS: Dict[str, HapticMapping] = {
        # === DAMAGE ===
        "damage": HapticMapping(
            cells=[], speed=7, duration_ms=200, directional=True
        ),
        "death": HapticMapping(
            cells=ALL_CELLS, speed=10, duration_ms=500
        ),
        "explosion": HapticMapping(
            cells=ALL_CELLS, speed=9, duration_ms=400
        ),
        
        # === WEAPONS ===
        "revolver_fire": HapticMapping(
            cells=FRONT_UPPER, speed=5, duration_ms=100
        ),
        "revolver_charge": HapticMapping(
            cells=FRONT_UPPER, speed=3, duration_ms=150
        ),
        "shotgun_fire": HapticMapping(
            cells=FRONT_UPPER, speed=8, duration_ms=150
        ),
        "nailgun_fire": HapticMapping(
            cells=FRONT_UPPER, speed=4, duration_ms=80
        ),
        "railcannon_fire": HapticMapping(
            cells=FRONT_CELLS, speed=10, duration_ms=250
        ),
        "rocket_fire": HapticMapping(
            cells=FRONT_UPPER, speed=7, duration_ms=150
        ),
        "cannonball_fire": HapticMapping(
            cells=FRONT_UPPER, speed=8, duration_ms=200
        ),
        
        # === MELEE ===
        "punch": HapticMapping(
            cells=FRONT_UPPER, speed=6, duration_ms=100
        ),
        "parry": HapticMapping(
            cells=FRONT_UPPER, speed=7, duration_ms=120
        ),
        "hook_throw": HapticMapping(
            cells=FRONT_UPPER, speed=5, duration_ms=100
        ),
        
        # === MOVEMENT ===
        "jump": HapticMapping(
            cells=LOWER_CELLS, speed=3, duration_ms=100
        ),
        "landing": HapticMapping(
            cells=LOWER_CELLS, speed=4, duration_ms=150
        ),
        "stomp": HapticMapping(
            cells=LOWER_CELLS, speed=8, duration_ms=200
        ),
        "dash": HapticMapping(
            cells=[], speed=5, duration_ms=150, directional=True
        ),
        "slide_start": HapticMapping(
            cells=LOWER_CELLS, speed=4, duration_ms=100
        ),
        "wall_jump": HapticMapping(
            cells=LOWER_CELLS, speed=4, duration_ms=100
        ),
        
        # === POWER-UPS ===
        "power_up": HapticMapping(
            cells=ALL_CELLS, speed=4, duration_ms=200
        ),
        "super_charge": HapticMapping(
            cells=ALL_CELLS, speed=5, duration_ms=300
        ),
        "respawn": HapticMapping(
            cells=ALL_CELLS, speed=3, duration_ms=400
        ),
        "dual_wield_start": HapticMapping(
            cells=ALL_CELLS, speed=4, duration_ms=200
        ),
        "dual_wield_end": HapticMapping(
            cells=FRONT_CELLS, speed=2, duration_ms=100
        ),
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
        """Set callback for broadcasting events: callback(event_type, event_name, direction)"""
        self._on_event = callback
    
    def set_trigger_callback(self, callback: Callable[[int, int], None]) -> None:
        """Set callback for triggering vest cells: callback(cell, speed)"""
        self._trigger_callback = callback
    
    def enable(self) -> None:
        """Enable ULTRAKILL event processing."""
        self._enabled = True
        logger.info("ULTRAKILL integration enabled")
    
    def disable(self) -> None:
        """Disable ULTRAKILL event processing."""
        self._enabled = False
        logger.info("ULTRAKILL integration disabled")
    
    def process_event(
        self,
        event_name: str,
        direction: Optional[str] = None,
        intensity: Optional[int] = None
    ) -> bool:
        """
        Process a game event from the ULTRAKILL mod.
        
        Args:
            event_name: Event name ("damage", "death", "revolver_fire", etc.)
            direction: Direction for directional events ("front", "back", "left", "right")
            intensity: Optional intensity override (0-100, maps to speed 1-10)
            
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
            logger.warning(f"Unknown ULTRAKILL event: {event_name}")
            return False
        
        # Determine cells
        if mapping.directional:
            cells = self._get_directional_cells(direction)
        else:
            cells = mapping.cells
        
        # Determine speed (optionally from intensity)
        if intensity is not None:
            # Map 0-100 intensity to 1-10 speed
            speed = max(1, min(10, intensity // 10))
        else:
            speed = mapping.speed
        
        # Trigger haptics
        if cells and self._trigger_callback:
            for cell in cells:
                self._trigger_callback(cell, speed)
        
        # Broadcast event
        if self._on_event:
            self._on_event("ultrakill_game_event", event_name, direction)
        
        logger.debug(
            f"ULTRAKILL event: {event_name} "
            f"(direction={direction}, intensity={intensity}, cells={cells}, speed={speed})"
        )
        return True
    
    def _get_directional_cells(self, direction: Optional[str]) -> List[int]:
        """
        Get vest cells based on direction.
        
        Direction angles (from OWO mod):
        - Front: 135° - 225°
        - Right: 45° - 135°
        - Back: 0° - 45° or 315° - 360°
        - Left: 225° - 315°
        """
        if direction and direction in DIRECTION_CELLS:
            return DIRECTION_CELLS[direction]
        
        # Default to front if no direction
        return FRONT_CELLS
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._enabled,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
        }
