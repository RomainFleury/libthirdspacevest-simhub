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
import logging
import os
import random
import struct
import threading
import time
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from ..vest.cell_layout import ALL_CELLS

logger = logging.getLogger(__name__)


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


def _resize_bitmap_nearest(bits: List[int], src_w: int, src_h: int, dst_w: int, dst_h: int) -> List[int]:
    if src_w <= 0 or src_h <= 0 or dst_w <= 0 or dst_h <= 0:
        raise ValueError("bitmap sizes must be > 0")
    if len(bits) < src_w * src_h:
        raise ValueError("bitmap bits too small for src size")
    out: List[int] = [0] * (dst_w * dst_h)
    for y in range(dst_h):
        sy = int(y * src_h / dst_h)
        for x in range(dst_w):
            sx = int(x * src_w / dst_w)
            out[y * dst_w + x] = 1 if bits[sy * src_w + sx] else 0
    return out


def binarize_bgra_to_bitmap(
    raw_bgra: bytes,
    width: int,
    height: int,
    *,
    threshold: float,
    invert: bool,
    scale: int,
) -> Tuple[List[int], int, int]:
    """
    Convert BGRA ROI to a binary bitmap (row-major) with optional integer scaling.

    Output bits are 0/1 with 1 representing "foreground/ink".

    Notes:
    - Uses integer grayscale: gray ≈ 0.299R + 0.587G + 0.114B
    - Threshold compares gray/255 >= threshold
    - If invert=True, bits are flipped
    - Scaling uses nearest-neighbor replication (equivalent to NN scale before binarization)
    """
    if width <= 0 or height <= 0:
        raise ValueError("width and height must be > 0")
    expected = width * height * 4
    if len(raw_bgra) < expected:
        raise ValueError("raw_bgra is smaller than expected for BGRA frame")
    if not (0.0 <= float(threshold) <= 1.0):
        raise ValueError("threshold must be in [0,1]")
    if not isinstance(scale, int) or scale < 1:
        raise ValueError("scale must be an int >= 1")

    thr = int(round(float(threshold) * 255.0))
    out_w = width * scale
    out_h = height * scale
    out: List[int] = [0] * (out_w * out_h)

    i = 0
    for y in range(height):
        for x in range(width):
            b = raw_bgra[i]
            g = raw_bgra[i + 1]
            r = raw_bgra[i + 2]
            i += 4

            gray = (r * 299 + g * 587 + b * 114) // 1000
            bit = 1 if gray >= thr else 0
            if invert:
                bit = 0 if bit else 1

            if scale == 1:
                out[y * out_w + x] = bit
            else:
                oy0 = y * scale
                ox0 = x * scale
                for yy in range(scale):
                    row = (oy0 + yy) * out_w
                    for xx in range(scale):
                        out[row + (ox0 + xx)] = bit

    return out, out_w, out_h


def hamming_distance_bits(a: List[int], b: List[int], n: Optional[int] = None) -> int:
    if n is None:
        n = min(len(a), len(b))
    d = 0
    for i in range(n):
        d += 1 if (a[i] ^ b[i]) else 0
    return d


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
class HealthNumberPreprocess:
    invert: bool
    threshold: float
    scale: int

    def validate(self) -> None:
        if not isinstance(self.invert, bool):
            raise ValueError("preprocess.invert must be a boolean")
        if not isinstance(self.threshold, (int, float)) or not (0.0 <= float(self.threshold) <= 1.0):
            raise ValueError("preprocess.threshold must be in [0,1]")
        if not isinstance(self.scale, int) or self.scale < 1:
            raise ValueError("preprocess.scale must be an int >= 1")


@dataclass(frozen=True)
class HealthNumberReadout:
    min_value: int
    max_value: int
    stable_reads: int

    def validate(self) -> None:
        if not isinstance(self.min_value, int) or not isinstance(self.max_value, int):
            raise ValueError("readout.min and readout.max must be ints")
        if self.min_value > self.max_value:
            raise ValueError("readout.min must be <= readout.max")
        if not isinstance(self.stable_reads, int) or self.stable_reads < 1:
            raise ValueError("readout.stable_reads must be an int >= 1")


@dataclass(frozen=True)
class HealthNumberHitOnDecrease:
    min_drop: int
    cooldown_ms: int

    def validate(self) -> None:
        if not isinstance(self.min_drop, int) or self.min_drop < 1:
            raise ValueError("hit_on_decrease.min_drop must be an int >= 1")
        if not isinstance(self.cooldown_ms, int) or self.cooldown_ms < 0:
            raise ValueError("hit_on_decrease.cooldown_ms must be an int >= 0")


