"""
Generic Screen Health Watcher (Phase A - redness ROIs).

This manager is a daemon-side integration that watches configured screen ROIs
and emits a standardized "hit_recorded" event when a redness threshold is
exceeded, optionally with a direction key.

Design constraints:
- Windows-only runtime (screen capture backend is optional-import)
- Must be importable in dev/test environments without capture deps installed
- Uses vest.cell_layout constants for haptic triggering (random cell in Phase A)
"""

from __future__ import annotations

import json
import random
import threading
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from ..vest.cell_layout import ALL_CELLS


class DirectionKey(str, Enum):
    FRONT = "front"
    BACK = "back"
    LEFT = "left"
    RIGHT = "right"
    FRONT_LEFT = "front_left"
    FRONT_RIGHT = "front_right"
    BACK_LEFT = "back_left"
    BACK_RIGHT = "back_right"


@dataclass(frozen=True)
class NormalizedRect:
    """Rectangle in normalized coordinates (0-1)."""

    x: float
    y: float
    w: float
    h: float

    def validate(self) -> None:
        for name, v in (("x", self.x), ("y", self.y), ("w", self.w), ("h", self.h)):
            if not isinstance(v, (int, float)):
                raise ValueError(f"rect.{name} must be a number")
        if self.w <= 0 or self.h <= 0:
            raise ValueError("rect.w and rect.h must be > 0")
        if self.x < 0 or self.y < 0 or self.x > 1 or self.y > 1:
            raise ValueError("rect.x and rect.y must be in [0, 1]")
        if self.x + self.w <= 0 or self.y + self.h <= 0:
            raise ValueError("rect must have positive area")


def normalized_rect_to_pixels(rect: NormalizedRect, frame_w: int, frame_h: int) -> Tuple[int, int, int, int]:
    """
    Convert a normalized rect to a pixel rect (left, top, width, height).

    Values are clamped so the resulting rect fits within the frame.
    """
    if frame_w <= 0 or frame_h <= 0:
        raise ValueError("frame_w and frame_h must be > 0")
    rect.validate()

    # Convert to pixel coordinates
    left = int(round(rect.x * frame_w))
    top = int(round(rect.y * frame_h))
    width = int(round(rect.w * frame_w))
    height = int(round(rect.h * frame_h))

    # Clamp minimum size
    width = max(1, width)
    height = max(1, height)

    # Clamp origin
    left = max(0, min(left, frame_w - 1))
    top = max(0, min(top, frame_h - 1))

    # Clamp size to fit
    width = max(1, min(width, frame_w - left))
    height = max(1, min(height, frame_h - top))

    return left, top, width, height


def redness_score_from_bgra(raw_bgra: bytes, width: int, height: int) -> float:
    """
    Compute a redness score in [0,1] from BGRA bytes.

    Score is mean of per-pixel red-dominance:
        (R - max(G, B)) / 255, clipped to [0,1]
    """
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be > 0")
    expected = width * height * 4
    if len(raw_bgra) < expected:
        raise ValueError("raw_bgra is smaller than expected for BGRA frame")

    # Fast-ish Python loop; ROI rectangles are expected to be small.
    total = 0.0
    count = width * height
    # Iterate per pixel (BGRA)
    for i in range(0, expected, 4):
        b = raw_bgra[i]
        g = raw_bgra[i + 1]
        r = raw_bgra[i + 2]
        m = g if g >= b else b
        d = r - m
        if d <= 0:
            continue
        total += d / 255.0
    return max(0.0, min(1.0, total / float(count)))


@dataclass(frozen=True)
class RednessROI:
    name: str
    rect: NormalizedRect
    direction: Optional[DirectionKey] = None


@dataclass(frozen=True)
class RednessDetectorConfig:
    min_score: float = 0.35
    cooldown_ms: int = 200


@dataclass(frozen=True)
class ScreenCaptureConfig:
    monitor_index: int = 1  # 1-based to match common UX in Electron
    tick_ms: int = 50


@dataclass(frozen=True)
class ScreenHealthProfile:
    schema_version: int
    name: str
    capture: ScreenCaptureConfig
    rois: List[RednessROI]
    detector: RednessDetectorConfig


