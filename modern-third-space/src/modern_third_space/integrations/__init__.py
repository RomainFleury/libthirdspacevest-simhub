"""
Game integrations for the Third Space Vest.

This package contains integrations that connect external game telemetry
sources to the vest daemon. Each integration is a daemon CLIENT that:

1. Receives game telemetry (HTTP, WebSocket, file watch, etc.)
2. Maps game events to haptic effects
3. Sends commands to the vest daemon via TCP

Architecture:
    Game (HTTP/etc) → Integration → Daemon (TCP:5050) → Vest Hardware

Integrations should NOT import directly from vest/ - they communicate
exclusively through the daemon protocol. This maintains isolation and
ensures the UI can see all activity.

Available integrations:
    - cs2_gsi: Counter-Strike 2 Game State Integration

Registry:
    The registry module contains the source of truth for all game integrations.
    Use it to discover available integrations and validate new ones.
"""

from .cs2_gsi import CS2GSIIntegration, run_cs2_gsi
from .registry import (
    GAME_INTEGRATIONS,
    GameIntegrationSpec,
    IntegrationType,
    IntegrationStatus,
    register_integration,
    get_integration,
    list_integrations,
    validate_integration,
    validate_all_integrations,
)

__all__ = [
    # CS2 Integration
    "CS2GSIIntegration",
    "run_cs2_gsi",
    # Registry
    "GAME_INTEGRATIONS",
    "GameIntegrationSpec",
    "IntegrationType",
    "IntegrationStatus",
    "register_integration",
    "get_integration",
    "list_integrations",
    "validate_integration",
    "validate_all_integrations",
]

