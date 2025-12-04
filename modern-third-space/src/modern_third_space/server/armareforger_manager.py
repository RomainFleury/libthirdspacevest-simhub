"""
Arma Reforger Integration Manager for the vest daemon.

This module handles events from the Arma Reforger Third Space Vest mod.
The game mod connects via TCP and sends JSON events for player damage,
weapon fire, vehicle impacts, and explosions.

When game events are detected, they are passed to callbacks which the
daemon uses to:
1. Trigger haptic effects on the vest
2. Broadcast events to all connected clients
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Any

from ..vest.cell_layout import (
    Cell,
    FRONT_CELLS,
    BACK_CELLS,
    ALL_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
    UPPER_CELLS,
    LOWER_CELLS,
    LEFT_ARM,
    RIGHT_ARM,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Types
# =============================================================================

class ArmaEventType:
    """Event types from Arma Reforger mod."""
    # Player events
    PLAYER_DAMAGE = "player_damage"
    PLAYER_DEATH = "player_death"
    PLAYER_HEAL = "player_heal"
    PLAYER_SUPPRESSED = "player_suppressed"
    
    # Weapon events
    WEAPON_FIRE_RIFLE = "weapon_fire_rifle"
    WEAPON_FIRE_MG = "weapon_fire_mg"
    WEAPON_FIRE_PISTOL = "weapon_fire_pistol"
    WEAPON_FIRE_LAUNCHER = "weapon_fire_launcher"
    WEAPON_RELOAD = "weapon_reload"
    GRENADE_THROW = "grenade_throw"
    
    # Vehicle events
    VEHICLE_COLLISION = "vehicle_collision"
    VEHICLE_DAMAGE = "vehicle_damage"
    VEHICLE_EXPLOSION = "vehicle_explosion"
    HELICOPTER_ROTOR = "helicopter_rotor"
    
    # Environment events
    EXPLOSION_NEARBY = "explosion_nearby"
    BULLET_IMPACT_NEAR = "bullet_impact_near"


# =============================================================================
# Haptic Mapping
# =============================================================================

def angle_to_cells(angle: float) -> List[int]:
    """
    Convert damage angle (0-360°) to vest cells.
    
    Angle reference (relative to player facing):
    - 0° = Front
    - 90° = Left  
    - 180° = Back
    - 270° = Right
    
    Uses correct hardware cell layout:
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    # Normalize angle to 0-360
    angle = angle % 360
    
    if angle < 45 or angle >= 315:
        # Front
        return FRONT_CELLS
    elif 45 <= angle < 135:
        # Left side (from player perspective)
        return LEFT_SIDE
    elif 135 <= angle < 225:
        # Back
        return BACK_CELLS
    else:  # 225 <= angle < 315
        # Right side
        return RIGHT_SIDE


def calculate_damage_intensity(damage: float, max_damage: float = 100.0) -> int:
    """
    Calculate haptic intensity based on damage amount.
    
    Args:
        damage: Damage amount (0-100+)
        max_damage: Maximum expected damage for scaling
        
    Returns:
        Intensity value (1-10)
    """
    # Scale damage to intensity 1-10
    normalized = min(1.0, damage / max_damage)
    intensity = int(1 + normalized * 9)
    return max(1, min(10, intensity))


def calculate_distance_intensity(distance: float, max_distance: float = 50.0) -> int:
    """
    Calculate haptic intensity based on distance (closer = stronger).
    
    Args:
        distance: Distance in game units
        max_distance: Maximum distance for haptic feedback
        
    Returns:
        Intensity value (1-10), or 0 if out of range
    """
    if distance > max_distance:
        return 0
    
    # Inverse relationship: closer = stronger
    normalized = 1.0 - (distance / max_distance)
    intensity = int(1 + normalized * 9)
    return max(1, min(10, intensity))


# =============================================================================
# Event Processing
# =============================================================================

@dataclass
class ArmaEvent:
    """Parsed event from Arma Reforger mod."""
    type: str
    params: Dict[str, Any]
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


