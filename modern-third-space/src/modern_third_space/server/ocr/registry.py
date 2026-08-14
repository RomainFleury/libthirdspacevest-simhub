"""Register digit OCR backends. Add a class in backends.py and list it there."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from .types import DigitOcrBackend

DEFAULT_AMMO_OCR_ENGINE = "windows_ocr"
PROFILE_OCR_DAEMON = "daemon"

_BACKENDS: Dict[str, DigitOcrBackend] = {}
_ORDER: List[str] = []


def register(backend: DigitOcrBackend) -> DigitOcrBackend:
    if backend.id in _BACKENDS:
        raise ValueError(f"OCR engine {backend.id!r} is already registered")
    _BACKENDS[backend.id] = backend
    _ORDER.append(backend.id)
    return backend


def all_backends() -> List[DigitOcrBackend]:
    return [_BACKENDS[i] for i in _ORDER]


def get_backend(engine_id: str) -> DigitOcrBackend:
    engine_id = normalize_text_ocr_engine(engine_id)
    return _BACKENDS[engine_id]


def text_ocr_engine_ids() -> Tuple[str, ...]:
    return tuple(_ORDER)


def is_text_ocr_engine(engine: str) -> bool:
    return str(engine or "").strip().lower() in _BACKENDS


def uses_text_ocr_engine(engine: str) -> bool:
    raw = str(engine or "").strip().lower()
    return raw == PROFILE_OCR_DAEMON or raw in _BACKENDS


def normalize_text_ocr_engine(engine: Optional[str]) -> str:
    raw = str(engine or DEFAULT_AMMO_OCR_ENGINE).strip().lower()
    if raw not in _BACKENDS:
        allowed = ", ".join(_ORDER) or "<none registered>"
        raise ValueError(f"Unknown ammo OCR engine {engine!r}. Supported: {allowed}")
    return raw


def engine_unavailable_reason(engine: str) -> Optional[str]:
    return get_backend(engine).unavailable_reason()


def list_ocr_engines(active_engine: Optional[str] = None) -> list[dict]:
    active = None
    if active_engine:
        try:
            active = normalize_text_ocr_engine(active_engine)
        except ValueError:
            active = None
    rows = []
    for spec in all_backends():
        reason = spec.unavailable_reason()
        rows.append(
            {
                **spec.as_catalog(),
                "available": reason is None,
                "unavailable_reason": reason,
                "active": spec.id == active,
            }
        )
    return rows
