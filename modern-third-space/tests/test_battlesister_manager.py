"""Unit tests for Battle Sister haptic mapping and TCP event handling."""

from modern_third_space.server.battlesister_manager import (
    BattleSisterEvent,
    BattleSisterManager,
    cells_for_hit_angle,
    map_event_to_haptics,
)
from modern_third_space.vest.cell_layout import ALL_CELLS, LEFT_SIDE, LOWER_CELLS, RIGHT_ARM, Cell


def test_gun_fire_right_uses_right_arm():
    event = BattleSisterEvent(type="gun_fire", params={"hand": "right"})
    cells = [cell for cell, _speed in map_event_to_haptics(event)]
    assert cells == list(RIGHT_ARM)


def test_shotgun_fire_left_uses_left_side():
    event = BattleSisterEvent(type="shotgun_fire", params={"hand": "left"})
    cells = {cell for cell, _speed in map_event_to_haptics(event)}
    assert cells == set(LEFT_SIDE)


def test_player_hit_front_angle():
    event = BattleSisterEvent(type="player_hit", params={"angle": 0.0})
    cells = {cell for cell, _speed in map_event_to_haptics(event)}
    assert cells == {Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT}


def test_player_hit_left_angle():
    event = BattleSisterEvent(type="player_hit", params={"angle": 90.0})
    cells = {cell for cell, _speed in map_event_to_haptics(event)}
    assert cells == set(LEFT_SIDE)


def test_cells_for_hit_angle_back():
    assert set(cells_for_hit_angle(180.0)) == {Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT}


def test_explosion_without_angle_uses_lower_cells():
    event = BattleSisterEvent(type="explosion")
    cells = {cell for cell, _speed in map_event_to_haptics(event)}
    assert cells == set(LOWER_CELLS)


def test_explosion_with_angle_uses_directional_cells():
    event = BattleSisterEvent(type="explosion", params={"angle": 90.0})
    cells = {cell for cell, _speed in map_event_to_haptics(event)}
    assert cells == set(LEFT_SIDE)


def test_death_triggers_all_cells():
    event = BattleSisterEvent(type="death")
    cells = [cell for cell, _speed in map_event_to_haptics(event)]
    assert cells == list(ALL_CELLS)


def test_low_health_end_maps_to_nothing():
    event = BattleSisterEvent(type="low_health_end")
    assert map_event_to_haptics(event) == []


def test_process_event_ignored_until_started():
    manager = BattleSisterManager()
    assert manager.process_event("gun_fire", hand="right") is False
    assert manager.events_received == 0


def test_process_event_stores_angle_and_recoil():
    recoils = []
    manager = BattleSisterManager(on_recoil=lambda ms: recoils.append(ms))
    manager.start({"enabled": True, "duration_ms": 40})
    assert manager.process_event("player_hit", angle=90.0) is True
    assert manager.last_event_type == "player_hit"
    assert manager.process_event("gun_fire", hand="left") is True
    assert recoils
    manager.stop()
    assert manager.process_event("gun_fire", hand="left") is False