def map_event_to_haptics(event: ArmaEvent) -> List[tuple[int, int]]:
    """
    Map an Arma Reforger event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    event_type = event.type
    params = event.params
    
    # =========================================================================
    # Player Events
    # =========================================================================
    
    if event_type == ArmaEventType.PLAYER_DAMAGE:
        angle = params.get("angle", 0.0)
        damage = params.get("damage", 20)
        
        cells = angle_to_cells(angle)
        intensity = calculate_damage_intensity(damage)
        
        for cell in cells:
            commands.append((cell, intensity))
    
    elif event_type == ArmaEventType.PLAYER_DEATH:
        # Full vest strong effect
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event_type == ArmaEventType.PLAYER_HEAL:
        # Gentle front pulse
        for cell in FRONT_CELLS:
            commands.append((cell, 2))
    
    elif event_type == ArmaEventType.PLAYER_SUPPRESSED:
        # Subtle full body rumble
        for cell in ALL_CELLS:
            commands.append((cell, 2))
    
    # =========================================================================
    # Weapon Events
    # =========================================================================
    
    elif event_type == ArmaEventType.WEAPON_FIRE_RIFLE:
        # Standard rifle recoil - front upper cells
        hand = params.get("hand", "right")
        cells = RIGHT_ARM if hand == "right" else LEFT_ARM
        for cell in cells:
            commands.append((cell, 5))
    
    elif event_type == ArmaEventType.WEAPON_FIRE_MG:
        # Machine gun - stronger sustained recoil
        for cell in UPPER_CELLS:
            commands.append((cell, 6))
    
    elif event_type == ArmaEventType.WEAPON_FIRE_PISTOL:
        # Pistol - light recoil
        hand = params.get("hand", "right")
        cells = RIGHT_ARM if hand == "right" else LEFT_ARM
        for cell in cells:
            commands.append((cell, 3))
    
    elif event_type == ArmaEventType.WEAPON_FIRE_LAUNCHER:
        # Launcher - strong full upper body recoil
        for cell in UPPER_CELLS:
            commands.append((cell, 8))
        # Also lower cells for blast wave
        for cell in LOWER_CELLS:
            commands.append((cell, 5))
    
    elif event_type == ArmaEventType.WEAPON_RELOAD:
        # Brief chest pulse
        commands.append((Cell.FRONT_LOWER_LEFT, 2))
        commands.append((Cell.FRONT_LOWER_RIGHT, 2))
    
    elif event_type == ArmaEventType.GRENADE_THROW:
        # Arm-side cells based on throwing hand
        hand = params.get("hand", "right")
        cells = RIGHT_ARM if hand == "right" else LEFT_ARM
        for cell in cells:
            commands.append((cell, 4))
    
    # =========================================================================
    # Vehicle Events
    # =========================================================================
    
    elif event_type == ArmaEventType.VEHICLE_COLLISION:
        severity = params.get("severity", 0.5)  # 0.0-1.0
        intensity = int(3 + severity * 7)  # 3-10
        intensity = max(3, min(10, intensity))
        
        for cell in ALL_CELLS:
            commands.append((cell, intensity))
    
    elif event_type == ArmaEventType.VEHICLE_DAMAGE:
        angle = params.get("angle", 0.0)
        damage = params.get("damage", 20)
        
        cells = angle_to_cells(angle)
        intensity = calculate_damage_intensity(damage)
        
        for cell in cells:
            commands.append((cell, intensity))
    
    elif event_type == ArmaEventType.VEHICLE_EXPLOSION:
        # Maximum intensity full vest
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event_type == ArmaEventType.HELICOPTER_ROTOR:
        # Sustained back cells vibration (seat vibration simulation)
        intensity = params.get("intensity", 3)
        intensity = max(1, min(5, intensity))
        for cell in BACK_CELLS:
            commands.append((cell, intensity))
    
    # =========================================================================
    # Environment Events
    # =========================================================================
    
    elif event_type == ArmaEventType.EXPLOSION_NEARBY:
        distance = params.get("distance", 25.0)
        angle = params.get("angle", 0.0)
        
        intensity = calculate_distance_intensity(distance, max_distance=50.0)
        if intensity > 0:
            cells = angle_to_cells(angle)
            for cell in cells:
                commands.append((cell, intensity))
    
    elif event_type == ArmaEventType.BULLET_IMPACT_NEAR:
        distance = params.get("distance", 5.0)
        angle = params.get("angle", 0.0)
        
        intensity = calculate_distance_intensity(distance, max_distance=10.0)
        if intensity > 0:
            # Quick directional pulse
            cells = angle_to_cells(angle)
            # Only front cells for bullet impacts
            cells = [c for c in cells if c in FRONT_CELLS]
            if cells:
                for cell in cells:
                    commands.append((cell, min(4, intensity)))
    
    return commands


# =============================================================================
# Arma Reforger Manager
# =============================================================================

# Callback types
GameEventCallback = Callable[[str, Dict[str, Any]], None]
TriggerCallback = Callable[[int, int], None]


class ArmaReforgerManager:
    """
    Manages Arma Reforger integration within the daemon.
    
    This class:
    1. Receives events from the Arma Reforger mod (via TCP)
    2. Maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    
    Args:
        on_game_event: Called when a game event is detected
                      (event_type, params) -> None
        on_trigger: Called to trigger a haptic effect
                   (cell, speed) -> None
    """
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._enabled = False
        
        # Stats
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
    
    @property
    def is_enabled(self) -> bool:
        """Check if integration is enabled."""
        return self._enabled
    
    @property
    def events_received(self) -> int:
        """Get total events received."""
        return self._events_received
    
    @property
    def last_event_ts(self) -> Optional[float]:
        """Get timestamp of last event."""
        return self._last_event_ts
    
    @property
    def last_event_type(self) -> Optional[str]:
        """Get type of last event."""
        return self._last_event_type
    
    def start(self) -> tuple[bool, Optional[str]]:
        """
        Enable Arma Reforger integration.
        
        The mod will connect via TCP when the game starts.
        
        Returns:
            (success, error_message)
        """
        if self._enabled:
            return False, "Arma Reforger integration already enabled"
        
        self._enabled = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        
        logger.info("Arma Reforger integration enabled, waiting for mod connection")
        return True, None
    
    def stop(self) -> bool:
        """Disable Arma Reforger integration."""
        if not self._enabled:
            return False
        
        self._enabled = False
        logger.info("Arma Reforger integration disabled")
        return True
    
    def process_event(
        self,
        event_type: str,
        angle: Optional[float] = None,
        damage: Optional[float] = None,
        distance: Optional[float] = None,
        severity: Optional[float] = None,
        hand: Optional[str] = None,
        intensity: Optional[int] = None,
    ) -> bool:
        """
        Process an event from the Arma Reforger mod.
        
        Called by the daemon when it receives an armareforger_event command.
        
        Args:
            event_type: Type of event (player_damage, weapon_fire_rifle, etc.)
            angle: Damage/explosion angle in degrees
            damage: Damage amount
            distance: Distance for nearby events
            severity: Collision severity (0.0-1.0)
            hand: "left" or "right" for weapon events
            intensity: Override intensity for some events
            
        Returns:
            True if event was processed, False if integration disabled
        """
        if not self._enabled:
            logger.debug("Arma Reforger event ignored (integration disabled)")
            return False
        
        # Build params dict
        params: Dict[str, Any] = {}
        if angle is not None:
            params["angle"] = angle
        if damage is not None:
            params["damage"] = damage
        if distance is not None:
            params["distance"] = distance
        if severity is not None:
            params["severity"] = severity
        if hand is not None:
            params["hand"] = hand
        if intensity is not None:
            params["intensity"] = intensity
        
        # Create event
        event = ArmaEvent(type=event_type, params=params)
        
        # Update stats
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event_type
        
        logger.info(f"Arma Reforger event: {event_type} - {params}")
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event_type, params)
        
        # Map to haptics and trigger
        haptic_commands = map_event_to_haptics(event)
        for cell, speed in haptic_commands:
            self._trigger(cell, speed)
        
        return True
    
    def _trigger(self, cell: int, speed: int):
        """Trigger a haptic effect via callback."""
        if self.on_trigger:
            self.on_trigger(cell, speed)


# =============================================================================
# Mod Information
# =============================================================================

def get_mod_info() -> Dict[str, Any]:
    """Get information about the required Arma Reforger mod."""
    return {
        "name": "Third Space Vest Mod for Arma Reforger",
        "description": "Enforce Script mod that sends game events to the Third Space Vest daemon",
        "daemon_port": 5050,
        "install_instructions": [
            "1. Subscribe to the mod on Arma Reforger Workshop (coming soon)",
            "2. Enable the mod in Arma Reforger's mod manager",
            "3. Start the Third Space Vest daemon",
            "4. Launch Arma Reforger - the mod will auto-connect",
        ],
        "supported_events": [
            "Player damage (directional)",
            "Player death",
            "Weapon fire (rifle, MG, pistol, launcher)",
            "Vehicle collisions and damage",
            "Nearby explosions",
            "Suppression effects",
        ],
        "mod_status": "In development - requires Arma Reforger Workbench",
    }
