"""Persist the daemon-wide ammo OCR engine choice."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict

from .screen_ocr import DEFAULT_AMMO_OCR_ENGINE, normalize_text_ocr_engine

logger = logging.getLogger(__name__)


def ocr_settings_path() -> Path:
    base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or str(Path.home())
    folder = Path(base) / "Third Space Vest"
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "ocr-settings.json"


def load_ocr_settings() -> Dict[str, Any]:
    path = ocr_settings_path()
    engine = DEFAULT_AMMO_OCR_ENGINE
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("engine"):
                engine = normalize_text_ocr_engine(str(data.get("engine")))
        except Exception as exc:
            logger.warning("Failed to read OCR settings %s: %s", path, exc)
    return {"engine": engine, "path": str(path)}


def save_ocr_settings(engine: str) -> Dict[str, Any]:
    engine = normalize_text_ocr_engine(engine)
    path = ocr_settings_path()
    payload = {"engine": engine}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {"engine": engine, "path": str(path)}
