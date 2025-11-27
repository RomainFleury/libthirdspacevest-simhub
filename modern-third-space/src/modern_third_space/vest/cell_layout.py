"""
Third Space Vest cell layout constants.

Hardware cell mapping (from Kyle Machulis' reverse engineering):

      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  │ UL  │ UR  │          │ UL  │ UR  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  │ LL  │ LR  │          │ LL  │ LR  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R

Usage:
    from modern_third_space.vest.cell_layout import Cell, FRONT_CELLS, LEFT_ARM

    # Trigger front upper left
    trigger(Cell.FRONT_UPPER_LEFT, speed=5)

    # Trigger all front cells
    for cell in FRONT_CELLS:
        trigger(cell, speed=3)
"""

from typing import List


class Cell:
    """Individual cell constants by physical position."""
    
    # Front cells
    FRONT_UPPER_LEFT = 2
    FRONT_UPPER_RIGHT = 5
    FRONT_LOWER_LEFT = 3
    FRONT_LOWER_RIGHT = 4
    
    # Back cells
    BACK_UPPER_LEFT = 1
    BACK_UPPER_RIGHT = 6
    BACK_LOWER_LEFT = 0
    BACK_LOWER_RIGHT = 7


# =============================================================================
# Cell Groups
# =============================================================================

# Front and back
FRONT_CELLS: List[int] = [
    Cell.FRONT_UPPER_LEFT,
    Cell.FRONT_UPPER_RIGHT,
    Cell.FRONT_LOWER_LEFT,
    Cell.FRONT_LOWER_RIGHT,
]

BACK_CELLS: List[int] = [
    Cell.BACK_UPPER_LEFT,
    Cell.BACK_UPPER_RIGHT,
    Cell.BACK_LOWER_LEFT,
    Cell.BACK_LOWER_RIGHT,
]

ALL_CELLS: List[int] = list(range(8))


# =============================================================================
# Position Groups (for VR hand-specific feedback)
# =============================================================================

# Left and right sides (all cells on that side)
LEFT_SIDE: List[int] = [
    Cell.FRONT_UPPER_LEFT,
    Cell.FRONT_LOWER_LEFT,
    Cell.BACK_UPPER_LEFT,
    Cell.BACK_LOWER_LEFT,
]

RIGHT_SIDE: List[int] = [
    Cell.FRONT_UPPER_RIGHT,
    Cell.FRONT_LOWER_RIGHT,
    Cell.BACK_UPPER_RIGHT,
    Cell.BACK_LOWER_RIGHT,
]

# Arm/shoulder feedback (upper cells on one side - for recoil, punches)
LEFT_ARM: List[int] = [
    Cell.FRONT_UPPER_LEFT,
    Cell.BACK_UPPER_LEFT,
]

RIGHT_ARM: List[int] = [
    Cell.FRONT_UPPER_RIGHT,
    Cell.BACK_UPPER_RIGHT,
]


# =============================================================================
# Body Region Groups
# =============================================================================

# Upper cells (shoulders, upper chest/back)
UPPER_CELLS: List[int] = [
    Cell.FRONT_UPPER_LEFT,
    Cell.FRONT_UPPER_RIGHT,
    Cell.BACK_UPPER_LEFT,
    Cell.BACK_UPPER_RIGHT,
]

# Lower cells (torso, lower chest/back)
LOWER_CELLS: List[int] = [
    Cell.FRONT_LOWER_LEFT,
    Cell.FRONT_LOWER_RIGHT,
    Cell.BACK_LOWER_LEFT,
    Cell.BACK_LOWER_RIGHT,
]

# Aliases for common use cases
TORSO = LOWER_CELLS
SHOULDERS = UPPER_CELLS


# =============================================================================
# Helpers
# =============================================================================

def cells_for_hand(hand: str) -> List[int]:
    """
    Get arm cells for a hand side.
    
    Args:
        hand: "left" or "right" (case insensitive)
    
    Returns:
        List of cell indices for that arm
    """
    if hand.lower() in ("left", "l"):
        return LEFT_ARM
    return RIGHT_ARM


def cells_for_side(side: str) -> List[int]:
    """
    Get all cells for a body side.
    
    Args:
        side: "left" or "right" (case insensitive)
    
    Returns:
        List of cell indices for that side
    """
    if side.lower() in ("left", "l"):
        return LEFT_SIDE
    return RIGHT_SIDE

