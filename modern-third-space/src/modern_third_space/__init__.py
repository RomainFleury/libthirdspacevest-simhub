"""
Modern Third Space Vest - Python bridge for Third Space Vest hardware.

This package provides a clean API for controlling Third Space Vest haptic
devices. It wraps the legacy driver in a modern interface.

Package Structure:
    vest/           - Core hardware management (isolated, no external deps)
        controller  - VestController for connection and commands
        status      - VestStatus dataclass
        discovery   - Device enumeration
    
    presets         - UI effect presets (not part of vest core)
    cli             - Command-line interface
    legacy_adapter  - Legacy driver loader
    legacy_port/    - Ported legacy driver code

Usage:
    from modern_third_space import VestController, VestStatus
    
    controller = VestController()
    status = controller.connect()
    if status.connected:
        controller.trigger_effect(cell=0, speed=5)
"""

# Re-export from vest core for backwards compatibility and convenience
from .vest import VestController, VestStatus, list_devices

__all__ = ["VestController", "VestStatus", "list_devices"]
