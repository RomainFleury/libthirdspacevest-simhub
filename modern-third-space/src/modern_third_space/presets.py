"""
Effect presets - predefined actuator configurations for the UI.

This module contains UI-friendly effect definitions. These are NOT part of
the vest core - they are convenience presets for the debugger interface.

The vest hardware itself only understands (cell_index, speed) pairs.
These presets add human-readable labels for the UI.
"""

from __future__ import annotations

from typing import Any, Dict, List


def default_effects() -> List[Dict[str, Any]]:
    """
    Get default effect presets for the debugger UI.
    
    Returns:
        List of effect dictionaries with:
        - label: Human-readable name
        - cell: Actuator cell index (0-7)
        - speed: Vibration speed (0-10)
    
    Note:
        These are UI conveniences, not hardware configurations.
        The vest only understands raw (cell, speed) commands.
    """
    return [
        {"label": "Front Left", "cell": 0, "speed": 5},
        {"label": "Front Right", "cell": 1, "speed": 5},
        {"label": "Back Left", "cell": 2, "speed": 5},
        {"label": "Back Right", "cell": 3, "speed": 5},
        {"label": "Full Blast", "cell": 0, "speed": 10},
    ]

