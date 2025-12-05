"""
Among Us integration manager.

Handles events from the Among Us BepInEx mod and maps them
to haptic feedback on the Third Space Vest.

The mod connects directly to this daemon via TCP and sends events
in JSON format. This manager processes those events and triggers
the appropriate vest cells.

Event format from mod:
    {"cmd": "amongus_event", "event": "player_killed"}
    {"cmd": "amongus_event", "event": "execute_kill"}
    {"cmd": "amongus_event", "event": "ejected"}
    {"cmd": "amongus_event", "event": "emergency_meeting"}
    {"cmd": "amongus_event", "event": "task_complete"}
    {"cmd": "amongus_event", "event": "vent_enter"}
    {"cmd": "amongus_event", "event": "sabotage_reactor"}
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
    UPPER_CELLS,
    LOWER_CELLS,
)

logger = logging.getLogger(__name__)


@dataclass
class HapticMapping:
    """Defines how a game event maps to vest haptics."""
    cells: List[int]
    speed: int
    duration_ms: int = 200


class AmongUsManager:
    """
    Manager for Among Us game events.
    
    Events come directly from the BepInEx mod as TCP commands.
    This manager processes those events and triggers haptic feedback.
    
    Cell layout (hardware mapping from cell_layout.py):
    
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    
    Among Us is a social deduction game with various dramatic events:
    - Being killed by impostor (dramatic full body)
    - Being ejected into space (falling sensation)
    - Executing a kill as impostor (visceral feedback)
    - Emergency meetings and voting
    - Task completion (positive feedback)
    - Sabotages (tension/alarm patterns)
    """
    
    # Event to haptic mappings
    EVENT_MAPPINGS: Dict[str, HapticMapping] = {
        # Kill events - most dramatic
        "player_killed": HapticMapping(
            cells=ALL_CELLS, speed=10, duration_ms=1000
        ),
        "ejected": HapticMapping(
            cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT] + ALL_CELLS,
            speed=8, duration_ms=1500
        ),
        "execute_kill": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT],
            speed=7, duration_ms=200
        ),
        
        # Meeting and voting events
        "emergency_meeting": HapticMapping(
            cells=ALL_CELLS, speed=5, duration_ms=300
        ),
        "body_reported": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT],
            speed=6, duration_ms=250
        ),
        "vote_cast": HapticMapping(
            cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT],
            speed=3, duration_ms=100
        ),
        
        # Task events - subtle positive feedback
        "task_complete": HapticMapping(
            cells=FRONT_CELLS, speed=2, duration_ms=150
        ),
        
        # Vent events - whoosh feeling
        "vent_enter": HapticMapping(
            cells=BACK_CELLS, speed=4, duration_ms=200
        ),
        "vent_exit": HapticMapping(
            cells=FRONT_CELLS, speed=4, duration_ms=200
        ),
        
        # Sabotage events - tension patterns
        "sabotage_reactor": HapticMapping(
            cells=ALL_CELLS, speed=6, duration_ms=300
        ),
        "sabotage_oxygen": HapticMapping(
            cells=UPPER_CELLS, speed=5, duration_ms=300
        ),
        "sabotage_lights": HapticMapping(
            cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT],
            speed=2, duration_ms=100
        ),
        "sabotage_comms": HapticMapping(
            cells=UPPER_CELLS, speed=3, duration_ms=150
        ),
        "sabotage_fixed": HapticMapping(
            cells=FRONT_CELLS, speed=3, duration_ms=200
        ),
        
        # Game state events
        "game_start": HapticMapping(
            cells=ALL_CELLS, speed=4, duration_ms=300
        ),
        "game_end_win": HapticMapping(
            cells=ALL_CELLS, speed=5, duration_ms=500
        ),
        "game_end_lose": HapticMapping(
            cells=LOWER_CELLS, speed=6, duration_ms=500
        ),
    }
    
    def __init__(self):
        self._enabled = True
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
        self._on_event: Optional[Callable[[str, str], None]] = None
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
    
    def set_event_callback(self, callback: Callable[[str, str], None]) -> None:
        """Set callback for broadcasting events: callback(event_type, event_name)"""
        self._on_event = callback
    
    def set_trigger_callback(self, callback: Callable[[int, int], None]) -> None:
        """Set callback for triggering vest cells: callback(cell, speed)"""
        self._trigger_callback = callback
    
    def enable(self) -> None:
        """Enable Among Us event processing."""
        self._enabled = True
        logger.info("Among Us integration enabled")
    
    def disable(self) -> None:
        """Disable Among Us event processing."""
        self._enabled = False
        logger.info("Among Us integration disabled")
    
    def process_event(
        self,
        event_name: str,
        priority: int = 0
    ) -> bool:
        """
        Process a game event from the Among Us mod.
        
        Args:
            event_name: Event name ("player_killed", "ejected", "task_complete", etc.)
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
            logger.warning(f"Unknown Among Us event: {event_name}")
            return False
        
        # Trigger haptics
        if mapping.cells and self._trigger_callback:
            for cell in mapping.cells:
                self._trigger_callback(cell, mapping.speed)
        
        # Broadcast event
        if self._on_event:
            self._on_event("amongus_game_event", event_name)
        
        logger.debug(f"Among Us event: {event_name} (cells={mapping.cells}, speed={mapping.speed})")
        return True
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status."""
        return {
            "enabled": self._enabled,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
            "last_event_type": self._last_event_type,
        }
