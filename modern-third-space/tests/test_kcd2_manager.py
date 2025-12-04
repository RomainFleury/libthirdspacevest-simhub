"""Tests for KCD2 Manager."""

import pytest
from pathlib import Path
from modern_third_space.server.kcd2_manager import (
    parse_thirdspace_line,
    KCD2Event,
    direction_to_cells,
    body_part_to_cells,
    map_event_to_haptics,
)
from modern_third_space.vest.cell_layout import Cell, FRONT_CELLS, BACK_CELLS


class TestEventParser:
    """Test event parsing."""
    
    def test_parse_damage_event(self):
        line = '[ThirdSpace] {PlayerDamage|damage=25|health=75|direction=front|bodyPart=torso}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerDamage"
        assert event.get_int("damage") == 25
        assert event.get_int("health") == 75
        assert event.params["direction"] == "front"
        assert event.params["bodyPart"] == "torso"
    
    def test_parse_death_event(self):
        line = '[ThirdSpace] {PlayerDeath|lastHealth=10|cause=combat}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerDeath"
        assert event.get_int("lastHealth") == 10
        assert event.params["cause"] == "combat"
    
    def test_parse_heal_event(self):
        line = '[ThirdSpace] {PlayerHeal|amount=20|health=80}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerHeal"
        assert event.get_int("amount") == 20
        assert event.get_int("health") == 80
    
    def test_parse_invalid_line(self):
        line = 'Some random log line'
        event = parse_thirdspace_line(line)
        assert event is None
    
    def test_parse_no_params(self):
        line = '[ThirdSpace] {CombatStart}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "CombatStart"
        assert event.params == {}
    
    def test_parse_with_whitespace(self):
        line = '  [ThirdSpace]   {PlayerAttack|weapon=sword|type=swing}  '
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerAttack"
        assert event.params["weapon"] == "sword"
        assert event.params["type"] == "swing"
    
    def test_parse_block_event(self):
        line = '[ThirdSpace] {PlayerBlock|success=true|direction=front|perfect=false}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerBlock"
        assert event.get_bool("success") is True
        assert event.get_bool("perfect") is False
        assert event.params["direction"] == "front"
    
    def test_parse_fall_event(self):
        line = '[ThirdSpace] {PlayerFall|damage=15|height=5}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerFall"
        assert event.get_int("damage") == 15
        assert event.get_int("height") == 5


class TestKCD2Event:
    """Test KCD2Event dataclass methods."""
    
    def test_get_int_valid(self):
        event = KCD2Event(type="test", raw="test", params={"damage": "25"})
        assert event.get_int("damage") == 25
    
    def test_get_int_default(self):
        event = KCD2Event(type="test", raw="test", params={})
        assert event.get_int("damage", 10) == 10
    
    def test_get_int_invalid_value(self):
        event = KCD2Event(type="test", raw="test", params={"damage": "invalid"})
        assert event.get_int("damage", 5) == 5
    
    def test_get_float_valid(self):
        event = KCD2Event(type="test", raw="test", params={"angle": "45.5"})
        assert event.get_float("angle") == 45.5
    
    def test_get_float_default(self):
        event = KCD2Event(type="test", raw="test", params={})
        assert event.get_float("angle", 90.0) == 90.0
    
    def test_get_bool_true_values(self):
        event = KCD2Event(type="test", raw="test", params={
            "a": "true",
            "b": "1",
            "c": "yes",
            "d": "TRUE",
        })
        assert event.get_bool("a") is True
        assert event.get_bool("b") is True
        assert event.get_bool("c") is True
        assert event.get_bool("d") is True
    
    def test_get_bool_false_values(self):
        event = KCD2Event(type="test", raw="test", params={
            "a": "false",
            "b": "0",
            "c": "no",
        })
        assert event.get_bool("a") is False
        assert event.get_bool("b") is False
        assert event.get_bool("c") is False
    
    def test_get_bool_default(self):
        event = KCD2Event(type="test", raw="test", params={})
        assert event.get_bool("missing") is False
        assert event.get_bool("missing", True) is True


