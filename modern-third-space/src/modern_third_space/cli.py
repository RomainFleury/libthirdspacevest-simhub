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


COMMANDS: Dict[str, Any] = {
    "status": _cmd_status,
    "trigger": _cmd_trigger,
    "stop": _cmd_stop,
    "effects": _cmd_effects,
    "ping": _cmd_ping,
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
    # Trigger needs args, others just need controller
    return handler(controller, args) if command == "trigger" else handler(controller)


if __name__ == "__main__":
    sys.exit(main())


