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


def health_bar_percent_from_bgra(
    raw_bgra: bytes,
    width: int,
    height: int,
    *,
    filled_rgb: Tuple[int, int, int],
    empty_rgb: Tuple[int, int, int],
    tolerance_l1: int,
    column_threshold: float = 0.5,
) -> float:
    """
    Compute a horizontal health bar fill percent in [0,1] from BGRA bytes.

    Canonical Phase C algorithm:
    - Classify each pixel as filled if:
        df = L1(pixel_rgb, filled_rgb)
        de = L1(pixel_rgb, empty_rgb)
        df <= tolerance_l1 AND df <= de
    - For each column x: filled_ratio[x] = filled_pixels_in_column / H
    - Column is filled if filled_ratio[x] >= column_threshold
    - Scan left -> right to find first empty column; percent = x_boundary / W
    """
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be > 0")
    expected = width * height * 4
    if len(raw_bgra) < expected:
        raise ValueError("raw_bgra is smaller than expected for BGRA frame")
    if tolerance_l1 < 0 or tolerance_l1 > 765:
        raise ValueError("tolerance_l1 must be in [0, 765]")
    if not (0.0 <= column_threshold <= 1.0):
        raise ValueError("column_threshold must be in [0, 1]")

    fr, fg, fb = filled_rgb
    er, eg, eb = empty_rgb

    filled_counts_by_col = [0] * width
    # raw_bgra is row-major: for pixel (x,y) index = (y*width + x)*4
    i = 0
    for _y in range(height):
        for x in range(width):
            b = raw_bgra[i]
            g = raw_bgra[i + 1]
            r = raw_bgra[i + 2]
            i += 4

            df = abs(r - fr) + abs(g - fg) + abs(b - fb)
            if df > tolerance_l1:
                continue
            de = abs(r - er) + abs(g - eg) + abs(b - eb)
            if df <= de:
                filled_counts_by_col[x] += 1

    # Find first column that is not filled.
    col_min = int(column_threshold * height)
    for x in range(width):
        if filled_counts_by_col[x] < col_min:
            return max(0.0, min(1.0, x / float(width)))
    return 1.0


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
class RGB:
    r: int
    g: int
    b: int

    def validate(self) -> None:
        for name, v in (("r", self.r), ("g", self.g), ("b", self.b)):
            if not isinstance(v, int):
                raise ValueError(f"rgb.{name} must be an int")
            if not (0 <= v <= 255):
                raise ValueError(f"rgb.{name} must be in [0,255]")

    def as_tuple(self) -> Tuple[int, int, int]:
        return (self.r, self.g, self.b)


@dataclass(frozen=True)
class HealthBarColorSampling:
    filled: RGB
    empty: RGB
    tolerance_l1: int

    def validate(self) -> None:
        self.filled.validate()
        self.empty.validate()
        if not isinstance(self.tolerance_l1, int):
            raise ValueError("color_sampling.tolerance_l1 must be an int")
        if not (0 <= self.tolerance_l1 <= 765):
            raise ValueError("color_sampling.tolerance_l1 must be in [0,765]")


@dataclass(frozen=True)
class HealthBarThresholdFallback:
    mode: str  # "brightness" | "saturation"
    min_value: float

    def validate(self) -> None:
        if self.mode not in ("brightness", "saturation"):
            raise ValueError("threshold_fallback.mode must be 'brightness' or 'saturation'")
        if not isinstance(self.min_value, (int, float)):
            raise ValueError("threshold_fallback.min must be a number")
        if not (0.0 <= float(self.min_value) <= 1.0):
            raise ValueError("threshold_fallback.min must be in [0,1]")


@dataclass(frozen=True)
class HealthBarHitOnDecrease:
    min_drop: float
    cooldown_ms: int

    def validate(self) -> None:
        if not isinstance(self.min_drop, (int, float)):
            raise ValueError("hit_on_decrease.min_drop must be a number")
        if not (0.0 <= float(self.min_drop) <= 1.0):
            raise ValueError("hit_on_decrease.min_drop must be in [0,1]")
        if not isinstance(self.cooldown_ms, int):
            raise ValueError("hit_on_decrease.cooldown_ms must be an int")
        if self.cooldown_ms < 0:
            raise ValueError("hit_on_decrease.cooldown_ms must be >= 0")


@dataclass(frozen=True)
class HealthBarDetector:
    rect: NormalizedRect
    orientation: str  # Phase C: "horizontal"
    color_sampling: Optional[HealthBarColorSampling]
    hit_on_decrease: HealthBarHitOnDecrease
    threshold_fallback: Optional[HealthBarThresholdFallback] = None
    name: str = "health_bar"

    def validate(self) -> None:
        self.rect.validate()
        if self.orientation != "horizontal":
            raise ValueError("health_bar.orientation must be 'horizontal' (Phase C)")
        if self.color_sampling is not None:
            self.color_sampling.validate()
        if self.threshold_fallback is not None:
            self.threshold_fallback.validate()
        self.hit_on_decrease.validate()
        if not isinstance(self.name, str) or not self.name:
            raise ValueError("health_bar.name must be a non-empty string")


