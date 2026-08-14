from modern_third_space.server.screen_ocr import (
    parse_ammo_int_from_ocr_text,
    _prepare_roi_for_ocr,
    is_text_ocr_engine,
    uses_text_ocr_engine,
    normalize_text_ocr_engine,
    list_ocr_engines,
    TEXT_OCR_ENGINES,
    PROFILE_OCR_DAEMON,
    DEFAULT_AMMO_OCR_ENGINE,
)
import pytest


def test_parse_ammo_variable_width():
    assert parse_ammo_int_from_ocr_text("12") == 12
    assert parse_ammo_int_from_ocr_text("9") == 9
    assert parse_ammo_int_from_ocr_text("100") == 100
    assert parse_ammo_int_from_ocr_text("Ammo 07") == 7
    assert parse_ammo_int_from_ocr_text("O8") == 8
    assert parse_ammo_int_from_ocr_text("12/30") == 12


def test_parse_ammo_rejects_too_many_digits_unless_truncatable():
    # 4+ digit group: take rightmost 3
    assert parse_ammo_int_from_ocr_text("1234") == 234


def test_parse_ammo_rejects_out_of_range():
    assert parse_ammo_int_from_ocr_text("150", min_value=0, max_value=99) is None


def test_parse_ammo_empty():
    assert parse_ammo_int_from_ocr_text("") is None
    assert parse_ammo_int_from_ocr_text("no digits") is None


def test_prepare_roi_upscales_small_hud():
    w, h = 40, 20
    raw = bytes([0, 0, 0, 255] * (w * h))
    out, ow, oh = _prepare_roi_for_ocr(raw, w, h)
    assert ow >= 160
    assert oh >= 96
    assert len(out) == ow * oh * 4


def test_parse_profile_ammo_windows_ocr_no_templates():
    from modern_third_space.server.screen_health_manager import ScreenHealthManager

    manager = ScreenHealthManager()
    profile = {
        "schema_version": 0,
        "name": "ocr_recoil",
        "capture": {"monitor_index": 1, "tick_ms": 50},
        "detectors": [
            {
                "type": "redness_rois",
                "cooldown_ms": 200,
                "threshold": {"min_score": 0.35},
                "rois": [{"name": "r1", "rect": {"x": 0, "y": 0, "w": 0.1, "h": 0.1}}],
            }
        ],
        "recoil": {
            "type": "ammo_number",
            "engine": "windows_ocr",
            "duration_ms": 40,
            "roi": {"x": 0.8, "y": 0.9, "w": 0.08, "h": 0.04},
            "digits": 2,  # ignored / overridden for windows_ocr
            "readout": {"min": 0, "max": 99, "stable_reads": 2},
            "hit_on_decrease": {"min_drop": 1, "cooldown_ms": 50},
        },
    }
    parsed = manager._parse_profile(profile)
    assert len(parsed.ammo_numbers) == 1
    assert parsed.ammo_numbers[0].engine == "windows_ocr"
    assert parsed.ammo_numbers[0].templates is None
    assert parsed.ammo_numbers[0].digits == 3
    assert parsed.ammo_numbers[0].readout.max_value == 999


def test_text_ocr_engine_ids():
    assert is_text_ocr_engine("windows_ocr")
    assert is_text_ocr_engine("rapidocr")
    assert is_text_ocr_engine("tesseract")
    assert is_text_ocr_engine("tesseract_boxes")
    assert is_text_ocr_engine("opencv_knn")
    assert is_text_ocr_engine("opencv_cells")
    assert not is_text_ocr_engine("templates")
    assert not is_text_ocr_engine(PROFILE_OCR_DAEMON)
    assert uses_text_ocr_engine(PROFILE_OCR_DAEMON)
    assert uses_text_ocr_engine("tesseract")
    assert not uses_text_ocr_engine("templates")
    assert normalize_text_ocr_engine(None) == DEFAULT_AMMO_OCR_ENGINE
    assert normalize_text_ocr_engine("tesseract") == "tesseract"
    with pytest.raises(ValueError, match="Unknown ammo OCR engine"):
        normalize_text_ocr_engine("not_a_real_engine")
    ids = [row["id"] for row in list_ocr_engines("windows_ocr")]
    assert ids == list(TEXT_OCR_ENGINES)
    assert any(row["offered_in_ui"] for row in list_ocr_engines() if row["id"] == "windows_ocr")
    assert any(row["offered_in_ui"] for row in list_ocr_engines() if row["id"] == "opencv_knn")
    assert not any(row["offered_in_ui"] for row in list_ocr_engines() if row["id"] == "rapidocr")


