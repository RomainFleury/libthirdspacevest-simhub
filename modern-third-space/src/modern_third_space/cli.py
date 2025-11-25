from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict

from .controller import VestController


def _cmd_status(controller: VestController) -> int:
    status = controller.connect()
    print(status.to_json())
    return 0


def _cmd_trigger(controller: VestController, args: argparse.Namespace) -> int:
    if controller.trigger_effect(args.cell, args.speed):
        print(json.dumps({"success": True, "cell": args.cell, "speed": args.speed}))
        return 0
    print(json.dumps({"success": False, "error": controller.status().last_error}))
    return 1


def _cmd_stop(controller: VestController) -> int:
    controller.stop_all()
    print(json.dumps({"success": True, "action": "stop_all"}))
    return 0


def _cmd_effects(controller: VestController) -> int:
    effects = controller.default_effects()
    print(json.dumps(effects, indent=2))
    return 0


def _cmd_ping() -> int:
    """Health check command - verifies CLI is reachable"""
    print(json.dumps({"status": "ok", "message": "Python bridge is reachable"}))
    return 0


def _cmd_list(controller: VestController) -> int:
    """List all connected USB vest devices"""
    devices = controller.list_devices()
    print(json.dumps(devices, indent=2))
    return 0


def _cmd_connect(controller: VestController, args: argparse.Namespace) -> int:
    """Connect to a specific device"""
    device_info = {}
    
    if args.bus is not None and args.address is not None:
        device_info["bus"] = args.bus
        device_info["address"] = args.address
    elif args.serial is not None:
        device_info["serial_number"] = args.serial
    elif args.index is not None:
        device_info["index"] = args.index
    # If none specified, device_info will be None (connect to first device)
    
    status = controller.connect_to_device(device_info if device_info else None)
    print(status.to_json())
    return 0 if status.connected else 1


COMMANDS: Dict[str, Any] = {
    "status": _cmd_status,
    "trigger": _cmd_trigger,
    "stop": _cmd_stop,
    "effects": _cmd_effects,
    "ping": _cmd_ping,
    "list": _cmd_list,
    "connect": _cmd_connect,
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Modern Third Space Vest bridge CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Print connection status")
    effects = sub.add_parser("effects", help="List default effect presets")
    effects.set_defaults()

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
    # If no args provided, connects to first device
    
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    command = args.command
    handler = COMMANDS.get(command)
    if handler is None:
        parser.print_help()
        return 1
    
    # Ping doesn't need a controller
    if command == "ping":
        return handler()
    
    controller = VestController()
    # Commands that need args: trigger, connect
    if command in ("trigger", "connect"):
        return handler(controller, args)
    else:
        return handler(controller)


if __name__ == "__main__":
    sys.exit(main())


