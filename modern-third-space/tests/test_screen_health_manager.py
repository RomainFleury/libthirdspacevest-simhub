import time

import pytest

from modern_third_space.server import screen_health_manager as shm


def test_normalized_rect_to_pixels_basic():
    rect = shm.NormalizedRect(x=0.5, y=0.5, w=0.2, h=0.2)
    left, top, w, h = shm.normalized_rect_to_pixels(rect, frame_w=100, frame_h=100)
    assert (left, top, w, h) == (50, 50, 20, 20)


def test_normalized_rect_to_pixels_clamps_to_frame():
    # This would exceed the frame to the right/bottom; ensure we clamp.
    rect = shm.NormalizedRect(x=0.9, y=0.9, w=0.5, h=0.5)
    left, top, w, h = shm.normalized_rect_to_pixels(rect, frame_w=100, frame_h=100)
    assert left == 90
    assert top == 90
    assert w == 10
    assert h == 10


def test_redness_score_from_bgra_expected_value():
    # 2x1 pixels: [pure red, gray]
    # pure red dominance: (255 - max(0,0))/255 = 1
    # gray dominance: (128 - max(128,128))/255 = 0
    # mean = 0.5
    raw = bytes(
        [
            0,
            0,
            255,
            255,  # BGRA red
            128,
            128,
            128,
            255,  # BGRA gray
        ]
    )
    score = shm.redness_score_from_bgra(raw, width=2, height=1)
    assert score == pytest.approx(0.5, abs=1e-6)


def test_health_bar_percent_from_bgra_half_filled():
    # 10x2 ROI: left half filled (red), right half empty (dark)
    w, h = 10, 2
    filled = (220, 40, 40)
    empty = (40, 40, 40)

    def px(rgb):
        r, g, b = rgb
        return [b, g, r, 255]  # BGRA

    raw = bytearray()
    for _y in range(h):
        for x in range(w):
            raw.extend(px(filled if x < 5 else empty))

    percent = shm.health_bar_percent_from_bgra(
        bytes(raw),
        w,
        h,
        filled_rgb=filled,
        empty_rgb=empty,
        tolerance_l1=0,
        column_threshold=0.5,
    )
    assert percent == pytest.approx(0.5, abs=1e-6)


def test_manager_cooldown_prevents_hit_spam(monkeypatch):
    class FakeCapture:
        def __init__(self, monitor_index: int):
            self.monitor_index = monitor_index

        def get_frame_size(self):
            return 10, 10

        def capture_bgra(self, left: int, top: int, width: int, height: int) -> bytes:
            # Always return pure red ROI (score=1)
            return bytes([0, 0, 255, 255] * (width * height))

    # Replace the mss backend with our fake.
    monkeypatch.setattr(shm, "_MSSCaptureBackend", FakeCapture)

    events = []

    def on_game_event(event_type: str, params: dict):
        events.append((event_type, params))

    manager = shm.ScreenHealthManager(on_game_event=on_game_event, on_trigger=lambda c, s: None)

    profile = {
        "schema_version": 0,
        "name": "test",
        "capture": {"source": "monitor", "monitor_index": 1, "tick_ms": 10},
        "detectors": [
            {
                "type": "redness_rois",
                "cooldown_ms": 200,
                "threshold": {"min_score": 0.2},
                "rois": [{"name": "roi1", "rect": {"x": 0.0, "y": 0.0, "w": 0.5, "h": 0.5}}],
            }
        ],
    }

    ok, err = manager.start(profile)
    assert ok, err
    try:
        time.sleep(0.06)  # ~6 ticks
    finally:
        manager.stop()

    hit_events = [e for e in events if e[0] == "hit_recorded"]
    assert len(hit_events) == 1, "Cooldown should prevent multiple hits within 200ms"


def test_profile_allows_meta_and_rejects_invalid_direction(monkeypatch):
    class FakeCapture:
        def __init__(self, monitor_index: int):
            self.monitor_index = monitor_index

        def get_frame_size(self):
            return 10, 10

        def capture_bgra(self, left: int, top: int, width: int, height: int) -> bytes:
            return bytes([0, 0, 0, 255] * (width * height))

    monkeypatch.setattr(shm, "_MSSCaptureBackend", FakeCapture)

    manager = shm.ScreenHealthManager(on_game_event=lambda *_: None, on_trigger=lambda *_: None)

    ok, err = manager.start(
        {
            "schema_version": 0,
            "name": "meta ok",
            "meta": {"preset_id": "x", "game_name": "y"},
            "capture": {"source": "monitor", "monitor_index": 1, "tick_ms": 50},
            "detectors": [
                {
                    "type": "redness_rois",
                    "cooldown_ms": 0,
                    "threshold": {"min_score": 1.0},
                    "rois": [{"name": "r1", "rect": {"x": 0, "y": 0, "w": 0.5, "h": 0.5}}],
                }
            ],
        }
    )
    assert ok, err
    manager.stop()

    ok, err = manager.start(
        {
            "schema_version": 0,
            "name": "bad direction",
            "capture": {"source": "monitor", "monitor_index": 1, "tick_ms": 50},
            "detectors": [
                {
                    "type": "redness_rois",
                    "cooldown_ms": 0,
                    "threshold": {"min_score": 1.0},
                    "rois": [
                        {
                            "name": "r1",
                            "direction": "diagonal_up_left",
                            "rect": {"x": 0, "y": 0, "w": 0.5, "h": 0.5},
                        }
                    ],
                }
            ],
        }
    )
    assert ok is False
    assert err


