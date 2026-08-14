"""Ammo OCR public API. Implementations live in `server.ocr`."""

from .ocr import *  # noqa: F403
from .ocr import (  # noqa: F401
    DEFAULT_AMMO_OCR_ENGINE,
    OCR_ENGINE_CATALOG,
    PROFILE_OCR_DAEMON,
    TEXT_OCR_ENGINES,
    _get_ocr_engine,
    _prepare_roi_for_ocr,
    engine_unavailable_reason,
    is_text_ocr_engine,
    list_ocr_engines,
    normalize_text_ocr_engine,
    parse_ammo_int_from_ocr_text,
    rapidocr_unavailable_reason,
    read_ammo_number,
    read_ammo_value_from_bgra,
    recognize_text_with_engine,
    tesseract_boxes_unavailable_reason,
    tesseract_unavailable_reason,
    uses_text_ocr_engine,
    windows_ocr_unavailable_reason,
)
