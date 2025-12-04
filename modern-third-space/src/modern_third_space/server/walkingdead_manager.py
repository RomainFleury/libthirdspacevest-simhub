"""
Walking Dead: Saints and Sinners integration manager.

Handles events from the Walking Dead VR game and maps them
to haptic feedback on the Third Space Vest.

Walking Dead is an Unreal Engine game, so unlike Unity games that use
MelonLoader, this integration relies on a separate memory reader process
that sends events to this manager via the daemon protocol.

Event format:
    {"cmd": "walkingdead_event", "event": "gun_fire", "hand": "right"}
    {"cmd": "walkingdead_event", "event": "zombie_grab", "side": "left"}
    {"cmd": "walkingdead_event", "event": "damage"}

Reference: https://github.com/McFredward/twd_bhaptics
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Any

from ..vest.cell_layout import (
    ALL_CELLS, FRONT_CELLS, LOWER_CELLS, LEFT_ARM, RIGHT_ARM,
    LEFT_SIDE, RIGHT_SIDE, Cell
)

logger = logging.getLogger(__name__)


@dataclass
class HapticMapping:
    """Defines how a game event maps to vest haptics."""
    cells: List[int]
    speed: int
    duration_ms: int = 200
    is_looping: bool = False


class WalkingDeadManager:
    """
    Manager for Walking Dead: Saints and Sinners game events.
    
    Unlike Unity games with MelonLoader mods, Walking Dead events come from
    a separate Python memory reader that monitors the game process and sends
    events to this manager via TCP.
    
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
        # Gunfire events (hand-specific)
        "gun_fire": HapticMapping(cells=[], speed=6, duration_ms=100),
        "gun_fire_two_hand": HapticMapping(cells=[], speed=7, duration_ms=150),
        
        # Zombie interactions (side-specific)
        "zombie_grab": HapticMapping(cells=[], speed=7, duration_ms=300),
        "zombie_hold": HapticMapping(cells=[], speed=4, duration_ms=500, is_looping=True),
        "zombie_release": HapticMapping(cells=[], speed=3, duration_ms=150),
        
        # Damage and health
        "damage": HapticMapping(cells=FRONT_CELLS, speed=8, duration_ms=200),
        "bullet_hit": HapticMapping(cells=FRONT_CELLS, speed=9, duration_ms=250),
        "healing": HapticMapping(cells=FRONT_CELLS, speed=3, duration_ms=500),
        "low_health": HapticMapping(cells=FRONT_CELLS, speed=5, duration_ms=400, is_looping=True),
        
        # Stamina
        "low_stamina": HapticMapping(cells=LOWER_CELLS, speed=4, duration_ms=400, is_looping=True),
        
        # Inventory interactions
        "backpack_out": HapticMapping(
            cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_LOWER_LEFT],  # Back left
            speed=4, duration_ms=200
        ),
        "backpack_in": HapticMapping(
            cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_LOWER_LEFT],
            speed=4, duration_ms=200
        ),
        "shoulder_out": HapticMapping(
            cells=[Cell.BACK_UPPER_RIGHT, Cell.BACK_LOWER_RIGHT],  # Back right
            speed=4, duration_ms=200
        ),
        "shoulder_in": HapticMapping(
            cells=[Cell.BACK_UPPER_RIGHT, Cell.BACK_LOWER_RIGHT],
            speed=4, duration_ms=200
        ),
        "item_store": HapticMapping(
            cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_LOWER_LEFT],
            speed=3, duration_ms=150
        ),
        
        # Actions
        "eating": HapticMapping(cells=LOWER_CELLS, speed=2, duration_ms=300, is_looping=True),
        "lamp_out": HapticMapping(cells=[Cell.FRONT_UPPER_LEFT], speed=3, duration_ms=150),
        "book_out": HapticMapping(cells=[Cell.FRONT_UPPER_LEFT], speed=3, duration_ms=150),
    }
    
    def __init__(self):
        self._enabled = True
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
        self._on_event: Optional[Callable[[str, str, Optional[str]], None]] = None
        self._trigger_callback: Optional[Callable[[int, int], None]] = None
        
        # Looping effect state
        self._low_health_active = False
        self._low_stamina_active = False
        self._zombie_hold_active: Dict[str, bool] = {"left": False, "right": False}
        self._eating_active = False
        
        # Loop tasks
        self._loop_tasks: List[asyncio.Task] = []
        
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
        """Set callback for broadcasting events: callback(event_type, event_name, side/hand)"""
        self._on_event = callback
    
    def set_trigger_callback(self, callback: Callable[[int, int], None]) -> None:
        """Set callback for triggering vest cells: callback(cell, speed)"""
        self._trigger_callback = callback
    
    def enable(self) -> None:
        """Enable Walking Dead event processing."""
        self._enabled = True
        logger.info("Walking Dead: Saints and Sinners integration enabled")
    
    def disable(self) -> None:
        """Disable Walking Dead event processing and stop all loops."""
        self._enabled = False
        
        # Stop all looping effects
        self._low_health_active = False
        self._low_stamina_active = False
        self._zombie_hold_active = {"left": False, "right": False}
        self._eating_active = False
        
        # Cancel loop tasks
        for task in self._loop_tasks:
            task.cancel()
        self._loop_tasks.clear()
        
        logger.info("Walking Dead: Saints and Sinners integration disabled")
    
    def process_event(
        self,
        event_name: str,
        hand: Optional[str] = None,
        side: Optional[str] = None,
        is_two_hand: bool = False,
        priority: int = 0
    ) -> bool:
        """
        Process a game event from the Walking Dead memory reader.
        
        Args:
            event_name: Event name ("gun_fire", "zombie_grab", "damage", etc.)
            hand: "left" or "right" for hand-specific events
            side: "left" or "right" for side-specific events (zombie attacks)
            is_two_hand: True if holding weapon with both hands
            priority: Event priority (not currently used)
            
        Returns:
            True if event was processed, False if disabled or unknown event
        """
        if not self._enabled:
            return False
        
        self._events_received += 1
        self._last_event_ts = time.time()
        self._last_event_type = event_name
        
        # Handle looping effect toggles
        if event_name == "low_health_start":
            self._start_heartbeat_loop()
            return True
        elif event_name == "low_health_stop":
            self._low_health_active = False
            return True
        elif event_name == "low_stamina_start":
            self._start_stamina_loop()
            return True
        elif event_name == "low_stamina_stop":
            self._low_stamina_active = False
            return True
        elif event_name == "eating_start":
            self._start_eating_loop()
            return True
        elif event_name == "eating_stop":
            self._eating_active = False
            return True
        elif event_name == "zombie_hold_start":
            self._start_zombie_hold_loop(side or "right")
            return True
        elif event_name == "zombie_hold_stop":
            if side:
                self._zombie_hold_active[side] = False
            else:
                self._zombie_hold_active = {"left": False, "right": False}
            return True
        
        # Get mapping for this event
        if is_two_hand and event_name == "gun_fire":
            event_name = "gun_fire_two_hand"
        
        mapping = self.EVENT_MAPPINGS.get(event_name)
        if not mapping:
            logger.warning(f"Unknown Walking Dead event: {event_name}")
            return False
        
        # Determine cells based on hand/side
        cells = self._get_cells_for_event(event_name, mapping, hand, side, is_two_hand)
        
        # Trigger haptics
        if cells and self._trigger_callback:
            for cell in cells:
                self._trigger_callback(cell, mapping.speed)
        
        # Broadcast event
        if self._on_event:
            side_or_hand = hand or side
            self._on_event("walkingdead_game_event", event_name, side_or_hand)
        
        logger.debug(f"Walking Dead event: {event_name} (hand={hand}, side={side}, cells={cells})")
        return True
    
    def _get_cells_for_event(
        self,
        event_name: str,
        mapping: HapticMapping,
        hand: Optional[str],
        side: Optional[str],
        is_two_hand: bool
    ) -> List[int]:
        """
        Get vest cells for an event, handling hand/side-specific mappings.
        """
        # If mapping has predefined cells, use them
        if mapping.cells:
            return mapping.cells
        
        # Gun fire with two hands
        if event_name == "gun_fire_two_hand":
            if hand == "right":
                # Primary right, secondary left
                return [
                    Cell.FRONT_UPPER_RIGHT, Cell.BACK_UPPER_RIGHT,  # Primary
                    Cell.FRONT_UPPER_LEFT,  # Secondary (weaker)
                ]
            else:
                # Primary left, secondary right
                return [
                    Cell.FRONT_UPPER_LEFT, Cell.BACK_UPPER_LEFT,  # Primary
                    Cell.FRONT_UPPER_RIGHT,  # Secondary (weaker)
                ]
        
        # Hand-specific (gun fire, one-handed)
        if hand:
            if hand == "right":
                return RIGHT_ARM
            elif hand == "left":
                return LEFT_ARM
        
        # Side-specific (zombie attacks)
        if side:
            if side == "right":
                return [Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT]
            elif side == "left":
                return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT]
        
        # Default to front cells
        return FRONT_CELLS
    
    def _start_heartbeat_loop(self) -> None:
        """Start the heartbeat loop for low health."""
        if self._low_health_active:
            return
        self._low_health_active = True
        
        async def heartbeat_loop():
            while self._low_health_active and self._enabled:
                if self._trigger_callback:
                    # Pulse front cells
                    for cell in FRONT_CELLS:
                        self._trigger_callback(cell, 5)
                await asyncio.sleep(1.0)
        
        try:
            loop = asyncio.get_event_loop()
            task = loop.create_task(heartbeat_loop())
            self._loop_tasks.append(task)
        except RuntimeError:
            logger.warning("No event loop available for heartbeat loop")
    
    def _start_stamina_loop(self) -> None:
        """Start the stamina loop for low endurance."""
        if self._low_stamina_active:
            return
        self._low_stamina_active = True
        
        import random
        
        async def stamina_loop():
            while self._low_stamina_active and self._enabled:
                if self._trigger_callback:
                    for cell in LOWER_CELLS:
                        self._trigger_callback(cell, 4)
                # Random interval like the original mod
                await asyncio.sleep(random.uniform(0.8, 2.0))
        
        try:
            loop = asyncio.get_event_loop()
            task = loop.create_task(stamina_loop())
            self._loop_tasks.append(task)
        except RuntimeError:
            logger.warning("No event loop available for stamina loop")
    
    def _start_eating_loop(self) -> None:
        """Start the eating loop."""
        if self._eating_active:
            return
        self._eating_active = True
        
        async def eating_loop():
            while self._eating_active and self._enabled:
                if self._trigger_callback:
                    for cell in LOWER_CELLS:
                        self._trigger_callback(cell, 2)
                await asyncio.sleep(1.6)
        
        try:
            loop = asyncio.get_event_loop()
            task = loop.create_task(eating_loop())
            self._loop_tasks.append(task)
        except RuntimeError:
            logger.warning("No event loop available for eating loop")
    
    def _start_zombie_hold_loop(self, side: str) -> None:
        """Start the zombie hold loop for a specific side."""
        if self._zombie_hold_active.get(side):
            return
        self._zombie_hold_active[side] = True
        
        cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT] if side == "left" else \
                [Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT]
        
        async def zombie_loop():
            while self._zombie_hold_active.get(side) and self._enabled:
                if self._trigger_callback:
                    for cell in cells:
                        self._trigger_callback(cell, 4)
                await asyncio.sleep(1.0)
        
        try:
            loop = asyncio.get_event_loop()
            task = loop.create_task(zombie_loop())
            self._loop_tasks.append(task)
        except RuntimeError:
            logger.warning("No event loop available for zombie hold loop")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._enabled,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
            "last_event_type": self._last_event_type,
            "loops_active": {
                "low_health": self._low_health_active,
                "low_stamina": self._low_stamina_active,
                "zombie_hold_left": self._zombie_hold_active.get("left", False),
                "zombie_hold_right": self._zombie_hold_active.get("right", False),
                "eating": self._eating_active,
            },
        }