def test_manager_health_bar_hit_on_decrease(monkeypatch):
    class FakeCapture:
        def __init__(self, monitor_index: int):
            self.monitor_index = monitor_index
            self._calls = 0

        def get_frame_size(self):
            return 10, 10

        def capture_bgra(self, left: int, top: int, width: int, height: int) -> bytes:
            # First few ticks: fully filled; then drop to 70% filled.
            self._calls += 1
            filled_cols = width if self._calls <= 3 else int(width * 0.7)

            filled = (220, 40, 40)
            empty = (40, 40, 40)

            def px(rgb):
                r, g, b = rgb
                return [b, g, r, 255]

            raw = bytearray()
            for _y in range(height):
                for x in range(width):
                    raw.extend(px(filled if x < filled_cols else empty))
            return bytes(raw)

    monkeypatch.setattr(shm, "_MSSCaptureBackend", FakeCapture)

    events = []

    def on_game_event(event_type: str, params: dict):
        events.append((event_type, params))

    manager = shm.ScreenHealthManager(on_game_event=on_game_event, on_trigger=lambda *_: None)
    profile = {
        "schema_version": 0,
        "name": "hb test",
        "capture": {"source": "monitor", "monitor_index": 1, "tick_ms": 10},
        "detectors": [
            {
                "type": "health_bar",
                "name": "hb1",
                "roi": {"x": 0.0, "y": 0.0, "w": 0.5, "h": 0.5},
                "orientation": "horizontal",
                "color_sampling": {
                    "filled_rgb": [220, 40, 40],
                    "empty_rgb": [40, 40, 40],
                    "tolerance_l1": 0,
                },
                "hit_on_decrease": {"min_drop": 0.1, "cooldown_ms": 0},
            }
        ],
    }

    ok, err = manager.start(profile)
    assert ok, err
    try:
        time.sleep(0.07)  # ~7 ticks
    finally:
        manager.stop()

    hit_events = [e for e in events if e[0] == "hit_recorded" and e[1].get("source") == "health_bar"]
    assert len(hit_events) >= 1


def test_binarize_bgra_to_bitmap_basic():
    # 2x1 pixels: [black, white] with threshold 0.5 => [0,1]
    raw = bytes(
        [
            0,
            0,
            0,
            255,  # black
            255,
            255,
            255,
            255,  # white
        ]
    )
    bits, w, h = shm.binarize_bgra_to_bitmap(raw, 2, 1, threshold=0.5, invert=False, scale=1)
    assert (w, h) == (2, 1)
    assert bits[:2] == [0, 1]


def test_binarize_bgra_to_bitmap_invert():
    # 2x1 pixels: [black, white] with threshold 0.5, invert=True => [1,0]
    raw = bytes(
        [
            0,
            0,
            0,
            255,  # black
            255,
            255,
            255,
            255,  # white
        ]
    )
    bits, w, h = shm.binarize_bgra_to_bitmap(raw, 2, 1, threshold=0.5, invert=True, scale=1)
    assert (w, h) == (2, 1)
    assert bits[:2] == [1, 0]


def test_binarize_bgra_to_bitmap_scale_replicates_pixels():
    # 1x1 pixel: white, scale=2 => 2x2 all ones (threshold 0.5)
    raw = bytes([255, 255, 255, 255])
    bits, w, h = shm.binarize_bgra_to_bitmap(raw, 1, 1, threshold=0.5, invert=False, scale=2)
    assert (w, h) == (2, 2)
    assert bits == [1, 1, 1, 1]


def _tmpl_digit_0(w: int, h: int) -> list[int]:
    # Border rectangle
    out: list[int] = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            if x == 0 or x == (w - 1) or y == 0 or y == (h - 1):
                out[y * w + x] = 1
    return out


def _tmpl_digit_1(w: int, h: int) -> list[int]:
    # Center vertical line
    out: list[int] = [0] * (w * h)
    cx = w // 2
    for y in range(h):
        out[y * w + cx] = 1
    return out


