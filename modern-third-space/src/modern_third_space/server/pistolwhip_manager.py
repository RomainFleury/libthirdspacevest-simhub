"""
Pistol Whip integration manager.

A MelonLoader mod in the game connects to the daemon as a TCP client and sends
`pistolwhip_event` commands. This manager maps those events to vest cells and
optional USB-relay solenoid recoil.

Harmony hooks are adapted from the open-source bHaptics/OWO mods:
https://github.com/floh-bhaptics/PistolWhip_bhaptics
https://github.com/floh-bhaptics/PistolWhip_OWO
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
    LOWER_CELLS,
    RIGHT_ARM,
    Cell,
)

logger = logging.getLogger(__name__)

GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]
RecoilCallback = Callable[[int], None]


@dataclass
class PistolWhipEvent:
    """Parsed event from the Pistol Whip MelonLoader mod."""

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


def map_event_to_haptics(event: PistolWhipEvent) -> List[Tuple[int, int]]:
    """
    Map a Pistol Whip event to vest (cell, speed) commands.

    Uses hardware cell constants from vest.cell_layout (not sequential 0–7 UI order).
    """
    event_type = str(event.type or "")
    hand_left = _hand_is_left(event.params.get("hand"))
    commands: List[Tuple[int, int]] = []

    if event_type == "gun_fire":
        speed = 5
        cells = LEFT_ARM if hand_left else RIGHT_ARM if hand_left is False else LEFT_ARM + RIGHT_ARM
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "shotgun_fire":
        speed = 8
        if hand_left is True:
            cells = [
                Cell.FRONT_UPPER_LEFT,
                Cell.FRONT_LOWER_LEFT,
                Cell.BACK_UPPER_LEFT,
                Cell.BACK_LOWER_LEFT,
            ]
        elif hand_left is False:
            cells = [
                Cell.FRONT_UPPER_RIGHT,
                Cell.FRONT_LOWER_RIGHT,
                Cell.BACK_UPPER_RIGHT,
                Cell.BACK_LOWER_RIGHT,
            ]
        else:
            cells = list(ALL_CELLS)
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "empty_gun_fire":
        speed = 2
        cells = LEFT_ARM if hand_left else RIGHT_ARM if hand_left is False else LEFT_ARM
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "melee_hit":
        speed = 6
        cells = LEFT_ARM if hand_left else RIGHT_ARM if hand_left is False else LEFT_ARM + RIGHT_ARM
        commands.extend((cell, speed) for cell in cells)

    elif event_type == "reload_hip":
        speed = 4
        if hand_left is True:
            commands.append((Cell.FRONT_LOWER_LEFT, speed))
        elif hand_left is False:
            commands.append((Cell.FRONT_LOWER_RIGHT, speed))
        else:
            commands.append((Cell.FRONT_LOWER_LEFT, speed))
            commands.append((Cell.FRONT_LOWER_RIGHT, speed))

    elif event_type == "reload_shoulder":
        speed = 4
        if hand_left is True:
            commands.append((Cell.BACK_UPPER_LEFT, speed))
        elif hand_left is False:
            commands.append((Cell.BACK_UPPER_RIGHT, speed))
        else:
            commands.append((Cell.BACK_UPPER_LEFT, speed))
            commands.append((Cell.BACK_UPPER_RIGHT, speed))

    elif event_type == "player_hit":
        speed = 7
        commands.append((Cell.FRONT_UPPER_LEFT, speed))
        commands.append((Cell.FRONT_UPPER_RIGHT, speed))

    elif event_type == "death":
        commands.extend((cell, 10) for cell in ALL_CELLS)

    elif event_type == "low_health":
        commands.append((Cell.FRONT_LOWER_LEFT, 3))
        commands.append((Cell.FRONT_LOWER_RIGHT, 3))

    elif event_type == "healing":
        commands.extend((cell, 4) for cell in LOWER_CELLS)

    return commands


class PistolWhipManager:
    """
    TCP-client handler for Pistol Whip.

    The MelonLoader mod sends pistolwhip_event commands. Start/stop enable
    processing so stray events do nothing until the user arms the integration.
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
            "[pistolwhip] enabled (solenoid_recoil=%s duration_ms=%s)",
            self._solenoid_enabled,
            self._solenoid_recoil_ms,
        )

    def disable(self) -> None:
        self._enabled = False
        logger.info("[pistolwhip] disabled")

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
    ) -> bool:
        """Handle one pistolwhip_event from the game mod. Returns False if ignored."""
        if not self._enabled:
            return False
        name = str(event_name or "").strip()
        if not name:
            return False

        params: Dict[str, Any] = {"priority": int(priority or 0)}
        if hand:
            params["hand"] = str(hand)

        event = PistolWhipEvent(type=name, raw=name, params=params)
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
