"""
Vest Core Package - Third Space Vest hardware management.

This package contains all code related to direct vest hardware interaction:
- Connection management
- Actuator commands
- Device discovery
- Status tracking

IMPORTANT: This package should remain isolated from:
- Game integrations and listeners
- External interfaces (WebSocket, HTTP, etc.)
- UI-specific code or presets

If you need to add game integration features, create a separate package
(e.g., `integrations/` or `listeners/`) that imports from this package.
"""

from .status import VestStatus
from .controller import VestController
from .discovery import list_devices

__all__ = ["VestStatus", "VestController", "list_devices"]

