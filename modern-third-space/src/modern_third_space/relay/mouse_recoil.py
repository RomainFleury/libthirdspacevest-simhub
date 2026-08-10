"""
Global left-click listener for USB-relay solenoid recoil.

Firing modes:
  - single: one pulse per left-click
  - burst: N pulses per left-click, spaced by fire-rate interval
  - fullauto: pulse while left button is held, spaced by fire-rate interval

Fire rate is RPM (rounds per minute). Interval between shot *starts* is 60/RPM seconds,
but never shorter than the pulse duration itself.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Callable, Optional

logger = logging.getLogger(__name__)

PulseCallback = Callable[[int], None]

FIRE_MODES = ("single", "burst", "fullauto")
DEFAULT_COOLDOWN_S = 0.05
DEFAULT_RPM = 600
DEFAULT_BURST_COUNT = 3
MIN_RPM = 60
MAX_RPM = 1200


def interval_s_for_rpm(rpm: int, min_interval_s: float = 0.0) -> float:
    """Seconds between shot starts for a given RPM."""
    r = max(MIN_RPM, min(MAX_RPM, int(rpm)))
    return max(60.0 / float(r), float(min_interval_s))


class MouseRecoilListener:
    """Background global mouse listener for click → recoil."""

    def __init__(
        self,
        on_pulse: PulseCallback,
        cooldown_s: float = DEFAULT_COOLDOWN_S,
    ) -> None:
        self._on_pulse = on_pulse
        self._cooldown_s = max(0.0, float(cooldown_s))
        self._duration_ms = 40
        self._fire_mode = "single"
        self._fire_rate_rpm = DEFAULT_RPM
        self._burst_count = DEFAULT_BURST_COUNT
        self._listener = None
        self._running = False
        self._last_pulse_ts = 0.0
        self._lock = threading.Lock()
        self._pulses = 0
        self._last_error: Optional[str] = None
        self._button_held = False
        self._burst_stop = threading.Event()
        self._fullauto_stop = threading.Event()
        self._burst_thread: Optional[threading.Thread] = None
        self._fullauto_thread: Optional[threading.Thread] = None

    @property
    def is_running(self) -> bool:
        return self._running

    def status(self) -> dict:
        return {
            "running": self._running,
            "duration_ms": self._duration_ms,
            "fire_mode": self._fire_mode,
            "fire_rate_rpm": self._fire_rate_rpm,
            "burst_count": self._burst_count,
            "interval_ms": int(
                round(
                    interval_s_for_rpm(
                        self._fire_rate_rpm,
                        self._duration_ms / 1000.0,
                    )
                    * 1000
                )
            ),
            "pulses": self._pulses,
            "last_error": self._last_error,
        }

    def configure(
        self,
        *,
        duration_ms: Optional[int] = None,
        fire_mode: Optional[str] = None,
        fire_rate_rpm: Optional[int] = None,
        burst_count: Optional[int] = None,
    ) -> None:
        if duration_ms is not None:
            self._duration_ms = int(duration_ms)
        if fire_mode is not None:
            mode = str(fire_mode).strip().lower()
            if mode in ("one", "one_by_one", "single"):
                mode = "single"
            if mode not in FIRE_MODES:
                raise ValueError(f"fire_mode must be one of {FIRE_MODES}, got {fire_mode!r}")
            self._fire_mode = mode
        if fire_rate_rpm is not None:
            self._fire_rate_rpm = max(MIN_RPM, min(MAX_RPM, int(fire_rate_rpm)))
        if burst_count is not None:
            self._burst_count = max(1, min(20, int(burst_count)))

    def start(
        self,
        duration_ms: int = 40,
        fire_mode: str = "single",
        fire_rate_rpm: int = DEFAULT_RPM,
        burst_count: int = DEFAULT_BURST_COUNT,
    ) -> tuple[bool, Optional[str]]:
        """Start listening for global left mouse button events."""
        with self._lock:
            try:
                self.configure(
                    duration_ms=duration_ms,
                    fire_mode=fire_mode,
                    fire_rate_rpm=fire_rate_rpm,
                    burst_count=burst_count,
                )
            except ValueError as exc:
                self._last_error = str(exc)
                return False, str(exc)

            if self._running:
                return True, None

            try:
                from pynput import mouse
            except ImportError:
                msg = (
                    "pynput is required for click-based recoil. "
                    "Install with: pip install pynput"
                )
                self._last_error = msg
                return False, msg

            self._pulses = 0
            self._last_error = None
            self._running = True
            self._button_held = False
            self._burst_stop.set()
            self._fullauto_stop.set()

            def on_click(x, y, button, pressed):
                try:
                    if button != mouse.Button.left:
                        return
                except Exception:
                    return
                self._handle_button(bool(pressed))

            try:
                self._listener = mouse.Listener(on_click=on_click)
                self._listener.start()
            except Exception as exc:
                self._running = False
                self._listener = None
                self._last_error = str(exc)
                return False, str(exc)

            logger.info(
                "Mouse recoil started mode=%s rpm=%s burst=%s pulse_ms=%s",
                self._fire_mode,
                self._fire_rate_rpm,
                self._burst_count,
                self._duration_ms,
            )
            return True, None

    def stop(self) -> bool:
        """Stop the global mouse listener and any burst/full-auto loops."""
        with self._lock:
            was_running = self._running
            self._running = False
            listener = self._listener
            self._listener = None

        self._button_held = False
        self._burst_stop.set()
        self._fullauto_stop.set()
        self._join_worker(self._burst_thread)
        self._join_worker(self._fullauto_thread)
        self._burst_thread = None
        self._fullauto_thread = None

        if listener is not None:
            try:
                listener.stop()
            except Exception:
                pass

        if was_running:
            logger.info("Mouse recoil stopped (pulses=%s)", self._pulses)
        return was_running

    def _join_worker(self, thread: Optional[threading.Thread]) -> None:
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=1.5)

    def _interval_s(self) -> float:
        return interval_s_for_rpm(self._fire_rate_rpm, self._duration_ms / 1000.0)

    def _handle_button(self, pressed: bool) -> None:
        if not self._running:
            return

        mode = self._fire_mode
        if mode == "single":
            if pressed:
                self._fire_one(respect_cooldown=True)
            return

        if mode == "burst":
            if pressed:
                self._start_burst()
            return

        # fullauto
        if pressed:
            self._button_held = True
            self._start_fullauto()
        else:
            self._button_held = False
            self._fullauto_stop.set()

    def _fire_one(self, *, respect_cooldown: bool) -> None:
        if not self._running:
            return
        now = time.time()
        if respect_cooldown and (now - self._last_pulse_ts) < self._cooldown_s:
            return
        self._last_pulse_ts = now
        self._pulses += 1
        try:
            self._on_pulse(self._duration_ms)
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Mouse recoil pulse failed: %s", exc)

    def _start_burst(self) -> None:
        if self._burst_thread is not None and self._burst_thread.is_alive():
            return
        self._burst_stop.clear()
        count = self._burst_count
        interval = self._interval_s()

        def worker() -> None:
            for i in range(count):
                if not self._running or self._burst_stop.is_set():
                    break
                self._fire_one(respect_cooldown=False)
                if i + 1 >= count:
                    break
                if self._burst_stop.wait(interval):
                    break

        self._burst_thread = threading.Thread(target=worker, name="relay-burst", daemon=True)
        self._burst_thread.start()

    def _start_fullauto(self) -> None:
        if self._fullauto_thread is not None and self._fullauto_thread.is_alive():
            return
        self._fullauto_stop.clear()
        interval = self._interval_s()

        def worker() -> None:
            while self._running and self._button_held and not self._fullauto_stop.is_set():
                self._fire_one(respect_cooldown=False)
                if self._fullauto_stop.wait(interval):
                    break

        self._fullauto_thread = threading.Thread(
            target=worker, name="relay-fullauto", daemon=True
        )
        self._fullauto_thread.start()
