"""Shared ammo OCR pipeline: prepare ROI → invert variants → chosen engine → number."""

from __future__ import annotations

from typing import Optional, Tuple

from .preprocess import prepare_roi
from .registry import get_backend, normalize_text_ocr_engine, DEFAULT_AMMO_OCR_ENGINE
from .types import DigitOcrBackend, OcrRoi


def read_ammo_number(
    raw_bgra: bytes,
    width: int,
    height: int,
    *,
    engine: str = DEFAULT_AMMO_OCR_ENGINE,
    min_value: int = 0,
    max_value: int = 999,
    backend: Optional[DigitOcrBackend] = None,
) -> Optional[int]:
    """
    Run the shared pipeline and return only the integer (or None).

    The same preprocess is used for every backend. Only `read_number` differs.
    """
    impl = backend or get_backend(normalize_text_ocr_engine(engine))
    reason = impl.unavailable_reason()
    if reason:
        raise RuntimeError(reason)

    roi = prepare_roi(raw_bgra, width, height)
    for variant in (roi, roi.inverted()):
        value = impl.read_number(variant)
        if value is None:
            continue
        if int(min_value) <= int(value) <= int(max_value):
            return int(value)
    return None


def read_ammo_value_from_bgra(
    raw_bgra: bytes,
    width: int,
    height: int,
    *,
    min_value: int = 0,
    max_value: int = 999,
    engine: str = DEFAULT_AMMO_OCR_ENGINE,
    backend: Optional[DigitOcrBackend] = None,
) -> Tuple[Optional[int], str]:
    """Compatibility wrapper: (number, decimal string of that number)."""
    value = read_ammo_number(
        raw_bgra,
        width,
        height,
        engine=engine,
        min_value=min_value,
        max_value=max_value,
        backend=backend,
    )
    return value, "" if value is None else str(value)


def recognize_text_with_engine(raw_bgra: bytes, width: int, height: int, engine: str) -> str:
    """Run one polarity of the chosen engine; return the number as text (or empty)."""
    impl = get_backend(engine)
    reason = impl.unavailable_reason()
    if reason:
        raise RuntimeError(reason)
    value = impl.read_number(OcrRoi(bgra=raw_bgra, width=int(width), height=int(height)))
    return "" if value is None else str(value)
