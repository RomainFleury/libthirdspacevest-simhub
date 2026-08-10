"""
USB LC relay controller for solenoid / recoil prototyping.

Opens a serial port and sends the 4-byte LC protocol frames.
Pulse helpers turn the relay on briefly then off (safe for solenoids).
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from .discovery import list_ports
from .protocol import DEFAULT_ADDRESS, DEFAULT_BAUD, build_frame

logger = logging.getLogger(__name__)


@dataclass
class RelayStatus:
    """Snapshot of relay connection state."""

    connected: bool
    port: Optional[str] = None
    baud: int = DEFAULT_BAUD
    address: int = DEFAULT_ADDRESS
    is_on: bool = False
    last_error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "connected": self.connected,
            "port": self.port,
            "baud": self.baud,
            "address": self.address,
            "is_on": self.is_on,
            "last_error": self.last_error,
        }


class RelayController:
    """Thread-safe USB LC relay controller."""

    def __init__(self) -> None:
        self._serial = None
        self._port: Optional[str] = None
        self._baud: int = DEFAULT_BAUD
        self._address: int = DEFAULT_ADDRESS
        self._is_on: bool = False
        self._last_error: Optional[str] = None
        self._lock = threading.RLock()

    def status(self) -> RelayStatus:
        with self._lock:
            return RelayStatus(
                connected=self._serial is not None and getattr(self._serial, "is_open", False),
                port=self._port,
                baud=self._baud,
                address=self._address,
                is_on=self._is_on,
                last_error=self._last_error,
            )

    def connect(
        self,
        port: str,
        baud: int = DEFAULT_BAUD,
        address: int = DEFAULT_ADDRESS,
    ) -> None:
        """Open the serial port for the relay module."""
        if not port:
            raise ValueError("port is required")
        if baud <= 0:
            raise ValueError(f"baud must be positive, got {baud}")
        if not 0 <= address <= 0xFF:
            raise ValueError(f"address must be 0-255, got {address}")

        try:
            import serial
        except ImportError as exc:
            raise RuntimeError(
                "pyserial is required for USB relay support. Install with: pip install pyserial"
            ) from exc

        with self._lock:
            self.disconnect()
            try:
                self._serial = serial.Serial(
                    port=port,
                    baudrate=baud,
                    bytesize=serial.EIGHTBITS,
                    parity=serial.PARITY_NONE,
                    stopbits=serial.STOPBITS_ONE,
                    timeout=1.0,
                    write_timeout=1.0,
                )
                # Give the USB-UART bridge a moment after open.
                time.sleep(0.05)
                self._port = port
                self._baud = baud
                self._address = address
                self._is_on = False
                self._last_error = None
                logger.info("Relay connected on %s @ %s baud (addr=0x%02X)", port, baud, address)
            except Exception as exc:
                self._serial = None
                self._port = None
                self._last_error = str(exc)
                raise

    def disconnect(self) -> None:
        """Close the serial port (best-effort OFF first)."""
        with self._lock:
            if self._serial is not None:
                try:
                    if self._is_on:
                        self._write_frame(False)
                except Exception:
                    pass
                try:
                    self._serial.close()
                except Exception:
                    pass
            self._serial = None
            self._port = None
            self._is_on = False

    def set(self, on: bool) -> None:
        """Turn the relay on or off."""
        with self._lock:
            self._ensure_connected()
            self._write_frame(on)
            self._is_on = on

    def on(self) -> None:
        self.set(True)

    def off(self) -> None:
        self.set(False)

    def pulse(self, duration_ms: int = 40) -> None:
        """
        Activate the relay briefly for recoil-style feedback.

        Turns ON, waits duration_ms, then turns OFF.
        """
        if duration_ms < 1:
            raise ValueError(f"duration_ms must be >= 1, got {duration_ms}")
        if duration_ms > 5000:
            raise ValueError(f"duration_ms must be <= 5000 for safety, got {duration_ms}")

        with self._lock:
            self._ensure_connected()
            self._write_frame(True)
            self._is_on = True
            try:
                time.sleep(duration_ms / 1000.0)
            finally:
                self._write_frame(False)
                self._is_on = False

    def _ensure_connected(self) -> None:
        if self._serial is None or not getattr(self._serial, "is_open", False):
            raise RuntimeError("Relay is not connected")

    def _write_frame(self, on: bool) -> None:
        assert self._serial is not None
        frame = build_frame(on, self._address)
        try:
            written = self._serial.write(frame)
            self._serial.flush()
            if written != len(frame):
                raise RuntimeError(f"Incomplete write: {written}/{len(frame)} bytes")
            self._last_error = None
            logger.debug("Relay frame sent: %s", frame.hex(" ").upper())
        except Exception as exc:
            self._last_error = str(exc)
            raise


__all__ = [
    "RelayController",
    "RelayStatus",
    "list_ports",
    "DEFAULT_ADDRESS",
    "DEFAULT_BAUD",
]