class ScreenHealthManager:
    """
    Daemon-managed screen watcher.

    Callbacks:
    - on_game_event(event_type: str, params: dict)
    - on_trigger(cell: int, speed: int)
    """

    def __init__(
        self,
        on_game_event: Optional[Callable[[str, Dict[str, Any]], None]] = None,
        on_trigger: Optional[Callable[[int, int], None]] = None,
    ) -> None:
        self._on_game_event = on_game_event
        self._on_trigger = on_trigger

        self._thread: Optional[threading.Thread] = None
        self._stop_evt = threading.Event()

        self._profile: Optional[ScreenHealthProfile] = None
        self._running = False

        # Stats
        self.events_received = 0
        self.last_event_ts: Optional[float] = None
        self.last_hit_ts: Optional[float] = None

        # Cooldown state
        self._last_hit_by_roi: Dict[str, float] = {}

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self, profile: Dict[str, Any] | str) -> Tuple[bool, Optional[str]]:
        if self._running:
            return True, None

        try:
            self._profile = self._parse_profile(profile)
        except Exception as e:
            return False, str(e)

        self._stop_evt.clear()
        self._thread = threading.Thread(target=self._run_loop, name="screen_health", daemon=True)
        self._thread.start()
        self._running = True
        return True, None

    def stop(self) -> bool:
        if not self._running:
            return True
        self._stop_evt.set()
        if self._thread:
            self._thread.join(timeout=2.0)
        self._running = False
        return True

    def status(self) -> Dict[str, Any]:
        return {
            "running": self._running,
            "profile_name": self._profile.name if self._profile else None,
            "events_received": self.events_received,
            "last_event_ts": self.last_event_ts,
            "last_hit_ts": self.last_hit_ts,
        }

    # ---------------------------------------------------------------------
    # Internal
    # ---------------------------------------------------------------------

    def _emit_game_event(self, event_type: str, params: Dict[str, Any]) -> None:
        self.events_received += 1
        self.last_event_ts = time.time()
        if self._on_game_event:
            self._on_game_event(event_type, params)

    def _trigger_hit(self, intensity: float) -> None:
        """Trigger a Phase A random-cell haptic."""
        if not self._on_trigger:
            return
        # Map intensity [0,1] -> speed [1,10]
        speed = max(1, min(10, int(round(1 + intensity * 9))))
        cell = int(random.choice(list(ALL_CELLS)))
        self._on_trigger(cell, speed)

    def _run_loop(self) -> None:
        assert self._profile is not None
        profile = self._profile

        # Lazily create capture backend so imports do not break tests.
        capture = _MSSCaptureBackend(monitor_index=profile.capture.monitor_index)

        tick_s = max(0.01, profile.capture.tick_ms / 1000.0)

        while not self._stop_evt.is_set():
            loop_start = time.time()

            try:
                frame_w, frame_h = capture.get_frame_size()
            except Exception:
                # If capture isn't available (missing deps / wrong OS), back off.
                time.sleep(0.5)
                continue

            for roi in profile.rois:
                if self._stop_evt.is_set():
                    break

                left, top, w, h = normalized_rect_to_pixels(roi.rect, frame_w, frame_h)

                try:
                    raw_bgra = capture.capture_bgra(left=left, top=top, width=w, height=h)
                except Exception:
                    continue

                score = redness_score_from_bgra(raw_bgra, w, h)
                if score < profile.detector.min_score:
                    continue

                now = time.time()
                last = self._last_hit_by_roi.get(roi.name, 0.0)
                if (now - last) * 1000.0 < profile.detector.cooldown_ms:
                    continue

                self._last_hit_by_roi[roi.name] = now
                self.last_hit_ts = now

                self._emit_game_event(
                    "hit_recorded",
                    {
                        "roi": roi.name,
                        "direction": roi.direction.value if roi.direction else None,
                        "score": score,
                    },
                )
                self._trigger_hit(intensity=score)

            elapsed = time.time() - loop_start
            sleep_for = tick_s - elapsed
            if sleep_for > 0:
                time.sleep(sleep_for)

    def _parse_profile(self, profile: Dict[str, Any] | str) -> ScreenHealthProfile:
        data: Dict[str, Any]
        if isinstance(profile, str):
            data = json.loads(profile)
        elif isinstance(profile, dict):
            data = profile
        else:
            raise ValueError("profile must be dict or JSON string")

        schema_version = int(data.get("schema_version", 0))
        name = str(data.get("name") or "Unnamed Profile")

        capture_data = data.get("capture") or {}
        capture = ScreenCaptureConfig(
            monitor_index=int(capture_data.get("monitor_index", 1)),
            tick_ms=int(capture_data.get("tick_ms", 50)),
        )
        if capture.tick_ms <= 0:
            raise ValueError("capture.tick_ms must be > 0")

        detectors = data.get("detectors") or []
        if not isinstance(detectors, list) or not detectors:
            raise ValueError("profile.detectors must be a non-empty list")

        # Phase A expects a single redness_rois detector; accept the first matching.
        det = next((d for d in detectors if (d.get("type") == "redness_rois")), None)
        if det is None:
            raise ValueError("Phase A requires a detector of type 'redness_rois'")

        threshold = det.get("threshold") or {}
        detector = RednessDetectorConfig(
            min_score=float(threshold.get("min_score", 0.35)),
            cooldown_ms=int(det.get("cooldown_ms", 200)),
        )
        if detector.cooldown_ms < 0:
            raise ValueError("detector.cooldown_ms must be >= 0")
        if not (0.0 <= detector.min_score <= 1.0):
            raise ValueError("threshold.min_score must be in [0,1]")

        rois_data = det.get("rois") or det.get("zones") or []
        if not isinstance(rois_data, list) or not rois_data:
            raise ValueError("redness_rois detector must include a non-empty 'rois' list")

        rois: List[RednessROI] = []
        for idx, r in enumerate(rois_data):
            r_name = str(r.get("name") or f"roi_{idx}")
            rect_data = r.get("rect") or r.get("roi")
            if not isinstance(rect_data, dict):
                raise ValueError(f"roi '{r_name}': missing rect")
            rect = NormalizedRect(
                x=float(rect_data.get("x", 0)),
                y=float(rect_data.get("y", 0)),
                w=float(rect_data.get("w", 0)),
                h=float(rect_data.get("h", 0)),
            )
            rect.validate()

            direction_raw = r.get("direction")
            direction = DirectionKey(direction_raw) if direction_raw else None

            rois.append(RednessROI(name=r_name, rect=rect, direction=direction))

        return ScreenHealthProfile(
            schema_version=schema_version,
            name=name,
            capture=capture,
            rois=rois,
            detector=detector,
        )


