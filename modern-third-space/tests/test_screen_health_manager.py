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

