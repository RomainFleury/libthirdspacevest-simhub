"""Live Windows OCR checks against HUD crops in tests/fixtures/ammo_ocr/.

Filename is the expected ammo integer. Optional suffix after _ or - for duplicates:
  12.png, 9.jpg, 07.png, 30_ut2004.png

Accuracy scoring lives in the OCR eval pipeline:

  python -m modern_third_space.cli ocr eval
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "ammo_ocr"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
_STEM_RE = re.compile(r"^(\d+)(?:[_-].*)?$")


def expected_ammo_from_stem(stem: str) -> int | None:
    match = _STEM_RE.match(stem.strip())
    if not match:
        return None
    return int(match.group(1))


def _list_image_files() -> list[Path]:
    if not FIXTURE_DIR.is_dir():
        return []
    return sorted(
        p for p in FIXTURE_DIR.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def test_expected_ammo_from_stem():
    assert expected_ammo_from_stem("12") == 12
    assert expected_ammo_from_stem("07") == 7
    assert expected_ammo_from_stem("30_ut2004") == 30
    assert expected_ammo_from_stem("12-dark") == 12
    assert expected_ammo_from_stem("ammo") is None
    assert expected_ammo_from_stem("") is None


def test_fixture_image_filenames_are_expected_ammo():
    bad = [p.name for p in _list_image_files() if expected_ammo_from_stem(p.stem) is None]
    assert not bad, (
        "Rename these so the filename starts with the expected ammo number "
        f"(e.g. 12.png or 12_game.png): {bad}"
    )
