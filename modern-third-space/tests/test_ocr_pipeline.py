from modern_third_space.server.ocr.pipeline import read_ammo_number
from modern_third_space.server.ocr.types import DigitOcrBackend, OcrRoi


class _ConstEngine(DigitOcrBackend):
    id = "test_const"
    label = "Test const"

    def read_number(self, roi: OcrRoi) -> int | None:
        return 42


class _NoneEngine(DigitOcrBackend):
    id = "test_none"
    label = "Test none"

    def read_number(self, roi: OcrRoi) -> int | None:
        return None


def test_pipeline_returns_engine_number():
    w, h = 40, 20
    raw = bytes([0, 0, 0, 255] * (w * h))
    assert read_ammo_number(raw, w, h, backend=_ConstEngine()) == 42


def test_pipeline_rejects_out_of_range_engine_number():
    w, h = 40, 20
    raw = bytes([0, 0, 0, 255] * (w * h))
    assert read_ammo_number(raw, w, h, backend=_ConstEngine(), min_value=0, max_value=10) is None


def test_pipeline_none_when_engine_unreadable():
    w, h = 40, 20
    raw = bytes([0, 0, 0, 255] * (w * h))
    assert read_ammo_number(raw, w, h, backend=_NoneEngine()) is None
