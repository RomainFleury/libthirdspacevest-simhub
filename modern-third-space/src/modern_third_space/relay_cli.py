"""
Standalone USB LC relay CLI for solenoid / recoil bench testing.

Works without the daemon. Prefer daemon commands in production UI.

Examples:
  python -m modern_third_space.relay_cli list
  python -m modern_third_space.relay_cli connect --port COM3
  python -m modern_third_space.relay_cli pulse --port COM3 --ms 40
  python -m modern_third_space.relay_cli on --port COM3
  python -m modern_third_space.relay_cli off --port COM3
"""

from __future__ import annotations

import argparse
import sys

from .relay import DEFAULT_ADDRESS, DEFAULT_BAUD, RelayController, list_ports


def _cmd_list(_: argparse.Namespace) -> int:
    ports = list_ports()
    if not ports:
        print("No serial ports found.")
        return 0
    print(f"Found {len(ports)} serial port(s):")
    for p in ports:
        desc = p.get("description") or ""
        mfg = p.get("manufacturer") or ""
        extra = f" — {desc}" if desc else ""
        if mfg:
            extra += f" [{mfg}]"
        print(f"  {p['device']}{extra}")
    return 0


def _with_controller(args: argparse.Namespace, action) -> int:
    ctrl = RelayController()
    try:
        ctrl.connect(
            port=args.port,
            baud=getattr(args, "baud", DEFAULT_BAUD) or DEFAULT_BAUD,
            address=getattr(args, "address", DEFAULT_ADDRESS) or DEFAULT_ADDRESS,
        )
        action(ctrl)
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        ctrl.disconnect()


def _cmd_pulse(args: argparse.Namespace) -> int:
    def action(ctrl: RelayController) -> None:
        print(f"Pulsing {args.port} for {args.ms} ms...")
        ctrl.pulse(args.ms)
        print("Done.")

    return _with_controller(args, action)


def _cmd_on(args: argparse.Namespace) -> int:
    def action(ctrl: RelayController) -> None:
        ctrl.on()
        print(f"Relay ON ({args.port})")

    return _with_controller(args, action)


def _cmd_off(args: argparse.Namespace) -> int:
    def action(ctrl: RelayController) -> None:
        ctrl.off()
        print(f"Relay OFF ({args.port})")

    return _with_controller(args, action)


def _cmd_connect(args: argparse.Namespace) -> int:
    """Connect, print status, disconnect (smoke test)."""
    def action(ctrl: RelayController) -> None:
        status = ctrl.status()
        print(f"Connected: {status.to_dict()}")

    return _with_controller(args, action)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="USB LC relay / solenoid recoil bench tool"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List serial ports")

    def add_port_args(p: argparse.ArgumentParser) -> None:
        p.add_argument("--port", required=True, help="Serial port (e.g. COM3)")
        p.add_argument("--baud", type=int, default=DEFAULT_BAUD, help="Baud rate (default 9600)")
        p.add_argument(
            "--address",
            type=int,
            default=DEFAULT_ADDRESS,
            help="Switch address byte (default 0x01)",
        )

    connect = sub.add_parser("connect", help="Open port and report status")
    add_port_args(connect)

    on = sub.add_parser("on", help="Turn relay ON")
    add_port_args(on)

    off = sub.add_parser("off", help="Turn relay OFF")
    add_port_args(off)

    pulse = sub.add_parser("pulse", help="Pulse relay for recoil (on, wait, off)")
    add_port_args(pulse)
    pulse.add_argument("--ms", type=int, default=40, help="Pulse duration in ms (default 40)")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    handlers = {
        "list": _cmd_list,
        "connect": _cmd_connect,
        "on": _cmd_on,
        "off": _cmd_off,
        "pulse": _cmd_pulse,
    }
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
