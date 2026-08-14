"""Ammo digit OCR: shared pipeline + pluggable backends that return a number."""

from __future__ import annotations

from .backends import (
    get_windows_ocr_engine,
    rapidocr_unavailable_reason,
    register_builtin_engines,
    tesseract_boxes_unavailable_reason,
    tesseract_unavailable_reason,
    windows_ocr_unavailable_reason,
)
from .parse import parse_ammo_int_from_ocr_text
from .pipeline import read_ammo_number, read_ammo_value_from_bgra, recognize_text_with_engine
from .preprocess import prepare_roi
from .registry import (
    DEFAULT_AMMO_OCR_ENGINE,
    PROFILE_OCR_DAEMON,
    all_backends,
    engine_unavailable_reason,
    is_text_ocr_engine,
    list_ocr_engines,
    normalize_text_ocr_engine,
    register,
    text_ocr_engine_ids,
    uses_text_ocr_engine,
)
from .types import DigitOcrBackend, OcrRoi

register_builtin_engines()

TEXT_OCR_ENGINES = text_ocr_engine_ids()
OCR_ENGINE_CATALOG = tuple(b.as_catalog() for b in all_backends())

def _prepare_roi_for_ocr(raw_bgra: bytes, width: int, height: int):
    roi = prepare_roi(raw_bgra, width, height)
    return roi.bgra, roi.width, roi.height


_get_ocr_engine = get_windows_ocr_engine

__all__ = [
    "DEFAULT_AMMO_OCR_ENGINE",
    "DigitOcrBackend",
    "OCR_ENGINE_CATALOG",
    "OcrRoi",
    "PROFILE_OCR_DAEMON",
    "TEXT_OCR_ENGINES",
    "_get_ocr_engine",
    "_prepare_roi_for_ocr",
    "all_backends",
    "engine_unavailable_reason",
    "is_text_ocr_engine",
    "list_ocr_engines",
    "normalize_text_ocr_engine",
    "parse_ammo_int_from_ocr_text",
    "rapidocr_unavailable_reason",
    "read_ammo_number",
    "read_ammo_value_from_bgra",
    "recognize_text_with_engine",
    "register",
    "tesseract_boxes_unavailable_reason",
    "tesseract_unavailable_reason",
    "uses_text_ocr_engine",
    "windows_ocr_unavailable_reason",
]