@dataclass(frozen=True)
class HealthNumberTemplates:
    template_set_id: str
    hamming_max: int
    width: int
    height: int
    digits: Dict[str, List[int]]

    def validate(self) -> None:
        if not isinstance(self.template_set_id, str) or not self.template_set_id:
            raise ValueError("templates.template_set_id must be a non-empty string")
        if not isinstance(self.hamming_max, int) or self.hamming_max < 0:
            raise ValueError("templates.hamming_max must be an int >= 0")
        if not isinstance(self.width, int) or self.width <= 0:
            raise ValueError("templates.width must be an int > 0")
        if not isinstance(self.height, int) or self.height <= 0:
            raise ValueError("templates.height must be an int > 0")
        if not isinstance(self.digits, dict) or not self.digits:
            raise ValueError("templates.digits must be a non-empty dict")
        expected = self.width * self.height
        for k, v in self.digits.items():
            if k not in [str(i) for i in range(10)]:
                raise ValueError("templates.digits keys must be '0'..'9'")
            if not isinstance(v, list) or len(v) != expected:
                raise ValueError(f"templates.digits['{k}'] must be a list of length {expected}")


@dataclass(frozen=True)
class HealthNumberDetector:
    rect: NormalizedRect
    digits: int
    preprocess: HealthNumberPreprocess
    readout: HealthNumberReadout
    hit_on_decrease: HealthNumberHitOnDecrease
    templates: Optional[HealthNumberTemplates] = None
    name: str = "health_number"

    def validate(self) -> None:
        self.rect.validate()
        if not isinstance(self.digits, int) or self.digits < 1:
            raise ValueError("health_number.digits must be an int >= 1")
        self.preprocess.validate()
        self.readout.validate()
        self.hit_on_decrease.validate()
        if self.templates is not None:
            self.templates.validate()
        if not isinstance(self.name, str) or not self.name:
            raise ValueError("health_number.name must be a non-empty string")


@dataclass(frozen=True)
class ScreenCaptureConfig:
    monitor_index: int = 1  # 1-based to match common UX in Electron
    tick_ms: int = 50


@dataclass(frozen=True)
class ScreenHealthDebugConfig:
    """
    Optional debug config to help calibrate detectors.

    Note: This is intentionally "best effort" and should never make the watcher fail.
    """

    log_values: bool = False
    log_every_n_ticks: int = 20  # periodic log (avoid spam)
    save_roi_images: bool = False
    save_dir: Optional[str] = None

    def validate(self) -> None:
        if not isinstance(self.log_values, bool):
            raise ValueError("debug.log_values must be a boolean")
        if not isinstance(self.log_every_n_ticks, int) or self.log_every_n_ticks < 1:
            raise ValueError("debug.log_every_n_ticks must be an int >= 1")
        if not isinstance(self.save_roi_images, bool):
            raise ValueError("debug.save_roi_images must be a boolean")
        if self.save_dir is not None and (not isinstance(self.save_dir, str) or not self.save_dir):
            raise ValueError("debug.save_dir must be a non-empty string when provided")