def test_parse_profile_ammo_daemon_follows_settings():
    from modern_third_space.server.screen_health_manager import ScreenHealthManager

    manager = ScreenHealthManager()
    profile = {
        "schema_version": 0,
        "name": "ocr_recoil_daemon",
        "capture": {"monitor_index": 1, "tick_ms": 50},
        "detectors": [
            {
                "type": "redness_rois",
                "cooldown_ms": 200,
                "threshold": {"min_score": 0.35},
                "rois": [{"name": "r1", "rect": {"x": 0, "y": 0, "w": 0.1, "h": 0.1}}],
            }
        ],
        "recoil": {
            "type": "ammo_number",
            "engine": "daemon",
            "duration_ms": 40,
            "roi": {"x": 0.8, "y": 0.9, "w": 0.08, "h": 0.04},
            "readout": {"min": 0, "max": 999, "stable_reads": 2},
            "hit_on_decrease": {"min_drop": 1, "cooldown_ms": 50},
        },
    }
    parsed = manager._parse_profile(profile)
    assert parsed.ammo_numbers[0].engine == PROFILE_OCR_DAEMON
    assert parsed.ammo_numbers[0].templates is None
    assert parsed.ammo_numbers[0].digits == 3


def test_parse_profile_ammo_rapidocr():
    from modern_third_space.server.screen_health_manager import ScreenHealthManager

    manager = ScreenHealthManager()
    profile = {
        "schema_version": 0,
        "name": "ocr_recoil_rapid",
        "capture": {"monitor_index": 1, "tick_ms": 50},
        "detectors": [
            {
                "type": "redness_rois",
                "cooldown_ms": 200,
                "threshold": {"min_score": 0.35},
                "rois": [{"name": "r1", "rect": {"x": 0, "y": 0, "w": 0.1, "h": 0.1}}],
            }
        ],
        "recoil": {
            "type": "ammo_number",
            "engine": "rapidocr",
            "duration_ms": 40,
            "roi": {"x": 0.8, "y": 0.9, "w": 0.08, "h": 0.04},
            "readout": {"min": 0, "max": 999, "stable_reads": 2},
            "hit_on_decrease": {"min_drop": 1, "cooldown_ms": 50},
        },
    }
    parsed = manager._parse_profile(profile)
    assert parsed.ammo_numbers[0].engine == "rapidocr"
    assert parsed.ammo_numbers[0].templates is None


def test_parse_profile_ammo_rejects_unknown_engine():
    from modern_third_space.server.screen_health_manager import ScreenHealthManager

    manager = ScreenHealthManager()
    profile = {
        "schema_version": 0,
        "name": "bad_engine",
        "capture": {"monitor_index": 1, "tick_ms": 50},
        "detectors": [
            {
                "type": "redness_rois",
                "cooldown_ms": 200,
                "threshold": {"min_score": 0.35},
                "rois": [{"name": "r1", "rect": {"x": 0, "y": 0, "w": 0.1, "h": 0.1}}],
            }
        ],
        "recoil": {
            "type": "ammo_number",
            "engine": "not_a_real_engine",
            "duration_ms": 40,
            "roi": {"x": 0.8, "y": 0.9, "w": 0.08, "h": 0.04},
            "readout": {"min": 0, "max": 999, "stable_reads": 2},
            "hit_on_decrease": {"min_drop": 1, "cooldown_ms": 50},
        },
    }
    with pytest.raises(ValueError, match="engine"):
        manager._parse_profile(profile)