class TestDirectionMapping:
    """Test direction to cell mapping."""
    
    def test_front_direction(self):
        cells = direction_to_cells("front")
        assert cells == FRONT_CELLS
    
    def test_forward_direction(self):
        cells = direction_to_cells("forward")
        assert cells == FRONT_CELLS
    
    def test_back_direction(self):
        cells = direction_to_cells("back")
        assert cells == BACK_CELLS
    
    def test_rear_direction(self):
        cells = direction_to_cells("rear")
        assert cells == BACK_CELLS
    
    def test_left_direction(self):
        cells = direction_to_cells("left")
        assert Cell.FRONT_UPPER_LEFT in cells
        assert Cell.FRONT_LOWER_LEFT in cells
        assert Cell.BACK_UPPER_LEFT in cells
        assert Cell.BACK_LOWER_LEFT in cells
    
    def test_right_direction(self):
        cells = direction_to_cells("right")
        assert Cell.FRONT_UPPER_RIGHT in cells
        assert Cell.FRONT_LOWER_RIGHT in cells
        assert Cell.BACK_UPPER_RIGHT in cells
        assert Cell.BACK_LOWER_RIGHT in cells
    
    def test_unknown_direction_defaults_to_front(self):
        cells = direction_to_cells("unknown")
        assert cells == FRONT_CELLS
    
    def test_case_insensitive(self):
        assert direction_to_cells("FRONT") == FRONT_CELLS
        assert direction_to_cells("Back") == BACK_CELLS
        assert direction_to_cells("LEFT") == direction_to_cells("left")


class TestBodyPartMapping:
    """Test body part to cell mapping."""
    
    def test_head_mapping(self):
        cells = body_part_to_cells("head")
        assert Cell.FRONT_UPPER_LEFT in cells
        assert Cell.FRONT_UPPER_RIGHT in cells
        assert len(cells) == 2
    
    def test_neck_mapping(self):
        cells = body_part_to_cells("neck")
        assert Cell.FRONT_UPPER_LEFT in cells
        assert Cell.FRONT_UPPER_RIGHT in cells
    
    def test_torso_mapping(self):
        cells = body_part_to_cells("torso")
        assert cells == FRONT_CELLS
    
    def test_chest_mapping(self):
        cells = body_part_to_cells("chest")
        assert cells == FRONT_CELLS
    
    def test_stomach_mapping(self):
        cells = body_part_to_cells("stomach")
        assert Cell.FRONT_LOWER_LEFT in cells
        assert Cell.FRONT_LOWER_RIGHT in cells
        assert len(cells) == 2
    
    def test_back_mapping(self):
        cells = body_part_to_cells("back")
        assert cells == BACK_CELLS
    
    def test_spine_mapping(self):
        cells = body_part_to_cells("spine")
        assert cells == BACK_CELLS
    
    def test_left_arm_mapping(self):
        cells = body_part_to_cells("left_arm")
        assert Cell.FRONT_UPPER_LEFT in cells
        assert Cell.FRONT_LOWER_LEFT in cells
    
    def test_right_arm_mapping(self):
        cells = body_part_to_cells("right_arm")
        assert Cell.FRONT_UPPER_RIGHT in cells
        assert Cell.FRONT_LOWER_RIGHT in cells
    
    def test_left_leg_mapping(self):
        cells = body_part_to_cells("left_leg")
        assert Cell.BACK_LOWER_LEFT in cells
    
    def test_right_leg_mapping(self):
        cells = body_part_to_cells("right_leg")
        assert Cell.BACK_LOWER_RIGHT in cells
    
    def test_unknown_part_defaults_to_front(self):
        cells = body_part_to_cells("unknown")
        assert cells == FRONT_CELLS