@dataclass(frozen=True)
class ScreenHealthProfile:
    schema_version: int
    name: str
    capture: ScreenCaptureConfig
    redness_rois: List[RednessROI]
    redness_detector: Optional[RednessDetectorConfig]
    health_bars: List[HealthBarDetector]
    health_numbers: List[HealthNumberDetector]
    debug: Optional[ScreenHealthDebugConfig] = None


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

        # Debug runtime (opt-in)
        self._debug_log_values = False
        self._debug_log_every_n_ticks = 20
        self._debug_save_roi_images = False
        self._debug_save_dir: Optional[Path] = None
        self._debug_emit_events = False
        self._debug_tick = 0
        self._debug_saved_once: set[str] = set()

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

        # Health number OCR state
        self._health_number_candidate_value: Dict[str, int] = {}
        self._health_number_candidate_count: Dict[str, int] = {}
        self._prev_health_value_by_detector: Dict[str, int] = {}
        self._last_health_value_emitted: Dict[str, int] = {}

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

        # Reset all runtime state so a previous run/profile doesn't affect this run.
        self._reset_runtime_state()

        # Configure optional debug mode (profile.debug + env overrides).
        self._configure_debug(self._profile.debug if self._profile else None)

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
        # Clear per-run state after stop to avoid stale values on next start().
        self._reset_runtime_state()
        return True

    def status(self) -> Dict[str, Any]:
        return {
            "running": self._running,
            "profile_name": self._profile.name if self._profile else None,
            "events_received": self.events_received,
            "last_event_ts": self.last_event_ts,
            "last_hit_ts": self.last_hit_ts,
            "debug_log_values": self._debug_log_values,
            "debug_save_roi_images": self._debug_save_roi_images,
            "debug_save_dir": str(self._debug_save_dir) if self._debug_save_dir else None,
        }

    def test_profile_once(
        self, profile: Dict[str, Any] | str, *, output_dir: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validate a profile and run a single evaluation pass (no thread, no events).

        Returns:
        - success: bool
        - result: dict (timings + evaluations + saved ROI crops)
        - error: str
        """
        try:
            parsed = self._parse_profile(profile)
        except Exception as e:
            return False, None, str(e)

        out_dir: Optional[Path] = None
        if output_dir:
            try:
                out_dir = Path(output_dir).expanduser().resolve()
                out_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                return False, None, f"failed to prepare output_dir: {e}"

        # Best-effort capture backend
        try:
            capture = _create_capture_backend(monitor_index=parsed.capture.monitor_index)
            frame_w, frame_h = capture.get_frame_size()
        except Exception as e:
            return False, None, f"capture not available: {e}"

        t0 = time.perf_counter()
        detectors_out: List[Dict[str, Any]] = []
        errors: List[str] = []

        def save_crop(kind: str, name: str, raw_bgra: bytes, w: int, h: int) -> Optional[str]:
            if out_dir is None:
                return None
            ts_ms = int(time.time() * 1000.0)
            fname = f"{ts_ms}_{self._safe_file_part(kind)}_{self._safe_file_part(name)}_{w}x{h}.bmp"
            try:
                self._write_bmp_bgra(out_dir / fname, raw_bgra, w, h)
                return str(out_dir / fname)
            except Exception as e:
                errors.append(f"save_crop {kind}:{name}: {e}")
                return None

        # Redness
        if parsed.redness_detector is not None:
            for roi in parsed.redness_rois:
                left, top, w, h = normalized_rect_to_pixels(roi.rect, frame_w, frame_h)
                cap0 = time.perf_counter()
                try:
                    raw = capture.capture_bgra(left=left, top=top, width=w, height=h)
                except Exception as e:
                    errors.append(f"capture redness:{roi.name}: {e}")
                    continue
                cap_ms = (time.perf_counter() - cap0) * 1000.0

                eval0 = time.perf_counter()
                score = float(redness_score_from_bgra(raw, w, h))
                hit = score >= float(parsed.redness_detector.min_score)
                eval_ms = (time.perf_counter() - eval0) * 1000.0

                detectors_out.append(
                    {
                        "type": "redness_rois",
                        "name": roi.name,
                        "rect_px": {"left": left, "top": top, "w": w, "h": h},
                        "score": score,
                        "threshold": float(parsed.redness_detector.min_score),
                        "hit": bool(hit),
                        "capture_ms": cap_ms,
                        "eval_ms": eval_ms,
                        "image_path": save_crop("redness", roi.name, raw, w, h),
                    }
                )

        # Health bar
        for hb in parsed.health_bars:
            left, top, w, h = normalized_rect_to_pixels(hb.rect, frame_w, frame_h)
            cap0 = time.perf_counter()
            try:
                raw = capture.capture_bgra(left=left, top=top, width=w, height=h)
            except Exception as e:
                errors.append(f"capture health_bar:{hb.name}: {e}")
                continue
            cap_ms = (time.perf_counter() - cap0) * 1000.0

            eval0 = time.perf_counter()
            percent_raw: Optional[float] = None
            mode = None
            if hb.color_sampling is not None:
                mode = "color_sampling"
                percent_raw = health_bar_percent_from_bgra(
                    raw,
                    w,
                    h,
                    filled_rgb=hb.color_sampling.filled.as_tuple(),
                    empty_rgb=hb.color_sampling.empty.as_tuple(),
                    tolerance_l1=hb.color_sampling.tolerance_l1,
                )
            elif hb.threshold_fallback is not None:
                mode = "threshold_fallback"
                percent_raw = self._health_bar_percent_threshold_fallback(raw, w, h, hb.threshold_fallback)
            percent = float(max(0.0, min(1.0, float(percent_raw or 0.0))))
            eval_ms = (time.perf_counter() - eval0) * 1000.0

            detectors_out.append(
                {
                    "type": "health_bar",
                    "name": hb.name,
                    "rect_px": {"left": left, "top": top, "w": w, "h": h},
                    "mode": mode,
                    "percent": percent,
                    "capture_ms": cap_ms,
                    "eval_ms": eval_ms,
                    "image_path": save_crop("health_bar", hb.name, raw, w, h),
                }
            )

        # Health number OCR (single read; stability is handled in the continuous loop)
        for hn in parsed.health_numbers:
            if hn.templates is None:
                detectors_out.append(
                    {
                        "type": "health_number",
                        "name": hn.name,
                        "error": "missing templates",
                    }
                )
                continue
            left, top, w, h = normalized_rect_to_pixels(hn.rect, frame_w, frame_h)
            cap0 = time.perf_counter()
            try:
                raw = capture.capture_bgra(left=left, top=top, width=w, height=h)
            except Exception as e:
                errors.append(f"capture health_number:{hn.name}: {e}")
                continue
            cap_ms = (time.perf_counter() - cap0) * 1000.0

            eval0 = time.perf_counter()
            bits, bw, bh = binarize_bgra_to_bitmap(
                raw,
                w,
                h,
                threshold=hn.preprocess.threshold,
                invert=hn.preprocess.invert,
                scale=hn.preprocess.scale,
            )
            value = self._health_number_try_read(bits, bw, bh, hn)
            eval_ms = (time.perf_counter() - eval0) * 1000.0

            detectors_out.append(
                {
                    "type": "health_number",
                    "name": hn.name,
                    "rect_px": {"left": left, "top": top, "w": w, "h": h},
                    "read": int(value) if value is not None else None,
                    "digits": int(hn.digits),
                    "hamming_max": int(hn.templates.hamming_max),
                    "capture_ms": cap_ms,
                    "eval_ms": eval_ms,
                    "image_path": save_crop("health_number", hn.name, raw, w, h),
                }
            )

        total_ms = (time.perf_counter() - t0) * 1000.0
        result = {
            "profile_name": parsed.name,
            "capture": {"monitor_index": parsed.capture.monitor_index, "tick_ms": parsed.capture.tick_ms},
            "frame": {"w": frame_w, "h": frame_h},
            "total_ms": total_ms,
            "detectors": detectors_out,
            "output_dir": str(out_dir) if out_dir else None,
            "errors": errors,
        }
        return True, result, None

    # ---------------------------------------------------------------------
    # Internal
    # ---------------------------------------------------------------------

    def _emit_game_event(self, event_type: str, params: Dict[str, Any]) -> None:
        self.events_received += 1
        self.last_event_ts = time.time()
        if self._on_game_event:
            self._on_game_event(event_type, params)

    def _reset_runtime_state(self) -> None:
        # Stats
        self.events_received = 0
        self.last_event_ts = None
        self.last_hit_ts = None

        # Cooldowns
        self._last_hit_by_roi.clear()

        # Health bar state
        self._prev_health_percent_by_detector.clear()
        self._last_health_emit_by_detector.clear()
        self._last_health_percent_emitted.clear()

        # Health number OCR state
        self._health_number_candidate_value.clear()
        self._health_number_candidate_count.clear()
        self._prev_health_value_by_detector.clear()
        self._last_health_value_emitted.clear()

        # Debug runtime
        self._debug_tick = 0
        self._debug_saved_once.clear()

    def _env_flag(self, name: str) -> bool:
        v = os.getenv(name)
        if v is None:
            return False
        return str(v).strip().lower() in ("1", "true", "yes", "on")

    def _configure_debug(self, cfg: Optional[ScreenHealthDebugConfig]) -> None:
        """
        Configure optional debug mode.

        Env vars:
        - THIRD_SPACE_SCREEN_HEALTH_DEBUG=1             => enable value logs
        - THIRD_SPACE_SCREEN_HEALTH_DEBUG_SAVE=1        => save ROI crops as .bmp
        - THIRD_SPACE_SCREEN_HEALTH_DEBUG_DIR=...       => output dir
        - THIRD_SPACE_SCREEN_HEALTH_DEBUG_EVERY_N=...   => log cadence (ticks)
        """

        self._debug_log_values = bool(cfg.log_values) if cfg else False
        self._debug_log_every_n_ticks = int(cfg.log_every_n_ticks) if cfg else 20
        self._debug_save_roi_images = bool(cfg.save_roi_images) if cfg else False
        save_dir = cfg.save_dir if cfg else None

        # Env overrides (useful in dev)
        if self._env_flag("THIRD_SPACE_SCREEN_HEALTH_DEBUG"):
            self._debug_log_values = True
        if self._env_flag("THIRD_SPACE_SCREEN_HEALTH_DEBUG_SAVE"):
            self._debug_save_roi_images = True
        every_n = os.getenv("THIRD_SPACE_SCREEN_HEALTH_DEBUG_EVERY_N")
        if every_n:
            try:
                self._debug_log_every_n_ticks = max(1, int(every_n))
            except Exception:
                pass
        env_dir = os.getenv("THIRD_SPACE_SCREEN_HEALTH_DEBUG_DIR")
        if env_dir:
            save_dir = env_dir

        self._debug_save_dir = Path(save_dir).expanduser().resolve() if save_dir else None
        if self._debug_save_roi_images and self._debug_save_dir is None:
            self._debug_save_dir = Path.cwd() / "screen_health_debug"

        if self._debug_save_roi_images and self._debug_save_dir is not None:
            try:
                self._debug_save_dir.mkdir(parents=True, exist_ok=True)
            except Exception:
                # Best-effort: disable saving if we can't create the dir.
                self._debug_save_roi_images = False
                self._debug_save_dir = None

        self._debug_emit_events = bool(self._debug_log_values or self._debug_save_roi_images)

        if self._debug_log_values:
            logger.info(
                "[screen_health] debug enabled: log_values=%s every_n=%s save_roi_images=%s dir=%s",
                self._debug_log_values,
                self._debug_log_every_n_ticks,
                self._debug_save_roi_images,
                str(self._debug_save_dir) if self._debug_save_dir else None,
            )

    def _write_bmp_bgra(self, path: Path, raw_bgra: bytes, width: int, height: int) -> None:
        """
        Write a simple uncompressed 32bpp BMP (top-down) from BGRA bytes.
        """
        if width <= 0 or height <= 0:
            raise ValueError("width/height must be > 0")
        expected = width * height * 4
        if len(raw_bgra) < expected:
            raise ValueError("raw_bgra is smaller than expected for BGRA frame")

        pixel_bytes = width * height * 4
        file_header_size = 14
        dib_header_size = 40
        off_bits = file_header_size + dib_header_size
        file_size = off_bits + pixel_bytes

        # BITMAPFILEHEADER
        bf = struct.pack("<2sIHHI", b"BM", file_size, 0, 0, off_bits)
        # BITMAPINFOHEADER (negative height => top-down)
        bi = struct.pack(
            "<IiiHHIIiiII",
            dib_header_size,
            int(width),
            int(-height),
            1,  # planes
            32,  # bpp
            0,  # BI_RGB
            pixel_bytes,
            0,
            0,
            0,
            0,
        )
        path.write_bytes(bf + bi + raw_bgra[:expected])

    def _safe_file_part(self, s: str) -> str:
        out = []
        for ch in s:
            if ch.isalnum() or ch in ("-", "_"):
                out.append(ch)
            else:
                out.append("_")
        return "".join(out).strip("_") or "unnamed"

    def _debug_maybe_save_roi(
        self,
        *,
        key: str,
        kind: str,
        name: str,
        raw_bgra: bytes,
        width: int,
        height: int,
        extra: Dict[str, Any],
        force: bool = False,
    ) -> Optional[str]:
        """
        Best-effort saving of ROI crops when debug.save_roi_images is enabled.

        Returns saved filename (basename) if saved; otherwise None.
        """
        if not self._debug_save_roi_images or self._debug_save_dir is None:
            return None

        if not force and key in self._debug_saved_once:
            return None

        ts_ms = int(time.time() * 1000.0)
        fname = f"{ts_ms}_{self._safe_file_part(kind)}_{self._safe_file_part(name)}_{width}x{height}.bmp"
        path = self._debug_save_dir / fname
        try:
            self._write_bmp_bgra(path, raw_bgra, width, height)
            self._debug_saved_once.add(key)
            logger.info("[screen_health] saved roi kind=%s name=%s file=%s extra=%s", kind, name, fname, extra)
            if self._debug_emit_events:
                self._emit_game_event(
                    "debug",
                    {
                        "kind": "roi_saved",
                        "detector": name,
                        "detector_kind": kind,
                        "saved_filename": fname,
                        "saved_dir": str(self._debug_save_dir) if self._debug_save_dir else None,
                        "extra": extra,
                    },
                )
            return fname
        except Exception as e:
            logger.warning("[screen_health] failed to save roi kind=%s name=%s err=%s", kind, name, str(e))
            return None

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
        capture = _create_capture_backend(monitor_index=profile.capture.monitor_index)

        tick_s = max(0.01, profile.capture.tick_ms / 1000.0)

        while not self._stop_evt.is_set():
            loop_start = time.time()
            self._debug_tick += 1
            should_periodic_log = self._debug_log_values and (self._debug_tick % self._debug_log_every_n_ticks == 0)

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
                    if should_periodic_log:
                        logger.info(
                            "[screen_health] redness roi=%s score=%.4f thr=%.4f",
                            roi.name,
                            float(score),
                            float(profile.redness_detector.min_score),
                        )
                        if self._debug_emit_events:
                            self._emit_game_event(
                                "debug",
                                {
                                    "kind": "redness_score",
                                    "detector": roi.name,
                                    "score": float(score),
                                    "threshold": float(profile.redness_detector.min_score),
                                },
                            )

                    # Save one example crop per ROI to ease calibration.
                    self._debug_maybe_save_roi(
                        key=f"redness_once:{roi.name}",
                        kind="redness_rois",
                        name=roi.name,
                        raw_bgra=raw_bgra,
                        width=w,
                        height=h,
                        extra={"score": float(score)},
                        force=False,
                    )
                    if score < profile.redness_detector.min_score:
                        continue

                    now = time.time()
                    key = f"redness:{roi.name}"
                    last = self._last_hit_by_roi.get(key, 0.0)
                    if (now - last) * 1000.0 < profile.redness_detector.cooldown_ms:
                        continue

                    self._last_hit_by_roi[key] = now
                    self.last_hit_ts = now

                    saved = self._debug_maybe_save_roi(
                        key=f"redness_hit:{roi.name}",
                        kind="redness_rois_hit",
                        name=roi.name,
                        raw_bgra=raw_bgra,
                        width=w,
                        height=h,
                        extra={"score": float(score)},
                        force=True,
                    )
                    if self._debug_log_values:
                        logger.info(
                            "[screen_health] HIT redness roi=%s score=%.4f cooldown_ms=%s saved=%s",
                            roi.name,
                            float(score),
                            int(profile.redness_detector.cooldown_ms),
                            saved,
                        )

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
                if should_periodic_log:
                    logger.info("[screen_health] health_bar detector=%s percent=%.4f", hb.name, float(percent))
                    if self._debug_emit_events:
                        self._emit_game_event(
                            "debug",
                            {
                                "kind": "health_bar_percent",
                                "detector": hb.name,
                                "percent": float(percent),
                            },
                        )

                # Save one example crop per detector to ease calibration.
                self._debug_maybe_save_roi(
                    key=f"health_bar_once:{hb.name}",
                    kind="health_bar",
                    name=hb.name,
                    raw_bgra=raw_bgra,
                    width=w,
                    height=h,
                    extra={"percent": float(percent)},
                    force=False,
                )

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

                saved = self._debug_maybe_save_roi(
                    key=f"health_bar_hit:{hb.name}",
                    kind="health_bar_hit",
                    name=hb.name,
                    raw_bgra=raw_bgra,
                    width=w,
                    height=h,
                    extra={"percent": float(percent), "prev_percent": float(prev), "drop": float(drop)},
                    force=True,
                )
                if self._debug_log_values:
                    logger.info(
                        "[screen_health] HIT health_bar detector=%s prev=%.4f now=%.4f drop=%.4f saved=%s",
                        hb.name,
                        float(prev),
                        float(percent),
                        float(drop),
                        saved,
                    )

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

            # Health number OCR (Phase D)
            for hn in profile.health_numbers:
                if self._stop_evt.is_set():
                    break

                if hn.templates is None:
                    continue  # Can't run OCR without templates

                left, top, w, h = normalized_rect_to_pixels(hn.rect, frame_w, frame_h)
                try:
                    raw_bgra = capture.capture_bgra(left=left, top=top, width=w, height=h)
                except Exception:
                    continue

                bits, bw, bh = binarize_bgra_to_bitmap(
                    raw_bgra,
                    w,
                    h,
                    threshold=hn.preprocess.threshold,
                    invert=hn.preprocess.invert,
                    scale=hn.preprocess.scale,
                )

                value = self._health_number_try_read(bits, bw, bh, hn)
                if should_periodic_log:
                    logger.info(
                        "[screen_health] health_number detector=%s read=%s stable_reads=%s",
                        hn.name,
                        value,
                        int(hn.readout.stable_reads),
                    )
                    if self._debug_emit_events:
                        self._emit_game_event(
                            "debug",
                            {
                                "kind": "health_number_read",
                                "detector": hn.name,
                                "read": int(value) if value is not None else None,
                                "stable_reads": int(hn.readout.stable_reads),
                            },
                        )

                # Save one example crop per detector to ease calibration.
                self._debug_maybe_save_roi(
                    key=f"health_number_once:{hn.name}",
                    kind="health_number",
                    name=hn.name,
                    raw_bgra=raw_bgra,
                    width=w,
                    height=h,
                    extra={"read": value},
                    force=False,
                )
                if value is None:
                    continue

                # Stability filtering: require stable_reads consecutive identical reads.
                cand = self._health_number_candidate_value.get(hn.name)
                if cand is None or cand != value:
                    self._health_number_candidate_value[hn.name] = value
                    self._health_number_candidate_count[hn.name] = 1
                    if should_periodic_log:
                        logger.info(
                            "[screen_health] health_number detector=%s candidate=%s count=1/%s",
                            hn.name,
                            value,
                            int(hn.readout.stable_reads),
                        )
                    continue

                self._health_number_candidate_count[hn.name] = self._health_number_candidate_count.get(hn.name, 1) + 1
                if self._health_number_candidate_count[hn.name] < hn.readout.stable_reads:
                    if should_periodic_log:
                        logger.info(
                            "[screen_health] health_number detector=%s candidate=%s count=%s/%s",
                            hn.name,
                            value,
                            int(self._health_number_candidate_count[hn.name]),
                            int(hn.readout.stable_reads),
                        )
                    continue

                # Only emit if it changed (or hasn't been emitted yet)
                last_emitted = self._last_health_value_emitted.get(hn.name)
                if last_emitted is None or last_emitted != value:
                    self._last_health_value_emitted[hn.name] = value
                    self._emit_game_event(
                        "health_value",
                        {
                            "detector": hn.name,
                            "value": value,
                        },
                    )

                # Hit on decrease (integer)
                prev_val = self._prev_health_value_by_detector.get(hn.name)
                self._prev_health_value_by_detector[hn.name] = value
                if prev_val is None:
                    continue

                drop_i = int(prev_val) - int(value)
                if drop_i < hn.hit_on_decrease.min_drop:
                    continue

                now = time.time()
                key = f"health_number:{hn.name}"
                last_hit = self._last_hit_by_roi.get(key, 0.0)
                if (now - last_hit) * 1000.0 < hn.hit_on_decrease.cooldown_ms:
                    continue

                self._last_hit_by_roi[key] = now
                self.last_hit_ts = now

                saved = self._debug_maybe_save_roi(
                    key=f"health_number_hit:{hn.name}",
                    kind="health_number_hit",
                    name=hn.name,
                    raw_bgra=raw_bgra,
                    width=w,
                    height=h,
                    extra={"value": int(value), "prev_value": int(prev_val), "drop": int(drop_i)},
                    force=True,
                )
                if self._debug_log_values:
                    logger.info(
                        "[screen_health] HIT health_number detector=%s prev=%s now=%s drop=%s saved=%s",
                        hn.name,
                        int(prev_val),
                        int(value),
                        int(drop_i),
                        saved,
                    )

                self._emit_game_event(
                    "hit_recorded",
                    {
                        "roi": hn.name,
                        "direction": None,
                        "score": max(0.0, min(1.0, float(drop_i) / 25.0)),
                        "source": "health_number",
                        "value": value,
                        "prev_value": int(prev_val),
                        "drop": drop_i,
                    },
                )
                self._trigger_hit(intensity=max(0.0, min(1.0, float(drop_i) / 25.0)))

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

        debug_cfg: Optional[ScreenHealthDebugConfig] = None
        debug_data = data.get("debug")
        if debug_data is not None:
            if not isinstance(debug_data, dict):
                raise ValueError("profile.debug must be an object")
            debug_cfg = ScreenHealthDebugConfig(
                log_values=bool(debug_data.get("log_values", False)),
                log_every_n_ticks=int(debug_data.get("log_every_n_ticks", 20)),
                save_roi_images=bool(debug_data.get("save_roi_images", False)),
                save_dir=(str(debug_data.get("save_dir")) if debug_data.get("save_dir") else None),
            )
            debug_cfg.validate()

        detectors = data.get("detectors") or []
        if not isinstance(detectors, list) or not detectors:
            raise ValueError("profile.detectors must be a non-empty list")

        redness_detector: Optional[RednessDetectorConfig] = None
        redness_rois: List[RednessROI] = []
        health_bars: List[HealthBarDetector] = []
        health_numbers: List[HealthNumberDetector] = []

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

            if d_type == "health_number":
                name_raw = d.get("name") or "health_number"
                name = str(name_raw)

                roi = d.get("roi")
                if not isinstance(roi, dict):
                    raise ValueError("health_number.roi is required")
                rect = NormalizedRect(
                    x=float(roi.get("x", 0)),
                    y=float(roi.get("y", 0)),
                    w=float(roi.get("w", 0)),
                    h=float(roi.get("h", 0)),
                )
                rect.validate()

                digits = int(d.get("digits", 0))
                if digits < 1:
                    raise ValueError("health_number.digits must be >= 1")

                preprocess_data = d.get("preprocess")
                if not isinstance(preprocess_data, dict):
                    raise ValueError("health_number.preprocess is required")
                preprocess = HealthNumberPreprocess(
                    invert=bool(preprocess_data.get("invert", False)),
                    threshold=float(preprocess_data.get("threshold", 0.6)),
                    scale=int(preprocess_data.get("scale", 1)),
                )
                preprocess.validate()

                readout_data = d.get("readout")
                if not isinstance(readout_data, dict):
                    raise ValueError("health_number.readout is required")
                readout = HealthNumberReadout(
                    min_value=int(readout_data.get("min", 0)),
                    max_value=int(readout_data.get("max", 999)),
                    stable_reads=int(readout_data.get("stable_reads", 1)),
                )
                readout.validate()

                hod_data = d.get("hit_on_decrease")
                if not isinstance(hod_data, dict):
                    raise ValueError("health_number.hit_on_decrease is required")
                hit_on_decrease = HealthNumberHitOnDecrease(
                    min_drop=int(hod_data.get("min_drop", 1)),
                    cooldown_ms=int(hod_data.get("cooldown_ms", 150)),
                )
                hit_on_decrease.validate()

                templates: Optional[HealthNumberTemplates] = None
                templates_data = d.get("templates")
                if isinstance(templates_data, dict):
                    t_id = str(templates_data.get("template_set_id") or "learned_v1")
                    hamming_max = int(templates_data.get("hamming_max", 120))
                    t_w = int(templates_data.get("width", 0))
                    t_h = int(templates_data.get("height", 0))
                    digits_map = templates_data.get("digits")
                    parsed_digits: Dict[str, List[int]] = {}
                    if isinstance(digits_map, dict) and t_w > 0 and t_h > 0:
                        expected = t_w * t_h
                        for k, v in digits_map.items():
                            kk = str(k)
                            if isinstance(v, str):
                                if len(v) != expected:
                                    continue
                                parsed_digits[kk] = [1 if ch == "1" else 0 for ch in v]
                            elif isinstance(v, list) and len(v) == expected:
                                parsed_digits[kk] = [1 if int(x) else 0 for x in v]
                    if parsed_digits:
                        templates = HealthNumberTemplates(
                            template_set_id=t_id,
                            hamming_max=hamming_max,
                            width=t_w,
                            height=t_h,
                            digits=parsed_digits,
                        )
                        templates.validate()

                hn = HealthNumberDetector(
                    name=name,
                    rect=rect,
                    digits=digits,
                    preprocess=preprocess,
                    readout=readout,
                    hit_on_decrease=hit_on_decrease,
                    templates=templates,
                )
                hn.validate()
                health_numbers.append(hn)
                continue

        if redness_detector is None and not health_bars and not health_numbers:
            raise ValueError("profile.detectors must include at least one supported detector")

        return ScreenHealthProfile(
            schema_version=schema_version,
            name=name,
            capture=capture,
            redness_rois=redness_rois,
            redness_detector=redness_detector,
            health_bars=health_bars,
            health_numbers=health_numbers,
            debug=debug_cfg,
        )

    def _health_number_try_read(self, bits: List[int], bw: int, bh: int, hn: HealthNumberDetector) -> Optional[int]:
        assert hn.templates is not None
        if hn.digits <= 0:
            return None
        if bw <= 0 or bh <= 0:
            return None

        # Split into fixed-width digit slices.
        digits_str = ""
        for i in range(hn.digits):
            x0 = int(round(i * bw / hn.digits))
            x1 = int(round((i + 1) * bw / hn.digits))
            x1 = max(x0 + 1, min(bw, x1))
            slice_w = x1 - x0

            # Extract slice bits (row-major)
            slice_bits: List[int] = [0] * (slice_w * bh)
            for y in range(bh):
                src_off = y * bw + x0
                dst_off = y * slice_w
                slice_bits[dst_off : dst_off + slice_w] = bits[src_off : src_off + slice_w]

            # Resize to template size
            norm = _resize_bitmap_nearest(slice_bits, slice_w, bh, hn.templates.width, hn.templates.height)

            best_digit: Optional[str] = None
            best_dist: Optional[int] = None
            for dch, tmpl in hn.templates.digits.items():
                dist = hamming_distance_bits(norm, tmpl, n=hn.templates.width * hn.templates.height)
                if best_dist is None or dist < best_dist:
                    best_dist = dist
                    best_digit = dch

            if best_digit is None or best_dist is None or best_dist > hn.templates.hamming_max:
                return None
            digits_str += best_digit

        if not digits_str:
            return None
        try:
            value = int(digits_str)
        except Exception:
            return None
        if value < hn.readout.min_value or value > hn.readout.max_value:
            return None
        return value

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
        # Cache monitor origin to avoid dict lookups each tick
        self._base_left = 0
        self._base_top = 0
        # Reuse a single region dict to avoid per-tick allocations
        self._region = {"left": 0, "top": 0, "width": 1, "height": 1}

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
        self._base_left = int(self._monitor["left"])
        self._base_top = int(self._monitor["top"])

    def get_frame_size(self) -> Tuple[int, int]:
        self._ensure()
        assert self._monitor is not None
        return int(self._monitor["width"]), int(self._monitor["height"])

    def capture_bgra(self, left: int, top: int, width: int, height: int) -> bytes:
        self._ensure()
        assert self._sct is not None
        assert self._monitor is not None

        # ROI is relative to monitor; convert to global coordinates.
        region = self._region
        region["left"] = self._base_left + int(left)
        region["top"] = self._base_top + int(top)
        region["width"] = int(width)
        region["height"] = int(height)
        img = self._sct.grab(region)
        return img.raw  # BGRA bytes


class _RapidShotCaptureBackend:
    """
    Optional RapidShot-based capture backend (Windows, DXGI).

    Optional-import to keep tests/dev environments working even without rapidshot installed.
    """

    def __init__(self, monitor_index: int) -> None:
        self._monitor_index = monitor_index
        self._cap = None
        self._output_w = 0
        self._output_h = 0

    def _ensure(self) -> None:
        if self._cap is not None:
            return
        try:
            import rapidshot  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError("rapidshot is required for rapidshot capture backend") from e

        # rapidshot uses 0-based output index; our UI/daemon config is 1-based.
        out_idx = int(self._monitor_index) - 1
        if out_idx < 0:
            raise ValueError(f"Invalid monitor_index={self._monitor_index}. Must be >= 1")

        # Create capture for this output. Use BGRA to match our downstream processing.
        cap = rapidshot.create(output_idx=out_idx, output_color="BGRA")
        if cap is None:  # pragma: no cover
            raise RuntimeError("rapidshot.create returned None")
        self._cap = cap

        # Determine output geometry; fall back to a one-time full grab if needed.
        res = getattr(getattr(self._cap, "output", None), "resolution", None)
        if isinstance(res, (tuple, list)) and len(res) == 2:
            self._output_w = int(res[0])
            self._output_h = int(res[1])
        else:
            frame = self._cap.grab()
            if frame is None:
                raise RuntimeError("rapidshot grab returned None (capture not available)")
            self._output_h = int(frame.shape[0])
            self._output_w = int(frame.shape[1])

    def get_frame_size(self) -> Tuple[int, int]:
        self._ensure()
        return self._output_w, self._output_h

    def capture_bgra(self, left: int, top: int, width: int, height: int) -> bytes:
        self._ensure()
        assert self._cap is not None

        l = int(left)
        t = int(top)
        r = l + int(width)
        b = t + int(height)
        frame = self._cap.grab(region=(l, t, r, b))
        if frame is None:
            raise RuntimeError("rapidshot grab returned None")
        # Ensure contiguous bytes in row-major order.
        try:
            return frame.tobytes(order="C")
        except TypeError:  # pragma: no cover (older numpy)
            return frame.tobytes()


def _create_capture_backend(*, monitor_index: int):
    """
    Create the best available capture backend.

    Prefer rapidshot on Windows (DXGI), fallback to mss (GDI).
    """
    if os.name == "nt":
        try:
            return _RapidShotCaptureBackend(monitor_index=monitor_index)
        except Exception:
            # Fall back to mss below.
            pass
    return _MSSCaptureBackend(monitor_index=monitor_index)
