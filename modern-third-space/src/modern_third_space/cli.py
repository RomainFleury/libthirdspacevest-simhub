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
    
    print(f"[VEST] Starting vest daemon on {host}:{port}...")
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
    
    print(f"Daemon: {'🟢 Running' if is_running else '🔴 Not running'}")
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
    print("📋 Make sure CS2 has the GSI config file:")
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
            print(f"GSI Server: 🟢 Running on port {gsi_port}")
        else:
            print(f"GSI Server: 🔴 Not running")
    except Exception:
        print(f"GSI Server: 🔴 Not running")
    
    # Check daemon
    daemon_port = find_daemon_port(daemon_host)
    if daemon_port:
        print(f"Vest Daemon: 🟢 Running on port {daemon_port}")
    else:
        print(f"Vest Daemon: 🔴 Not running")
    
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


# -------------------------------------------------------------------------
# KCD2 (Kingdom Come: Deliverance 2) subcommands
# -------------------------------------------------------------------------

def _cmd_kcd2(args: argparse.Namespace) -> int:
    """Handle KCD2 subcommands."""
    action = getattr(args, "kcd2_action", None) or "start"
    
    if action == "start":
        return _kcd2_start(args)
    elif action == "stop":
        return _kcd2_stop(args)
    elif action == "status":
        return _kcd2_status(args)
    elif action == "mod-info":
        return _kcd2_mod_info(args)
    else:
        print(f"Unknown kcd2 action: {action}")
        return 1


def _kcd2_start(args: argparse.Namespace) -> int:
    """Start the KCD2 integration."""
    import socket
    import json
    
    daemon_host = getattr(args, "daemon_host", "127.0.0.1")
    daemon_port = getattr(args, "daemon_port", 5050)
    log_path = getattr(args, "log_path", None)
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((daemon_host, daemon_port))
        
        cmd: Dict[str, Any] = {"cmd": "kcd2_start"}
        if log_path:
            cmd["log_path"] = log_path
        
        sock.sendall(json.dumps(cmd).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        
        if result.get("success"):
            print("✅ KCD2 integration started")
            if result.get("log_path"):
                print(f"   Watching: {result['log_path']}")
        else:
            print(f"❌ Failed to start: {result.get('message', 'Unknown error')}")
        
        sock.close()
        return 0 if result.get("success") else 1
    except ConnectionRefusedError:
        print("❌ Cannot connect to daemon. Is it running?")
        print("   Start with: python -m modern_third_space.cli daemon start")
        return 1


def _kcd2_stop(args: argparse.Namespace) -> int:
    """Stop the KCD2 integration."""
    import socket
    import json
    
    daemon_host = getattr(args, "daemon_host", "127.0.0.1")
    daemon_port = getattr(args, "daemon_port", 5050)
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((daemon_host, daemon_port))
        
        sock.sendall(json.dumps({"cmd": "kcd2_stop"}).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        
        if result.get("success"):
            print("✅ KCD2 integration stopped")
        else:
            print("❌ Failed to stop (may not have been running)")
        
        sock.close()
        return 0 if result.get("success") else 1
    except ConnectionRefusedError:
        print("❌ Cannot connect to daemon. Is it running?")
        return 1


def _kcd2_status(args: argparse.Namespace) -> int:
    """Check KCD2 integration status."""
    import socket
    import json
    from datetime import datetime
    
    daemon_host = getattr(args, "daemon_host", "127.0.0.1")
    daemon_port = getattr(args, "daemon_port", 5050)
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((daemon_host, daemon_port))
        
        sock.sendall(json.dumps({"cmd": "kcd2_status"}).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        
        if result.get("running"):
            print("🎮 KCD2 Integration: RUNNING")
            print(f"   Log file: {result.get('log_path', 'Unknown')}")
            print(f"   Events received: {result.get('events_received', 0)}")
            
            if result.get("last_event_ts"):
                last_time = datetime.fromtimestamp(result["last_event_ts"])
                print(f"   Last event: {result.get('last_event_type', 'Unknown')} at {last_time.strftime('%H:%M:%S')}")
        else:
            print("🎮 KCD2 Integration: STOPPED")
        
        sock.close()
        return 0
    except ConnectionRefusedError:
        print("❌ Cannot connect to daemon. Is it running?")
        return 1


def _kcd2_mod_info(args: argparse.Namespace) -> int:
    """Get KCD2 mod installation info."""
    import socket
    import json
    
    daemon_host = getattr(args, "daemon_host", "127.0.0.1")
    daemon_port = getattr(args, "daemon_port", 5050)
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((daemon_host, daemon_port))
        
        sock.sendall(json.dumps({"cmd": "kcd2_get_mod_info"}).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        info = result.get("mod_info", {})
        
        print(f"\n📦 {info.get('name', 'Third Space Haptics Mod')}")
        print(f"   Version: {info.get('version', '1.0.0')}")
        print(f"   {info.get('description', '')}")
        print()
        print("📁 Required Files:")
        for f in info.get("files", []):
            print(f"   - {f}")
        print()
        print("📋 Installation Steps:")
        for step in info.get("install_instructions", []):
            print(f"   {step}")
        print()
        print("🔧 Console Commands (in-game, prefix with #):")
        for cmd in info.get("console_commands", []):
            print(f"   {cmd}")
        print()
        print(f"📖 Modding Documentation: {info.get('modding_docs', 'N/A')}")
        
        sock.close()
        return 0
    except ConnectionRefusedError:
        print("❌ Cannot connect to daemon. Is it running?")
        return 1


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
    "kcd2": _cmd_kcd2,
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
    
    # -------------------------------------------------------------------------
    # KCD2 (Kingdom Come: Deliverance 2) commands
    # -------------------------------------------------------------------------
    kcd2 = sub.add_parser("kcd2", help="Kingdom Come: Deliverance 2 integration")
    kcd2_sub = kcd2.add_subparsers(dest="kcd2_action")
    
    # kcd2 start
    kcd2_start = kcd2_sub.add_parser("start", help="Start KCD2 integration")
    kcd2_start.add_argument("--log-path", type=str, help="Path to KCD2 log file (auto-detects if not specified)")
    kcd2_start.add_argument("--daemon-host", type=str, default="127.0.0.1", help="Vest daemon host")
    kcd2_start.add_argument("--daemon-port", type=int, default=5050, help="Vest daemon port")
    
    # kcd2 stop
    kcd2_stop = kcd2_sub.add_parser("stop", help="Stop KCD2 integration")
    kcd2_stop.add_argument("--daemon-host", type=str, default="127.0.0.1", help="Vest daemon host")
    kcd2_stop.add_argument("--daemon-port", type=int, default=5050, help="Vest daemon port")
    
    # kcd2 status
    kcd2_status = kcd2_sub.add_parser("status", help="Check KCD2 integration status")
    kcd2_status.add_argument("--daemon-host", type=str, default="127.0.0.1", help="Vest daemon host")
    kcd2_status.add_argument("--daemon-port", type=int, default=5050, help="Vest daemon port")
    
    # kcd2 mod-info
    kcd2_mod_info = kcd2_sub.add_parser("mod-info", help="Get KCD2 mod installation info")
    kcd2_mod_info.add_argument("--daemon-host", type=str, default="127.0.0.1", help="Vest daemon host")
    kcd2_mod_info.add_argument("--daemon-port", type=int, default=5050, help="Vest daemon port")
    
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
    if command == "kcd2":
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
