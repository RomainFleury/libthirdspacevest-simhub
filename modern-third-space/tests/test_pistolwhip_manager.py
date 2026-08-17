"""Unit tests for Pistol Whip haptic mapping and TCP event handling."""

from modern_third_space.server.pistolwhip_manager import (
    PistolWhipEvent,
    PistolWhipManager,
    map_event_to_haptics,
)
from modern_third_space.vest.cell_layout import ALL_CELLS, LEFT_ARM, RIGHT_ARM, Cell


def test_gun_fire_left_uses_left_arm():
    event = PistolWhipEvent(type="gun_fire", params={"hand": "left"})
    commands = map_event_to_haptics(event)
    cells = [cell for cell, _speed in commands]
    assert cells == list(LEFT_ARM)
    assert all(speed == 5 for _cell, speed in commands)


def test_gun_fire_right_uses_right_arm():
    event = PistolWhipEvent(type="gun_fire", params={"hand": "right"})
    commands = map_event_to_haptics(event)
    cells = [cell for cell, _speed in commands]
    assert cells == list(RIGHT_ARM)


def test_shotgun_fire_right_uses_right_side():
    event = PistolWhipEvent(type="shotgun_fire", params={"hand": "right"})
    commands = map_event_to_haptics(event)
    cells = {cell for cell, _speed in commands}
    assert cells == {
        Cell.FRONT_UPPER_RIGHT,
        Cell.FRONT_LOWER_RIGHT,
        Cell.BACK_UPPER_RIGHT,
        Cell.BACK_LOWER_RIGHT,
    }
    assert all(speed == 8 for _cell, speed in commands)


def test_death_triggers_all_cells():
    event = PistolWhipEvent(type="death")
    commands = map_event_to_haptics(event)
    cells = [cell for cell, _speed in commands]
    assert cells == list(ALL_CELLS)
    assert all(speed == 10 for _cell, speed in commands)


def test_unknown_event_maps_to_nothing():
    event = PistolWhipEvent(type="not_a_real_event")
    assert map_event_to_haptics(event) == []


def test_process_event_ignored_until_started():
    triggers = []
    manager = PistolWhipManager(on_trigger=lambda cell, speed: triggers.append((cell, speed)))
    assert manager.process_event("gun_fire", hand="right") is False
    assert triggers == []
    assert manager.events_received == 0


def test_process_event_triggers_and_recoil_when_enabled():
    triggers = []
    recoils = []
    manager = PistolWhipManager(
        on_trigger=lambda cell, speed: triggers.append((cell, speed)),
        on_recoil=lambda duration_ms: recoils.append(duration_ms),
    )
    manager.start({"enabled": True, "duration_ms": 40})
    assert manager.process_event("gun_fire", hand="left") is True
    assert manager.events_received == 1
    assert manager.last_event_type == "gun_fire"
    assert triggers
    assert recoils
    manager.stop()
    assert manager.process_event("gun_fire", hand="left") is False