def _tmpl_digit_5(w: int, h: int) -> list[int]:
    # Simple "5": top, middle, bottom bars + left-top + right-bottom stems
    out: list[int] = [0] * (w * h)
    for x in range(w):
        out[0 * w + x] = 1
        out[(h // 2) * w + x] = 1
        out[(h - 1) * w + x] = 1
    for y in range(1, h // 2):
        out[y * w + 0] = 1
    for y in range((h // 2) + 1, h - 1):
        out[y * w + (w - 1)] = 1
    return out


def _render_digits_bits(digits: str, templates: dict[str, list[int]], w: int, h: int) -> list[int]:
    # Compose digit slices horizontally, row by row (row-major for the whole ROI)
    out: list[int] = []
    for y in range(h):
        for ch in digits:
            t = templates[ch]
            out.extend(t[y * w : (y + 1) * w])
    return out


def _make_hn_detector(*, digits: int, templates: dict[str, list[int]], w: int, h: int, hamming_max: int, min_v: int = 0, max_v: int = 999) -> shm.HealthNumberDetector:
    return shm.HealthNumberDetector(
        rect=shm.NormalizedRect(x=0.0, y=0.0, w=1.0, h=1.0),
        digits=digits,
        preprocess=shm.HealthNumberPreprocess(invert=False, threshold=0.5, scale=1),
        readout=shm.HealthNumberReadout(min_value=min_v, max_value=max_v, stable_reads=1),
        hit_on_decrease=shm.HealthNumberHitOnDecrease(min_drop=1, cooldown_ms=0),
        templates=shm.HealthNumberTemplates(
            template_set_id="unit_test",
            hamming_max=hamming_max,
            width=w,
            height=h,
            digits=templates,
        ),
        name="hn_test",
    )


def test_health_number_try_read_single_digit_exact_match():
    w, h = 5, 7
    templates = {"0": _tmpl_digit_0(w, h), "1": _tmpl_digit_1(w, h)}
    hn = _make_hn_detector(digits=1, templates=templates, w=w, h=h, hamming_max=0)

    bits = templates["1"]
    manager = shm.ScreenHealthManager(on_game_event=lambda *_: None, on_trigger=lambda *_: None)
    assert manager._health_number_try_read(bits, bw=w, bh=h, hn=hn) == 1


def test_health_number_try_read_multi_digit_exact_match():
    w, h = 5, 7
    templates = {"0": _tmpl_digit_0(w, h), "1": _tmpl_digit_1(w, h), "5": _tmpl_digit_5(w, h)}
    hn = _make_hn_detector(digits=3, templates=templates, w=w, h=h, hamming_max=0)

    bits = _render_digits_bits("105", templates, w, h)
    manager = shm.ScreenHealthManager(on_game_event=lambda *_: None, on_trigger=lambda *_: None)
    assert manager._health_number_try_read(bits, bw=3 * w, bh=h, hn=hn) == 105


def test_health_number_try_read_allows_small_noise_with_hamming_max():
    w, h = 5, 7
    templates = {"1": _tmpl_digit_1(w, h)}
    # Allow exactly 1 bit difference
    hn = _make_hn_detector(digits=1, templates=templates, w=w, h=h, hamming_max=1)

    noisy = list(templates["1"])
    noisy[0] = 0 if noisy[0] else 1  # flip one bit
    manager = shm.ScreenHealthManager(on_game_event=lambda *_: None, on_trigger=lambda *_: None)
    assert manager._health_number_try_read(noisy, bw=w, bh=h, hn=hn) == 1


def test_health_number_try_read_rejects_when_hamming_exceeds_max():
    w, h = 5, 7
    templates = {"1": _tmpl_digit_1(w, h)}
    hn = _make_hn_detector(digits=1, templates=templates, w=w, h=h, hamming_max=0)

    noisy = list(templates["1"])
    noisy[0] = 0 if noisy[0] else 1  # flip one bit => distance 1 > 0
    manager = shm.ScreenHealthManager(on_game_event=lambda *_: None, on_trigger=lambda *_: None)
    assert manager._health_number_try_read(noisy, bw=w, bh=h, hn=hn) is None


def test_health_number_try_read_rejects_value_outside_range():
    w, h = 5, 7
    templates = {"5": _tmpl_digit_5(w, h)}
    hn = _make_hn_detector(digits=3, templates=templates, w=w, h=h, hamming_max=0, min_v=0, max_v=200)

    bits = _render_digits_bits("555", templates, w, h)
    manager = shm.ScreenHealthManager(on_game_event=lambda *_: None, on_trigger=lambda *_: None)
    assert manager._health_number_try_read(bits, bw=3 * w, bh=h, hn=hn) is None