class TestHapticMapping:
    """Test event to haptic mapping."""
    
    def test_damage_event_mapping(self):
        event = KCD2Event(
            type="PlayerDamage",
            raw="PlayerDamage|damage=25|health=75|direction=front",
            params={"damage": "25", "health": "75", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        assert len(commands) > 0
        
        # Check all commands have valid cell and speed
        for cell, speed in commands:
            assert 0 <= cell <= 7
            assert 1 <= speed <= 10
    
    def test_damage_intensity_low(self):
        event = KCD2Event(
            type="PlayerDamage",
            raw="PlayerDamage|damage=5",
            params={"damage": "5", "health": "100", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        for _, speed in commands:
            assert speed <= 5  # Low damage should have lower intensity
    
    def test_damage_intensity_high(self):
        event = KCD2Event(
            type="PlayerDamage",
            raw="PlayerDamage|damage=50",
            params={"damage": "50", "health": "50", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        for _, speed in commands:
            assert speed >= 8  # High damage should have higher intensity
    
    def test_damage_boost_at_low_health(self):
        event = KCD2Event(
            type="PlayerDamage",
            raw="PlayerDamage|damage=10|health=10",
            params={"damage": "10", "health": "10", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        for _, speed in commands:
            # At low health, even low damage should boost intensity
            assert speed >= 5
    
    def test_death_event_mapping(self):
        event = KCD2Event(
            type="PlayerDeath",
            raw="PlayerDeath",
            params={}
        )
        
        commands = map_event_to_haptics(event)
        
        # Death should trigger all cells
        cells_triggered = [c for c, s in commands]
        assert len(cells_triggered) == 8  # All 8 cells
        
        # All at max intensity
        for _, speed in commands:
            assert speed == 10
    
    def test_heal_event_mapping(self):
        event = KCD2Event(
            type="PlayerHeal",
            raw="PlayerHeal|amount=20",
            params={"amount": "20"}
        )
        
        commands = map_event_to_haptics(event)
        
        # Heal should be gentle
        for _, speed in commands:
            assert speed <= 3
    
    def test_attack_event_mapping(self):
        event = KCD2Event(
            type="PlayerAttack",
            raw="PlayerAttack|weapon=sword",
            params={"weapon": "sword"}
        )
        
        commands = map_event_to_haptics(event)
        assert len(commands) == 2  # Upper front cells
        
        for cell, speed in commands:
            assert cell in [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
            assert 3 <= speed <= 6
    
    def test_block_success_mapping(self):
        event = KCD2Event(
            type="PlayerBlock",
            raw="PlayerBlock|success=true|direction=front",
            params={"success": "true", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        assert len(commands) > 0
        
        for _, speed in commands:
            assert speed == 5  # Successful block
    
    def test_block_perfect_mapping(self):
        event = KCD2Event(
            type="PlayerBlock",
            raw="PlayerBlock|success=true|perfect=true|direction=front",
            params={"success": "true", "perfect": "true", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        
        for _, speed in commands:
            assert speed == 7  # Perfect block is stronger
    
    def test_block_fail_mapping(self):
        event = KCD2Event(
            type="PlayerBlock",
            raw="PlayerBlock|success=false|direction=front",
            params={"success": "false", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        
        for _, speed in commands:
            assert speed == 8  # Failed block is stronger impact
    
    def test_fall_event_mapping(self):
        event = KCD2Event(
            type="PlayerFall",
            raw="PlayerFall|damage=20",
            params={"damage": "20"}
        )
        
        commands = map_event_to_haptics(event)
        
        # Fall should trigger lower cells
        for cell, _ in commands:
            assert cell in [
                Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT,
                Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT
            ]
    
    def test_combat_start_mapping(self):
        event = KCD2Event(
            type="CombatStart",
            raw="CombatStart",
            params={}
        )
        
        commands = map_event_to_haptics(event)
        assert len(commands) > 0
        
        # Should be subtle alert
        for _, speed in commands:
            assert speed <= 4
    
    def test_critical_health_mapping(self):
        event = KCD2Event(
            type="CriticalHealth",
            raw="CriticalHealth|health=15",
            params={"health": "15"}
        )
        
        commands = map_event_to_haptics(event)
        
        # Should trigger left chest (heartbeat effect)
        cells_triggered = [c for c, _ in commands]
        assert Cell.FRONT_UPPER_LEFT in cells_triggered
        assert Cell.FRONT_LOWER_LEFT in cells_triggered
    
    def test_low_stamina_mapping(self):
        event = KCD2Event(
            type="LowStamina",
            raw="LowStamina|stamina=10",
            params={"stamina": "10"}
        )
        
        commands = map_event_to_haptics(event)
        
        # Should be very subtle
        for _, speed in commands:
            assert speed <= 3
    
    def test_unknown_event_returns_empty(self):
        event = KCD2Event(
            type="UnknownEvent",
            raw="UnknownEvent",
            params={}
        )
        
        commands = map_event_to_haptics(event)
        assert commands == []
