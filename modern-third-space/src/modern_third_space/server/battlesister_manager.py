"""
Warhammer 40,000: Battle Sister integration manager.

A MelonLoader mod in the game connects to the daemon as a TCP client and sends
`battlesister_event` commands. This manager maps those events to vest cells and
optional USB-relay solenoid recoil.

Harmony hooks are adapted from:
https://github.com/floh-bhaptics/BattleSister_bhaptics
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

from ..relay.recoil import (
    DEFAULT_RECOIL_MS,
    duration_ms_for_weapon,
    parse_solenoid_settings,
)
from ..vest.cell_layout import (
    ALL_CELLS,
    LEFT_ARM,
    LEFT_SIDE,
    LOWER_CELLS,
    RIGHT_ARM,
    RIGHT_SIDE,
    Cell,
)

logger = logging.getLogger(__name__)

GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]
RecoilCallback = Callable[[int], None]


@dataclass
class BattleSisterEvent:
    """Parsed event from the Battle Sister MelonLoader mod."""

    type: str
    raw: str = ""
    params: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = 0.0

    def __post_init__(self) -> None:
        if self.timestamp == 0.0:
            self.timestamp = time.time()


def _hand_is_left(hand: Optional[str]) -> Optional[bool]:
    raw = str(hand or "").strip().lower()
    if raw in ("left", "l"):
        return True
    if raw in ("right", "r"):
        return False
    return None


def cells_for_hit_angle(angle: Optional[float]) -> List[int]:
    """
    Map bHaptics-style hit rotation to vest cells.

    0° is front, 90° is left, 180° is back, 270° is right.
    """
    if angle is None:
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    try:
        a = float(angle) % 360.0
    except (TypeError, ValueError):
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    if a < 0:
        a += 360.0
    if a < 45.0 or a >= 315.0:
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    if a < 135.0:
        return list(LEFT_SIDE)
    if a < 225.0:
        return [Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT]
    return list(RIGHT_SIDE)


def map_event_to_haptics(event: BattleSisterEvent) -> List[Tuple[int, int]]:
    """Map a Battle Sister event to vest (cell, speed) commands."""
    event_type = str(event.type or "")
    hand_left = _hand_is_left(event.params.get("hand"))
    angle = event.params.get("angle")
    commands: List[Tuple[int, int]] = []

    if event_type == "gun_fire":
        speed = 5
        cells = LEFT_ARM if hand_left else RIGHT_ARM if hand_left is False else LEFT_ARM + RIGHT_ARM
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "shotgun_fire":
        speed = 8
        if hand_left is True:
            cells = list(LEFT_SIDE)
        elif hand_left is False:
            cells = list(RIGHT_SIDE)
        else:
            cells = list(ALL_CELLS)
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "melee_hit":
        speed = 6
        cells = LEFT_ARM if hand_left else RIGHT_ARM if hand_left is False else LEFT_ARM + RIGHT_ARM
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "two_hand":
        speed = 3
        cells = LEFT_ARM if hand_left else RIGHT_ARM if hand_left is False else LEFT_ARM + RIGHT_ARM
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "player_hit":
        commands.extend((cell, 7) for cell in cells_for_hit_angle(angle if isinstance(angle, (int, float)) else None))

    elif event_type == "blade_hit":
        commands.extend((cell, 8) for cell in cells_for_hit_angle(angle if isinstance(angle, (int, float)) else None))

    elif event_type == "explosion":
        # ProcessImpact explosions include a hit angle; bomb explodes do not.
        if isinstance(angle, (int, float)):
            commands.extend((cell, 9) for cell in cells_for_hit_angle(angle))
        else:
            commands.extend((cell, 9) for cell in LOWER_CELLS)

    elif event_type == "death":
        commands.extend((cell, 10) for cell in ALL_CELLS)

    elif event_type == "low_health":
        commands.append((Cell.FRONT_LOWER_LEFT, 3))
        commands.append((Cell.FRONT_LOWER_RIGHT, 3))

    elif event_type == "low_health_end":
        pass

    return commands


class BattleSisterManager:
    """
    TCP-client handler for Warhammer 40,000: Battle Sister.

    Start/stop enable processing so stray events do nothing until armed.
    """

    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
        on_recoil: Optional[RecoilCallback] = None,
    ) -> None:
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        self.on_recoil = on_recoil
        self._enabled = False
        self.events_received = 0
        self.last_event_ts: Optional[float] = None
        self.last_event_type: Optional[str] = None
        self._solenoid_enabled = True
        self._solenoid_recoil_ms = DEFAULT_RECOIL_MS

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def is_running(self) -> bool:
        return self._enabled

    def enable(self, solenoid_recoil: Optional[Dict[str, Any]] = None) -> None:
        settings = parse_solenoid_settings(solenoid_recoil)
        self._solenoid_enabled = bool(settings["enabled"])
        self._solenoid_recoil_ms = int(settings["duration_ms"])
        self._enabled = True
        logger.info(
            "[battlesister] enabled (solenoid_recoil=%s duration_ms=%s)",
            self._solenoid_enabled,
            self._solenoid_recoil_ms,
        )

    def disable(self) -> None:
        self._enabled = False
        logger.info("[battlesister] disabled")

    def start(self, solenoid_recoil: Optional[Dict[str, Any]] = None) -> Tuple[bool, Optional[str]]:
        self.enable(solenoid_recoil)
        return True, None

    def stop(self) -> bool:
        self.disable()
        return True

    def process_event(
        self,
        event_name: str,
        hand: Optional[str] = None,
        priority: int = 0,
        angle: Optional[float] = None,
    ) -> bool:
        """Handle one battlesister_event from the game mod. Returns False if ignored."""
        if not self._enabled:
            return False
        name = str(event_name or "").strip()
        if not name:
            return False

        params: Dict[str, Any] = {"priority": int(priority or 0)}
        if hand:
            params["hand"] = str(hand)
        if angle is not None:
            try:
                params["angle"] = float(angle)
            except (TypeError, ValueError):
                pass

        event = BattleSisterEvent(type=name, raw=name, params=params)
        self.events_received += 1
        self.last_event_ts = event.timestamp
        self.last_event_type = name

        if self.on_game_event:
            self.on_game_event(name, params)

        for cell, speed in map_event_to_haptics(event):
            self._trigger(cell, speed)

        if self._solenoid_enabled and name in ("gun_fire", "shotgun_fire"):
            weapon = "shotgun" if name == "shotgun_fire" else "pistol"
            duration_ms = duration_ms_for_weapon(weapon, self._solenoid_recoil_ms)
            self._pulse_recoil(duration_ms)

        return True

    def _trigger(self, cell: int, speed: int) -> None:
        if not self.on_trigger:
            return
        self.on_trigger(int(cell), int(speed))

    def _pulse_recoil(self, duration_ms: int) -> None:
        if not self.on_recoil:
            return
        self.on_recoil(int(duration_ms))
