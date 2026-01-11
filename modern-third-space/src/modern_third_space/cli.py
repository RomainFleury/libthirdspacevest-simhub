"""
Command-line interface for the Modern Third Space Vest bridge.

This CLI provides commands for:
- Health checks (ping)
- Device discovery (list)
- Connection management (status, connect)
- Actuator control (trigger, stop)
- Effect presets (effects)
- Daemon server (daemon start/stop/status)
- Game integrations (cs2 start/stop/generate-config)

Usage:
    python -m modern_third_space.cli <command> [options]

Examples:
    python -m modern_third_space.cli ping
    python -m modern_third_space.cli list
    python -m modern_third_space.cli status
    python -m modern_third_space.cli connect --bus 1 --address 5
    python -m modern_third_space.cli trigger --cell 0 --speed 5
    python -m modern_third_space.cli stop
    python -m modern_third_space.cli daemon start --port 5050
    python -m modern_third_space.cli daemon stop
    python -m modern_third_space.cli daemon status
    python -m modern_third_space.cli cs2 start
    python -m modern_third_space.cli cs2 generate-config
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict

# Import from vest core package
from .vest import VestController, list_devices

# Import UI presets (separate from vest core)
from .presets import default_effects


def _cmd_status(controller: VestController) -> int:
    """Get connection status."""
    status = controller.connect()
    print(status.to_json())
    return 0


def _cmd_trigger(controller: VestController, args: argparse.Namespace) -> int:
    """Trigger a single actuator."""
    if controller.trigger_effect(args.cell, args.speed):
        print(json.dumps({"success": True, "cell": args.cell, "speed": args.speed}))
        return 0
    print(json.dumps({"success": False, "error": controller.status().last_error}))
    return 1


def _cmd_stop(controller: VestController) -> int:
    """Stop all actuators."""
    controller.stop_all()
    print(json.dumps({"success": True, "action": "stop_all"}))
    return 0


def _cmd_effects(_controller: VestController) -> int:
    """List default effect presets (UI data)."""
    effects = default_effects()
    print(json.dumps(effects, indent=2))
    return 0


def _cmd_ping() -> int:
    """Health check - verify CLI is reachable."""
    print(json.dumps({"status": "ok", "message": "Python bridge is reachable"}))
    return 0


def _cmd_list() -> int:
    """List all connected USB vest devices."""
    devices = list_devices()
    print(json.dumps(devices, indent=2))
    return 0


def _cmd_connect(controller: VestController, args: argparse.Namespace) -> int:
    """Connect to a specific device."""
    device_info: Dict[str, Any] = {}
    
    if args.bus is not None and args.address is not None:
        device_info["bus"] = args.bus
        device_info["address"] = args.address
    elif args.serial is not None:
        device_info["serial_number"] = args.serial
    elif args.index is not None:
        device_info["index"] = args.index
    # If none specified, device_info will be empty (connect to first device)
    
    status = controller.connect_to_device(device_info if device_info else None)
    print(status.to_json())
    return 0 if status.connected else 1


# -------------------------------------------------------------------------
# Daemon subcommands
# -------------------------------------------------------------------------

def _cmd_daemon(args: argparse.Namespace) -> int:
    """Handle daemon subcommands."""
    action = getattr(args, "daemon_action", None) or "start"
    
    if action == "start":
        return _daemon_start(args)
    elif action == "stop":
        return _daemon_stop(args)
    elif action == "status":
        return _daemon_status(args)
    else:
        print(f"Unknown daemon action: {action}")
        return 1


def _daemon_start(args: argparse.Namespace) -> int:
    """Start the vest daemon server."""
    from .server import run_daemon
    
    host = args.host
    port = args.port

    # Optional screen health debug flags (helpful for calibration).
    if getattr(args, "screen_health_debug", False):
        os.environ["THIRD_SPACE_SCREEN_HEALTH_DEBUG"] = "1"
    if getattr(args, "screen_health_debug_save", False):
        os.environ["THIRD_SPACE_SCREEN_HEALTH_DEBUG_SAVE"] = "1"
    if getattr(args, "screen_health_debug_dir", None):
        os.environ["THIRD_SPACE_SCREEN_HEALTH_DEBUG_DIR"] = str(args.screen_health_debug_dir)
    if getattr(args, "screen_health_debug_every_n", None):
        os.environ["THIRD_SPACE_SCREEN_HEALTH_DEBUG_EVERY_N"] = str(args.screen_health_debug_every_n)
    
    print(f"[VEST] Starting vest daemon on {host}:{port}...", flush=True)
    run_daemon(host=host, port=port)
    return 0


def _daemon_stop(args: argparse.Namespace) -> int:
    """Stop the vest daemon server."""
    from .server import stop_daemon
    
    host = args.host
    port = args.port
    force = getattr(args, "force", False)
    
    success, message = stop_daemon(host=host, port=port, force=force)
    
    if success:
        print(f"[OK] {message}")
        return 0
    else:
        print(f"[ERROR] {message}")
        return 1


def _daemon_status(args: argparse.Namespace) -> int:
    """Check daemon status."""
    from .server import get_daemon_status, ping_daemon, get_pid_file_path
    
    host = args.host
    port = args.port
    
    is_running, pid, message = get_daemon_status(host, port)
    
    print(f"Daemon: {'[RUNNING]' if is_running else '[NOT RUNNING]'}")
    print(f"Status: {message}")
    print(f"PID file: {get_pid_file_path(port)}")
    
    if is_running:
        # Try to ping for more details
        success, response = ping_daemon(host, port)
        if success:
            print(f"Connected to vest: {'Yes' if response.get('connected') else 'No'}")
            print(f"Device selected: {'Yes' if response.get('has_device_selected') else 'No'}")
            print(f"Connected clients: {response.get('client_count', 0)}")
        else:
            print(f"Ping failed: {response.get('error', 'Unknown error')}")
        return 0
    
    return 1


# -------------------------------------------------------------------------
# CS2 GSI subcommands
# -------------------------------------------------------------------------

def _cmd_cs2(args: argparse.Namespace) -> int:
    """Handle CS2 GSI subcommands."""
    action = getattr(args, "cs2_action", None) or "start"
    
    if action == "start":
        return _cs2_start(args)
    elif action == "generate-config":
        return _cs2_generate_config(args)
    elif action == "status":
        return _cs2_status(args)
    else:
        print(f"Unknown cs2 action: {action}")
        return 1


def _cs2_start(args: argparse.Namespace) -> int:
    """Start the CS2 GSI integration."""
    import asyncio
    from .integrations.cs2_gsi import run_cs2_gsi
    
    gsi_host = getattr(args, "gsi_host", "127.0.0.1")
    gsi_port = getattr(args, "gsi_port", 3000)
    daemon_host = getattr(args, "daemon_host", "127.0.0.1")
    daemon_port = getattr(args, "daemon_port", None)
    
    print(f"[CS2] Starting CS2 GSI integration...")
    print(f"   GSI server: http://{gsi_host}:{gsi_port}")
    if daemon_port:
        print(f"   Daemon: {daemon_host}:{daemon_port}")
    else:
        print(f"   Daemon: auto-discover on {daemon_host}")
    print()
    print("[INFO] Make sure CS2 has the GSI config file:")
    print("   Run: python -m modern_third_space.cli cs2 generate-config")
    print()
    
    try:
        asyncio.run(run_cs2_gsi(
            gsi_host=gsi_host,
            gsi_port=gsi_port,
            daemon_host=daemon_host,
            daemon_port=daemon_port
        ))
    except KeyboardInterrupt:
        print("\n👋 CS2 GSI integration stopped")
    
    return 0


def _cs2_generate_config(args: argparse.Namespace) -> int:
    """Generate CS2 GSI config file."""
    import os
    from .integrations.cs2_gsi import generate_gsi_config, get_cs2_cfg_path
    
    gsi_host = getattr(args, "gsi_host", "127.0.0.1")
    gsi_port = getattr(args, "gsi_port", 3000)
    output_path = getattr(args, "output", None)
    
    config_content = generate_gsi_config(host=gsi_host, port=gsi_port)
    
    if output_path:
        # Write to specified path
        with open(output_path, "w") as f:
            f.write(config_content)
        print(f"[OK] Config written to: {output_path}")
        return 0
    
    # Try to find CS2 directory
    cs2_cfg_path = get_cs2_cfg_path()
    
    if cs2_cfg_path:
        config_file = os.path.join(cs2_cfg_path, "gamestate_integration_thirdspace.cfg")
        
        # Ask for confirmation
        print(f"📂 Found CS2 config directory:")
        print(f"   {cs2_cfg_path}")
        print()
        print(f"📄 Will create:")
        print(f"   {config_file}")
        print()
        print("Config content:")
        print("-" * 40)
        print(config_content)
        print("-" * 40)
        print()
        
        response = input("Write this file? [y/N] ").strip().lower()
        if response == "y":
            with open(config_file, "w") as f:
                f.write(config_content)
            print(f"[OK] Config written!")
            print()
            print("[CS2] Restart CS2 for changes to take effect.")
            return 0
        else:
            print("[CANCELLED]")
            return 1
    else:
        # Print config and manual instructions
        print("[INFO] Could not find CS2 config directory automatically.")
        print()
        print("[INFO] Manually create this file:")
        print("   <CS2_DIR>/game/csgo/cfg/gamestate_integration_thirdspace.cfg")
        print()
        print("Config content:")
        print("-" * 40)
        print(config_content)
        print("-" * 40)
        return 0


def _cs2_status(args: argparse.Namespace) -> int:
    """Check CS2 GSI status."""
    import socket
    from .integrations.cs2_gsi import find_daemon_port, get_cs2_cfg_path
    
    gsi_port = getattr(args, "gsi_port", 3000)
    daemon_host = getattr(args, "daemon_host", "127.0.0.1")
    
    print("[CS2] CS2 GSI Integration Status")
    print("=" * 40)
    
    # Check if GSI port is in use (integration running)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        result = sock.connect_ex(("127.0.0.1", gsi_port))
        sock.close()
        
        if result == 0:
            print(f"GSI Server: [RUNNING] on port {gsi_port}")
        else:
            print(f"GSI Server: [NOT RUNNING]")
    except Exception:
        print(f"GSI Server: [NOT RUNNING]")
    
    # Check daemon
    daemon_port = find_daemon_port(daemon_host)
    if daemon_port:
        print(f"Vest Daemon: [RUNNING] on port {daemon_port}")
    else:
        print(f"Vest Daemon: [NOT RUNNING]")
    
    # Check CS2 config file
    cs2_cfg_path = get_cs2_cfg_path()
    if cs2_cfg_path:
        import os
        config_file = os.path.join(cs2_cfg_path, "gamestate_integration_thirdspace.cfg")
        if os.path.exists(config_file):
            print(f"GSI Config: [OK] Found at {config_file}")
        else:
            print(f"GSI Config: [MISSING] Not found (run: cs2 generate-config)")
    else:
        print(f"GSI Config: [WARN] CS2 directory not found")
    
    print()
    return 0


COMMANDS: Dict[str, Any] = {
    "status": _cmd_status,
    "trigger": _cmd_trigger,
    "stop": _cmd_stop,
    "effects": _cmd_effects,
    "ping": _cmd_ping,
    "list": _cmd_list,
    "connect": _cmd_connect,
    "daemon": _cmd_daemon,
    "cs2": _cmd_cs2,
}


def build_parser() -> argparse.ArgumentParser:
    """Build the argument parser."""
    parser = argparse.ArgumentParser(
        description="Modern Third Space Vest bridge CLI"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Print connection status")
    sub.add_parser("effects", help="List default effect presets")

    trigger = sub.add_parser("trigger", help="Trigger a single actuator")
    trigger.add_argument("--cell", type=int, required=True, help="Cell index (0-7)")
    trigger.add_argument("--speed", type=int, required=True, help="Speed (0-10)")

    sub.add_parser("stop", help="Stop all actuators")
    sub.add_parser("ping", help="Health check - verify CLI is reachable")
    sub.add_parser("list", help="List all connected USB vest devices")
    
    connect = sub.add_parser("connect", help="Connect to a specific device")
    connect.add_argument("--bus", type=int, help="USB bus number (requires --address)")
    connect.add_argument("--address", type=int, help="USB device address (requires --bus)")
    connect.add_argument("--serial", type=str, help="Device serial number")
    connect.add_argument("--index", type=int, help="Device index in list")
    
    # Daemon command with subcommands
    daemon = sub.add_parser("daemon", help="Manage the vest daemon server")
    daemon.add_argument("--host", type=str, default="127.0.0.1", help="Host (default: 127.0.0.1)")
    daemon.add_argument("--port", type=int, default=5050, help="Port (default: 5050)")
    
    daemon_sub = daemon.add_subparsers(dest="daemon_action")
    
    # daemon start
    daemon_start = daemon_sub.add_parser("start", help="Start the daemon")
    daemon_start.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    daemon_start.add_argument("--port", type=int, default=5050, help="Port to listen on")
    daemon_start.add_argument(
        "--screen-health-debug",
        action="store_true",
        help="Enable Generic Screen Health debug value logs (equivalent to THIRD_SPACE_SCREEN_HEALTH_DEBUG=1)",
    )
    daemon_start.add_argument(
        "--screen-health-debug-save",
        action="store_true",
        help="Save ROI crops as .bmp during Generic Screen Health runs (equivalent to THIRD_SPACE_SCREEN_HEALTH_DEBUG_SAVE=1)",
    )
    daemon_start.add_argument(
        "--screen-health-debug-dir",
        type=str,
        default=None,
        help="Directory to save ROI crops (equivalent to THIRD_SPACE_SCREEN_HEALTH_DEBUG_DIR=...)",
    )
    daemon_start.add_argument(
        "--screen-health-debug-every-n",
        type=int,
        default=None,
        help="Log cadence in ticks (equivalent to THIRD_SPACE_SCREEN_HEALTH_DEBUG_EVERY_N=...)",
    )
    
    # daemon stop
    daemon_stop = daemon_sub.add_parser("stop", help="Stop the daemon")
    daemon_stop.add_argument("--host", type=str, default="127.0.0.1", help="Daemon host")
    daemon_stop.add_argument("--port", type=int, default=5050, help="Daemon port")
    daemon_stop.add_argument("--force", action="store_true", help="Force kill (SIGKILL)")
    
    # daemon status
    daemon_status = daemon_sub.add_parser("status", help="Check daemon status")
    daemon_status.add_argument("--host", type=str, default="127.0.0.1", help="Daemon host")
    daemon_status.add_argument("--port", type=int, default=5050, help="Daemon port")
    
    # -------------------------------------------------------------------------
    # CS2 GSI commands
    # -------------------------------------------------------------------------
    cs2 = sub.add_parser("cs2", help="Counter-Strike 2 GSI integration")
    cs2_sub = cs2.add_subparsers(dest="cs2_action")
    
    # cs2 start
    cs2_start = cs2_sub.add_parser("start", help="Start CS2 GSI integration")
    cs2_start.add_argument("--gsi-host", type=str, default="127.0.0.1", help="GSI server host (default: 127.0.0.1)")
    cs2_start.add_argument("--gsi-port", type=int, default=3000, help="GSI server port (default: 3000)")
    cs2_start.add_argument("--daemon-host", type=str, default="127.0.0.1", help="Vest daemon host")
    cs2_start.add_argument("--daemon-port", type=int, default=None, help="Vest daemon port (auto-discover if not set)")
    
    # cs2 generate-config
    cs2_config = cs2_sub.add_parser("generate-config", help="Generate CS2 GSI config file")
    cs2_config.add_argument("--gsi-host", type=str, default="127.0.0.1", help="GSI server host")
    cs2_config.add_argument("--gsi-port", type=int, default=3000, help="GSI server port")
    cs2_config.add_argument("--output", "-o", type=str, help="Output file path (auto-detect if not set)")
    
    # cs2 status
    cs2_status = cs2_sub.add_parser("status", help="Check CS2 GSI status")
    cs2_status.add_argument("--gsi-port", type=int, default=3000, help="GSI server port")
    cs2_status.add_argument("--daemon-host", type=str, default="127.0.0.1", help="Vest daemon host")
    
    return parser


def main(argv: list[str] | None = None) -> int:
    """Main entry point."""
    parser = build_parser()
    args = parser.parse_args(argv)
    command = args.command
    handler = COMMANDS.get(command)
    
    if handler is None:
        parser.print_help()
        return 1
    
    # Commands that don't need a controller
    if command == "ping":
        return handler()
    if command == "list":
        return handler()
    if command == "daemon":
        return handler(args)
    if command == "cs2":
        return handler(args)
    
    # Commands that need a controller
    controller = VestController()
    
    # Commands that need args
    if command in ("trigger", "connect"):
        return handler(controller, args)
    else:
        return handler(controller)


if __name__ == "__main__":
    sys.exit(main())
