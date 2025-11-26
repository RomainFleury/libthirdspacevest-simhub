"""
Server Package - TCP daemon for centralized vest control.

This package provides a TCP server that:
- Maintains a single connection to the vest hardware
- Accepts multiple client connections
- Routes commands to the vest
- Broadcasts events to all clients

This allows the Electron UI, game mods, and scripts to share
a single vest connection and see each other's activity.

Usage:
    from modern_third_space.server import run_daemon
    run_daemon(port=5050)

Or via CLI:
    python -m modern_third_space.cli daemon --port 5050
"""

from .daemon import VestDaemon, run_daemon
from .client_manager import Client, ClientManager
from .protocol import (
    Command,
    CommandType,
    Event,
    EventType,
    Response,
)
from .lifecycle import (
    get_daemon_status,
    stop_daemon,
    ping_daemon,
    is_port_in_use,
    get_pid_file_path,
)
from .cs2_manager import CS2Manager, generate_cs2_config
from .alyx_manager import AlyxManager, get_mod_info as get_alyx_mod_info
from .superhot_manager import SuperHotManager

__all__ = [
    "VestDaemon",
    "run_daemon",
    "Client",
    "ClientManager",
    "Command",
    "CommandType",
    "Event",
    "EventType",
    "Response",
    # Lifecycle
    "get_daemon_status",
    "stop_daemon",
    "ping_daemon",
    "is_port_in_use",
    "get_pid_file_path",
    # CS2 GSI
    "CS2Manager",
    "generate_cs2_config",
    # Half-Life: Alyx
    "AlyxManager",
    "get_alyx_mod_info",
    # SUPERHOT VR
    "SuperHotManager",
]