class _MSSCaptureBackend:
    """
    Minimal mss-based capture backend.

    This is intentionally optional-import so the manager remains importable
    without `mss` installed.
    """

    def __init__(self, monitor_index: int) -> None:
        self._monitor_index = monitor_index
        self._sct = None
        self._monitor = None

    def _ensure(self) -> None:
        if self._sct is not None and self._monitor is not None:
            return
        try:
            import mss  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError("mss is required for screen capture") from e

        self._sct = mss.mss()
        monitors = self._sct.monitors
        if not (1 <= self._monitor_index < len(monitors)):
            raise ValueError(f"Invalid monitor_index={self._monitor_index}. Available: 1..{len(monitors) - 1}")
        self._monitor = monitors[self._monitor_index]

    def get_frame_size(self) -> Tuple[int, int]:
        self._ensure()
        assert self._monitor is not None
        return int(self._monitor["width"]), int(self._monitor["height"])

    def capture_bgra(self, left: int, top: int, width: int, height: int) -> bytes:
        self._ensure()
        assert self._sct is not None
        assert self._monitor is not None

        # ROI is relative to monitor; convert to global coordinates.
        region = {
            "left": int(self._monitor["left"] + left),
            "top": int(self._monitor["top"] + top),
            "width": int(width),
            "height": int(height),
        }
        img = self._sct.grab(region)
        return img.raw  # BGRA bytes

