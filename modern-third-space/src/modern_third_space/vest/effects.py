"""
Predefined haptic effects for the Third Space Vest.

These effects recreate the SDK's predefined patterns (E_MACHINEGUN_FRONT, etc.)
using our cell layout constants.

Each effect is a sequence of steps, where each step is:
- cells: List of cell indices to activate
- speed: Intensity (1-10)
- duration_ms: How long to keep cells active
- delay_ms: Pause before next step (0 = immediate)

Usage:
    from modern_third_space.vest.effects import EFFECTS, get_effect
    
    effect = get_effect("machinegun_front")
    for step in effect.steps:
        for cell in step.cells:
            trigger(cell, step.speed)
        await asyncio.sleep(step.duration_ms / 1000)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

from .cell_layout import (
    Cell,
    FRONT_CELLS,
    BACK_CELLS,
    ALL_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
    UPPER_CELLS,
    LOWER_CELLS,
)


class EffectCategory(str, Enum):
    """Categories for organizing effects in UI."""
    WEAPONS = "weapons"
    IMPACTS = "impacts"
    MELEE = "melee"
    DRIVING = "driving"
    SPECIAL = "special"


@dataclass
class EffectStep:
    """Single step in an effect sequence."""
    cells: List[int]
    speed: int
    duration_ms: int = 100
    delay_ms: int = 0  # Delay after this step


@dataclass
class Effect:
    """A predefined haptic effect pattern."""
    name: str
    display_name: str
    category: EffectCategory
    description: str
    steps: List[EffectStep] = field(default_factory=list)
    
    def total_duration_ms(self) -> int:
        """Calculate total effect duration."""
        return sum(s.duration_ms + s.delay_ms for s in self.steps)


# =============================================================================
# Weapon Effects
# =============================================================================

MACHINEGUN_FRONT = Effect(
    name="machinegun_front",
    display_name="Machine Gun (Front)",
    category=EffectCategory.WEAPONS,
    description="Rapid fire pulses to front",
    steps=[
        # Rapid 6-pulse burst
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=6, duration_ms=50),
    ]
)

MACHINEGUN_BACK = Effect(
    name="machinegun_back",
    display_name="Machine Gun (Back)",
    category=EffectCategory.WEAPONS,
    description="Rapid fire pulses to back",
    steps=[
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=6, duration_ms=50, delay_ms=30),
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=6, duration_ms=50),
    ]
)

PISTOL_FRONT = Effect(
    name="pistol_front",
    display_name="Pistol (Front)",
    category=EffectCategory.WEAPONS,
    description="Single handgun shot to front",
    steps=[
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=5, duration_ms=80),
    ]
)

PISTOL_BACK = Effect(
    name="pistol_back",
    display_name="Pistol (Back)",
    category=EffectCategory.WEAPONS,
    description="Single handgun shot to back",
    steps=[
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=5, duration_ms=80),
    ]
)

SHOTGUN_FRONT = Effect(
    name="shotgun_front",
    display_name="Shotgun (Front)",
    category=EffectCategory.WEAPONS,
    description="Heavy shotgun blast to front",
    steps=[
        EffectStep(cells=FRONT_CELLS, speed=8, duration_ms=150),
    ]
)

SHOTGUN_BACK = Effect(
    name="shotgun_back",
    display_name="Shotgun (Back)",
    category=EffectCategory.WEAPONS,
    description="Heavy shotgun blast to back",
    steps=[
        EffectStep(cells=BACK_CELLS, speed=8, duration_ms=150),
    ]
)

RIFLE_FRONT = Effect(
    name="rifle_front",
    display_name="Rifle (Front)",
    category=EffectCategory.WEAPONS,
    description="Rifle shot to front",
    steps=[
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=7, duration_ms=100),
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=5, duration_ms=50),
    ]
)

RIFLE_BACK = Effect(
    name="rifle_back",
    display_name="Rifle (Back)",
    category=EffectCategory.WEAPONS,
    description="Rifle shot to back",
    steps=[
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=7, duration_ms=100),
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=5, duration_ms=50),
    ]
)


# =============================================================================
# Impact Effects
# =============================================================================

BIG_BLAST_FRONT = Effect(
    name="big_blast_front",
    display_name="Big Blast (Front)",
    category=EffectCategory.IMPACTS,
    description="Large explosion impact to front",
    steps=[
        EffectStep(cells=FRONT_CELLS, speed=10, duration_ms=200),
        EffectStep(cells=FRONT_CELLS, speed=7, duration_ms=150),
        EffectStep(cells=FRONT_CELLS, speed=4, duration_ms=100),
    ]
)

BIG_BLAST_BACK = Effect(
    name="big_blast_back",
    display_name="Big Blast (Back)",
    category=EffectCategory.IMPACTS,
    description="Large explosion impact to back",
    steps=[
        EffectStep(cells=BACK_CELLS, speed=10, duration_ms=200),
        EffectStep(cells=BACK_CELLS, speed=7, duration_ms=150),
        EffectStep(cells=BACK_CELLS, speed=4, duration_ms=100),
    ]
)

SMALL_BLAST_FRONT = Effect(
    name="small_blast_front",
    display_name="Small Blast (Front)",
    category=EffectCategory.IMPACTS,
    description="Small explosion impact to front",
    steps=[
        EffectStep(cells=FRONT_CELLS, speed=6, duration_ms=100),
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=3, duration_ms=50),
    ]
)

SMALL_BLAST_BACK = Effect(
    name="small_blast_back",
    display_name="Small Blast (Back)",
    category=EffectCategory.IMPACTS,
    description="Small explosion impact to back",
    steps=[
        EffectStep(cells=BACK_CELLS, speed=6, duration_ms=100),
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=3, duration_ms=50),
    ]
)

LEFT_SIDE_HIT = Effect(
    name="left_side_hit",
    display_name="Left Side Hit",
    category=EffectCategory.IMPACTS,
    description="Impact from the left",
    steps=[
        EffectStep(cells=LEFT_SIDE, speed=7, duration_ms=150),
    ]
)

RIGHT_SIDE_HIT = Effect(
    name="right_side_hit",
    display_name="Right Side Hit",
    category=EffectCategory.IMPACTS,
    description="Impact from the right",
    steps=[
        EffectStep(cells=RIGHT_SIDE, speed=7, duration_ms=150),
    ]
)


# =============================================================================
# Melee Effects
# =============================================================================

PUNCH_FRONT = Effect(
    name="punch_front",
    display_name="Punch (Front)",
    category=EffectCategory.MELEE,
    description="Punch impact to front",
    steps=[
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=7, duration_ms=100),
    ]
)

PUNCH_BACK = Effect(
    name="punch_back",
    display_name="Punch (Back)",
    category=EffectCategory.MELEE,
    description="Punch impact to back",
    steps=[
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=7, duration_ms=100),
    ]
)

STAB_FRONT = Effect(
    name="stab_front",
    display_name="Stab (Front)",
    category=EffectCategory.MELEE,
    description="Stab impact to front",
    steps=[
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT], speed=9, duration_ms=80),
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_UPPER_LEFT], speed=5, duration_ms=100),
    ]
)

STAB_BACK = Effect(
    name="stab_back",
    display_name="Stab (Back)",
    category=EffectCategory.MELEE,
    description="Stab impact to back",
    steps=[
        EffectStep(cells=[Cell.BACK_LOWER_LEFT], speed=9, duration_ms=80),
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_UPPER_LEFT], speed=5, duration_ms=100),
    ]
)


# =============================================================================
# Driving Effects
# =============================================================================

ACCELERATION = Effect(
    name="acceleration",
    display_name="Acceleration",
    category=EffectCategory.DRIVING,
    description="G-force pushing back",
    steps=[
        # Wave from front to back
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=3, duration_ms=100),
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=4, duration_ms=100),
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=5, duration_ms=150),
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=6, duration_ms=200),
    ]
)

DECELERATION = Effect(
    name="deceleration",
    display_name="Deceleration",
    category=EffectCategory.DRIVING,
    description="G-force pushing forward",
    steps=[
        # Wave from back to front
        EffectStep(cells=[Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT], speed=3, duration_ms=100),
        EffectStep(cells=[Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT], speed=4, duration_ms=100),
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=5, duration_ms=150),
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT], speed=6, duration_ms=200),
    ]
)

LEFT_TURN = Effect(
    name="left_turn",
    display_name="Left Turn",
    category=EffectCategory.DRIVING,
    description="G-force from turning left",
    steps=[
        EffectStep(cells=RIGHT_SIDE, speed=5, duration_ms=300),
    ]
)

RIGHT_TURN = Effect(
    name="right_turn",
    display_name="Right Turn",
    category=EffectCategory.DRIVING,
    description="G-force from turning right",
    steps=[
        EffectStep(cells=LEFT_SIDE, speed=5, duration_ms=300),
    ]
)


# =============================================================================
# Special Effects
# =============================================================================

HEARTBEAT = Effect(
    name="heartbeat",
    display_name="Heartbeat",
    category=EffectCategory.SPECIAL,
    description="Low health heartbeat pulse",
    steps=[
        # Lub
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT], speed=4, duration_ms=100, delay_ms=50),
        # Dub
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT], speed=3, duration_ms=80, delay_ms=400),
        # Lub
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT], speed=4, duration_ms=100, delay_ms=50),
        # Dub
        EffectStep(cells=[Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT], speed=3, duration_ms=80),
    ]
)

FULL_BODY_PULSE = Effect(
    name="full_body_pulse",
    display_name="Full Body Pulse",
    category=EffectCategory.SPECIAL,
    description="Single pulse across entire vest",
    steps=[
        EffectStep(cells=ALL_CELLS, speed=6, duration_ms=200),
    ]
)

DEATH = Effect(
    name="death",
    display_name="Death",
    category=EffectCategory.SPECIAL,
    description="Death/respawn effect",
    steps=[
        EffectStep(cells=ALL_CELLS, speed=10, duration_ms=300),
        EffectStep(cells=ALL_CELLS, speed=7, duration_ms=200),
        EffectStep(cells=ALL_CELLS, speed=4, duration_ms=150),
        EffectStep(cells=FRONT_CELLS, speed=2, duration_ms=100),
    ]
)

SPAWN = Effect(
    name="spawn",
    display_name="Spawn",
    category=EffectCategory.SPECIAL,
    description="Respawn/start effect",
    steps=[
        # Build up from center outward
        EffectStep(cells=[Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT], speed=3, duration_ms=100),
        EffectStep(cells=FRONT_CELLS, speed=5, duration_ms=100),
        EffectStep(cells=ALL_CELLS, speed=4, duration_ms=150),
        EffectStep(cells=ALL_CELLS, speed=2, duration_ms=100),
    ]
)


# =============================================================================
# Effect Registry
# =============================================================================

# All effects in a dict for easy lookup
EFFECTS: Dict[str, Effect] = {
    # Weapons
    "machinegun_front": MACHINEGUN_FRONT,
    "machinegun_back": MACHINEGUN_BACK,
    "pistol_front": PISTOL_FRONT,
    "pistol_back": PISTOL_BACK,
    "shotgun_front": SHOTGUN_FRONT,
    "shotgun_back": SHOTGUN_BACK,
    "rifle_front": RIFLE_FRONT,
    "rifle_back": RIFLE_BACK,
    # Impacts
    "big_blast_front": BIG_BLAST_FRONT,
    "big_blast_back": BIG_BLAST_BACK,
    "small_blast_front": SMALL_BLAST_FRONT,
    "small_blast_back": SMALL_BLAST_BACK,
    "left_side_hit": LEFT_SIDE_HIT,
    "right_side_hit": RIGHT_SIDE_HIT,
    # Melee
    "punch_front": PUNCH_FRONT,
    "punch_back": PUNCH_BACK,
    "stab_front": STAB_FRONT,
    "stab_back": STAB_BACK,
    # Driving
    "acceleration": ACCELERATION,
    "deceleration": DECELERATION,
    "left_turn": LEFT_TURN,
    "right_turn": RIGHT_TURN,
    # Special
    "heartbeat": HEARTBEAT,
    "full_body_pulse": FULL_BODY_PULSE,
    "death": DEATH,
    "spawn": SPAWN,
}


def get_effect(name: str) -> Optional[Effect]:
    """Get an effect by name."""
    return EFFECTS.get(name)


def list_effects() -> List[Effect]:
    """Get all effects as a list."""
    return list(EFFECTS.values())


def list_effects_by_category(category: EffectCategory) -> List[Effect]:
    """Get all effects in a category."""
    return [e for e in EFFECTS.values() if e.category == category]


def get_effect_names() -> List[str]:
    """Get all effect names."""
    return list(EFFECTS.keys())


def effect_to_dict(effect: Effect) -> dict:
    """Convert effect to dict for JSON serialization."""
    return {
        "name": effect.name,
        "display_name": effect.display_name,
        "category": effect.category.value,
        "description": effect.description,
        "duration_ms": effect.total_duration_ms(),
        "steps": [
            {
                "cells": step.cells,
                "speed": step.speed,
                "duration_ms": step.duration_ms,
                "delay_ms": step.delay_ms,
            }
            for step in effect.steps
        ],
    }


def all_effects_to_dict() -> dict:
    """Get all effects as a dict for JSON response."""
    return {
        "effects": [effect_to_dict(e) for e in EFFECTS.values()],
        "categories": [c.value for c in EffectCategory],
    }

