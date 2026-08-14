"""Turn messy OCR text into an integer (used inside text-based backends)."""

from __future__ import annotations

import re
from typing import Optional


def parse_ammo_int_from_ocr_text(
    text: str,
    *,
    min_value: int = 0,
    max_value: int = 999,
    max_digits: int = 3,
) -> Optional[int]:
    """
    Extract an ammo integer from OCR text.

    Accepts a variable-width counter (1..max_digits) so values like 12 → 9 keep
    working. Prefers the first digit group in that range (e.g. magazine before
    reserve in "12/30").
    """
    raw = (text or "").strip()
    if not raw:
        return None

    max_digits = max(1, int(max_digits))
    groups = re.findall(r"\d+", raw)
    if not groups:
        compact = re.sub(r"\s+", "", raw)
        if re.fullmatch(r"[OolI|BSZ0-9]{1,8}", compact, re.IGNORECASE):
            cleaned = (
                compact.replace("O", "0")
                .replace("o", "0")
                .replace("l", "1")
                .replace("I", "1")
                .replace("|", "1")
                .replace("B", "8")
                .replace("S", "5")
                .replace("Z", "2")
            )
            groups = re.findall(r"\d+", cleaned)
        if not groups:
            return None

    candidate: Optional[str] = None
    for g in groups:
        if 1 <= len(g) <= max_digits:
            candidate = g
            break
    if candidate is None:
        g0 = groups[0]
        if len(g0) > max_digits:
            candidate = g0[-max_digits:]

    if candidate is None:
        return None
    try:
        value = int(candidate)
    except ValueError:
        return None
    if value < int(min_value) or value > int(max_value):
        return None
    return value


def number_from_ocr_text(text: str) -> Optional[int]:
    """Parse a number from engine text with no HUD range clamp (pipeline applies that)."""
    return parse_ammo_int_from_ocr_text(text, min_value=0, max_value=99_999_999, max_digits=8)