@dataclass(frozen=True)
class ScreenCaptureConfig:
    monitor_index: int = 1  # 1-based to match common UX in Electron
    tick_ms: int = 50


@dataclass(frozen=True)
class ScreenHealthProfile:
    schema_version: int
    name: str
    capture: ScreenCaptureConfig
    redness_rois: List[RednessROI]
    redness_detector: Optional[RednessDetectorConfig]
    health_bars: List[HealthBarDetector]


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

        # Health bar state
        self._prev_health_percent_by_detector: Dict[str, float] = {}
        self._last_health_emit_by_detector: Dict[str, float] = {}
        self._last_health_percent_emitted: Dict[str, float] = {}

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

            # Redness ROIs (Phase A)
            if profile.redness_detector is not None:
                for roi in profile.redness_rois:
                    if self._stop_evt.is_set():
                        break

                    left, top, w, h = normalized_rect_to_pixels(roi.rect, frame_w, frame_h)

                    try:
                        raw_bgra = capture.capture_bgra(left=left, top=top, width=w, height=h)
                    except Exception:
                        continue

                    score = redness_score_from_bgra(raw_bgra, w, h)
                    if score < profile.redness_detector.min_score:
                        continue

                    now = time.time()
                    key = f"redness:{roi.name}"
                    last = self._last_hit_by_roi.get(key, 0.0)
                    if (now - last) * 1000.0 < profile.redness_detector.cooldown_ms:
                        continue

                    self._last_hit_by_roi[key] = now
                    self.last_hit_ts = now

                    self._emit_game_event(
                        "hit_recorded",
                        {
                            "roi": roi.name,
                            "direction": roi.direction.value if roi.direction else None,
                            "score": score,
                            "source": "redness_rois",
                        },
                    )
                    self._trigger_hit(intensity=score)

            # Health bar (Phase C)
            for hb in profile.health_bars:
                if self._stop_evt.is_set():
                    break

                left, top, w, h = normalized_rect_to_pixels(hb.rect, frame_w, frame_h)
                try:
                    raw_bgra = capture.capture_bgra(left=left, top=top, width=w, height=h)
                except Exception:
                    continue

                percent_raw: Optional[float] = None
                if hb.color_sampling is not None:
                    percent_raw = health_bar_percent_from_bgra(
                        raw_bgra,
                        w,
                        h,
                        filled_rgb=hb.color_sampling.filled.as_tuple(),
                        empty_rgb=hb.color_sampling.empty.as_tuple(),
                        tolerance_l1=hb.color_sampling.tolerance_l1,
                    )
                elif hb.threshold_fallback is not None:
                    percent_raw = self._health_bar_percent_threshold_fallback(
                        raw_bgra, w, h, hb.threshold_fallback
                    )

                if percent_raw is None:
                    continue

                # Clamp for safety
                percent = max(0.0, min(1.0, float(percent_raw)))

                # Emit health_percent (throttled)
                now = time.time()
                last_emit = self._last_health_emit_by_detector.get(hb.name, 0.0)
                last_val = self._last_health_percent_emitted.get(hb.name)
                should_emit = False
                if last_val is None:
                    should_emit = True
                elif abs(percent - last_val) >= 0.005:
                    should_emit = True
                elif (now - last_emit) * 1000.0 >= 500.0:
                    should_emit = True

                if should_emit:
                    self._last_health_emit_by_detector[hb.name] = now
                    self._last_health_percent_emitted[hb.name] = percent
                    self._emit_game_event(
                        "health_percent",
                        {
                            "detector": hb.name,
                            "percent": percent,
                        },
                    )

                # Hit on decrease
                prev = self._prev_health_percent_by_detector.get(hb.name)
                self._prev_health_percent_by_detector[hb.name] = percent
                if prev is None:
                    continue

                drop = float(prev) - float(percent)
                if drop < hb.hit_on_decrease.min_drop:
                    continue

                key = f"health_bar:{hb.name}"
                last_hit = self._last_hit_by_roi.get(key, 0.0)
                if (now - last_hit) * 1000.0 < hb.hit_on_decrease.cooldown_ms:
                    continue

                self._last_hit_by_roi[key] = now
                self.last_hit_ts = now

                self._emit_game_event(
                    "hit_recorded",
                    {
                        "roi": hb.name,
                        "direction": None,
                        "score": max(0.0, min(1.0, drop)),
                        "source": "health_bar",
                        "percent": percent,
                        "prev_percent": float(prev),
                        "drop": drop,
                    },
                )
                # Map intensity to drop, but keep within [0,1]
                self._trigger_hit(intensity=max(0.0, min(1.0, drop)))

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

        redness_detector: Optional[RednessDetectorConfig] = None
        redness_rois: List[RednessROI] = []
        health_bars: List[HealthBarDetector] = []

        # Parse detectors (schema_version 0 extensions)
        for d in detectors:
            if not isinstance(d, dict):
                continue
            d_type = d.get("type")
            if d_type == "redness_rois":
                threshold = d.get("threshold") or {}
                detector = RednessDetectorConfig(
                    min_score=float(threshold.get("min_score", 0.35)),
                    cooldown_ms=int(d.get("cooldown_ms", 200)),
                )
                if detector.cooldown_ms < 0:
                    raise ValueError("detector.cooldown_ms must be >= 0")
                if not (0.0 <= detector.min_score <= 1.0):
                    raise ValueError("threshold.min_score must be in [0,1]")

                rois_data = d.get("rois") or d.get("zones") or []
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

                redness_detector = detector
                redness_rois = rois
                continue

            if d_type == "health_bar":
                name_raw = d.get("name") or "health_bar"
                name = str(name_raw)

                roi = d.get("roi")
                if not isinstance(roi, dict):
                    raise ValueError("health_bar.roi is required")
                rect = NormalizedRect(
                    x=float(roi.get("x", 0)),
                    y=float(roi.get("y", 0)),
                    w=float(roi.get("w", 0)),
                    h=float(roi.get("h", 0)),
                )
                rect.validate()

                orientation = str(d.get("orientation") or "horizontal")
                if orientation != "horizontal":
                    raise ValueError("health_bar.orientation must be 'horizontal' (Phase C)")

                color_sampling_data = d.get("color_sampling")
                color_sampling: Optional[HealthBarColorSampling] = None
                if isinstance(color_sampling_data, dict):
                    filled_arr = color_sampling_data.get("filled_rgb")
                    empty_arr = color_sampling_data.get("empty_rgb")
                    if (
                        isinstance(filled_arr, list)
                        and len(filled_arr) == 3
                        and isinstance(empty_arr, list)
                        and len(empty_arr) == 3
                    ):
                        filled = RGB(int(filled_arr[0]), int(filled_arr[1]), int(filled_arr[2]))
                        empty = RGB(int(empty_arr[0]), int(empty_arr[1]), int(empty_arr[2]))
                        color_sampling = HealthBarColorSampling(
                            filled=filled,
                            empty=empty,
                            tolerance_l1=int(color_sampling_data.get("tolerance_l1", 120)),
                        )
                        color_sampling.validate()

                threshold_fallback_data = d.get("threshold_fallback")
                threshold_fallback: Optional[HealthBarThresholdFallback] = None
                if isinstance(threshold_fallback_data, dict):
                    threshold_fallback = HealthBarThresholdFallback(
                        mode=str(threshold_fallback_data.get("mode") or "brightness"),
                        min_value=float(threshold_fallback_data.get("min", 0.5)),
                    )
                    threshold_fallback.validate()

                hit_on_decrease_data = d.get("hit_on_decrease")
                if not isinstance(hit_on_decrease_data, dict):
                    raise ValueError("health_bar.hit_on_decrease is required")
                hit_on_decrease = HealthBarHitOnDecrease(
                    min_drop=float(hit_on_decrease_data.get("min_drop", 0.02)),
                    cooldown_ms=int(hit_on_decrease_data.get("cooldown_ms", 150)),
                )
                hit_on_decrease.validate()

                hb = HealthBarDetector(
                    name=name,
                    rect=rect,
                    orientation=orientation,
                    color_sampling=color_sampling,
                    threshold_fallback=threshold_fallback,
                    hit_on_decrease=hit_on_decrease,
                )
                hb.validate()
                health_bars.append(hb)
                continue

        if redness_detector is None and not health_bars:
            raise ValueError("profile.detectors must include at least one supported detector")

        return ScreenHealthProfile(
            schema_version=schema_version,
            name=name,
            capture=capture,
            redness_rois=redness_rois,
            redness_detector=redness_detector,
            health_bars=health_bars,
        )

    def _health_bar_percent_threshold_fallback(
        self, raw_bgra: bytes, width: int, height: int, fallback: HealthBarThresholdFallback
    ) -> float:
        """
        Fallback % when color sampling isn't available.

        This is intentionally simple and Phase C only guarantees support (not canonical).
        - brightness: treat pixel filled if max(r,g,b)/255 >= min_value
        - saturation: treat pixel filled if (max-min)/max >= min_value, with max>0
        """
        expected = width * height * 4
        if len(raw_bgra) < expected:
            raise ValueError("raw_bgra is smaller than expected for BGRA frame")

        filled_counts_by_col = [0] * width
        i = 0
        min_v = float(fallback.min_value)
        for _y in range(height):
            for x in range(width):
                b = raw_bgra[i]
                g = raw_bgra[i + 1]
                r = raw_bgra[i + 2]
                i += 4

                mx = r if r >= g else g
                mx = mx if mx >= b else b
                mn = r if r <= g else g
                mn = mn if mn <= b else b

                if fallback.mode == "brightness":
                    if (mx / 255.0) >= min_v:
                        filled_counts_by_col[x] += 1
                else:  # saturation
                    if mx <= 0:
                        continue
                    sat = (mx - mn) / float(mx)
                    if sat >= min_v:
                        filled_counts_by_col[x] += 1

        col_min = int(0.5 * height)
        for x in range(width):
            if filled_counts_by_col[x] < col_min:
                return max(0.0, min(1.0, x / float(width)))
        return 1.0


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

