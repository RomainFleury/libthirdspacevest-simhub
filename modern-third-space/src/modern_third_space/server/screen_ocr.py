"""
Windows OCR helpers for Screen Health ammo recoil (no digit teaching).

Uses Windows.Media.Ocr via pywinrt. Windows-only; callers should treat
ImportError / RuntimeError as "OCR unavailable".
"""

from __future__ import annotations

import asyncio
import base64
import logging
import re
import threading
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

_ENGINE_LOCK = threading.Lock()
_ENGINE = None
_ENGINE_FAILED: Optional[str] = None

# Windows.Media.Ocr often returns empty on tiny HUD crops; upscale to ~this height.
_MIN_OCR_HEIGHT = 96
_MIN_OCR_WIDTH = 160
_MAX_SCALE = 8


def parse_ammo_int_from_ocr_text(
    text: str,
    *,
    min_value: int = 0,
    max_value: int = 999,
    max_digits: int = 3,
) -> Optional[int]:
    """
    Extract an ammo integer from OCR text.

    Accepts a variable-width counter (1..max_digits, default 1–3) so values like
    12 → 9 keep working without a fixed digit-width setting. Prefers the first
    digit group in that range (e.g. magazine count before reserve in "12/30").
    """
    raw = (text or "").strip()
    if not raw:
        return None

    max_digits = max(1, int(max_digits))
    groups = re.findall(r"\d+", raw)
    if not groups:
        # Only apply letter→digit fixes to short digit-like tokens (e.g. "O8"), not prose
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
        # OCR sometimes glues extra digits; take the rightmost max_digits of the first group
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


def _get_ocr_engine():
    global _ENGINE, _ENGINE_FAILED
    with _ENGINE_LOCK:
        if _ENGINE is not None:
            return _ENGINE
        # Allow one retry after "not installed" if the user pip-installed mid-session
        # (otherwise a sticky failure would require a daemon restart).
        try:
            from winrt.windows.media.ocr import OcrEngine  # type: ignore
        except Exception as e:
            _ENGINE_FAILED = (
                "Windows OCR packages not installed on this Python. "
                "Install into the daemon interpreter, e.g.\n"
                '  py -3.14 -m pip install "winrt-runtime~=3.2" '
                '"winrt-Windows.Foundation~=3.2" '
                '"winrt-Windows.Foundation.Collections~=3.2" '
                '"winrt-Windows.Globalization~=3.2" '
                '"winrt-Windows.Graphics.Imaging~=3.2" '
                '"winrt-Windows.Media.Ocr~=3.2" '
                '"winrt-Windows.Security.Cryptography~=3.2" '
                '"winrt-Windows.Storage.Streams~=3.2"\n'
                f"Import error: {e}"
            )
            raise RuntimeError(_ENGINE_FAILED) from e

        eng = OcrEngine.try_create_from_user_profile_languages()
        if eng is None:
            try:
                from winrt.windows.globalization import Language  # type: ignore

                for tag in ("en-US", "en"):
                    lang = Language(tag)
                    if OcrEngine.is_language_supported(lang):
                        eng = OcrEngine.try_create_from_language(lang)
                        if eng is not None:
                            break
            except Exception:
                eng = None
        if eng is None:
            _ENGINE_FAILED = (
                "Windows OCR engine unavailable. Install an OCR language pack "
                "in Windows Settings → Time & Language → Language."
            )
            raise RuntimeError(_ENGINE_FAILED)

        _ENGINE = eng
        _ENGINE_FAILED = None
        return _ENGINE


def _prepare_roi_for_ocr(raw_bgra: bytes, width: int, height: int) -> Tuple[bytes, int, int]:
    """
    Upscale tiny HUD ROIs and force opaque alpha so Windows OCR can read digits.

    Small crops (e.g. 80x28) frequently return empty text; nearest-neighbor upscale
    to ~96px height fixes that for clear HUD numerals.
    """
    w, h = int(width), int(height)
    expected = w * h * 4
    if w <= 0 or h <= 0:
        raise ValueError("width and height must be > 0")
    if len(raw_bgra) < expected:
        raise ValueError(f"BGRA buffer too small: {len(raw_bgra)} < {expected}")

    try:
        import numpy as np
    except Exception as e:  # pragma: no cover
        raise RuntimeError("numpy required for Windows OCR ROI prep (bundled with bettercam)") from e

    img = np.frombuffer(raw_bgra[:expected], dtype=np.uint8).reshape((h, w, 4)).copy()
    img[:, :, 3] = 255

    scale_h = max(1, int((_MIN_OCR_HEIGHT + h - 1) // h)) if h < _MIN_OCR_HEIGHT else 1
    scale_w = max(1, int((_MIN_OCR_WIDTH + w - 1) // w)) if w < _MIN_OCR_WIDTH else 1
    scale = min(_MAX_SCALE, max(scale_h, scale_w))
    if scale > 1:
        img = np.repeat(np.repeat(img, scale, axis=0), scale, axis=1)

    # Light pad so glyphs aren't clipped at the OCR edge
    pad = max(4, scale * 2)
    out_h, out_w = int(img.shape[0]) + pad * 2, int(img.shape[1]) + pad * 2
    padded = np.zeros((out_h, out_w, 4), dtype=np.uint8)
    padded[:, :, 3] = 255
    # Match border to median luminance (keeps dark or light HUD backgrounds)
    border = np.median(img[:, :, :3].reshape(-1, 3), axis=0).astype(np.uint8)
    padded[:, :, 0] = border[0]
    padded[:, :, 1] = border[1]
    padded[:, :, 2] = border[2]
    padded[pad : pad + img.shape[0], pad : pad + img.shape[1]] = img

    return padded.tobytes(), out_w, out_h


def _invert_bgra(raw_bgra: bytes, width: int, height: int) -> bytes:
    try:
        import numpy as np
    except Exception as e:  # pragma: no cover
        raise RuntimeError("numpy required for Windows OCR ROI prep") from e
    expected = int(width) * int(height) * 4
    img = np.frombuffer(raw_bgra[:expected], dtype=np.uint8).reshape((int(height), int(width), 4)).copy()
    img[:, :, :3] = 255 - img[:, :, :3]
    img[:, :, 3] = 255
    return img.tobytes()


def _bgra_to_software_bitmap(raw_bgra: bytes, width: int, height: int):
    """Build a WinRT SoftwareBitmap (BGRA8) from tight row-major BGRA bytes."""
    from winrt.windows.graphics.imaging import (  # type: ignore
        BitmapPixelFormat,
        SoftwareBitmap,
    )
    from winrt.windows.security.cryptography import CryptographicBuffer  # type: ignore

    w, h = int(width), int(height)
    expected = w * h * 4
    if w <= 0 or h <= 0:
        raise ValueError("width and height must be > 0")
    if len(raw_bgra) < expected:
        raise ValueError(f"BGRA buffer too small: {len(raw_bgra)} < {expected}")

    payload = bytes(raw_bgra[:expected])
    rtbuf = CryptographicBuffer.decode_from_base64_string(base64.b64encode(payload).decode("ascii"))
    # pywinrt 3.x: create_copy_from_buffer(buffer, format, width, height) — no alpha arg
    return SoftwareBitmap.create_copy_from_buffer(rtbuf, BitmapPixelFormat.BGRA8, w, h)


async def _recognize_async(raw_bgra: bytes, width: int, height: int) -> str:
    engine = _get_ocr_engine()
    bitmap = _bgra_to_software_bitmap(raw_bgra, width, height)
    result = await engine.recognize_async(bitmap)
    return str(getattr(result, "text", "") or "")


def recognize_text_from_bgra(raw_bgra: bytes, width: int, height: int) -> str:
    """
    Run Windows OCR on a BGRA ROI (blocking).

    Always runs on a dedicated thread with its own asyncio loop so we never nest
    on the daemon's event loop (which can stall screen_health_status).
    """
    # Fail fast before starting a worker thread
    _get_ocr_engine()

    box: list = []
    errors: list = []

    def _runner() -> None:
        try:
            box.append(asyncio.run(_recognize_async(raw_bgra, width, height)))
        except Exception as exc:  # noqa: BLE001 — propagate to caller
            errors.append(exc)

    t = threading.Thread(target=_runner, name="windows-ocr", daemon=True)
    t.start()
    t.join(timeout=8.0)
    if errors:
        raise errors[0]
    if not box:
        raise RuntimeError("Windows OCR timed out")
    return str(box[0])


def read_ammo_value_from_bgra(
    raw_bgra: bytes,
    width: int,
    height: int,
    *,
    min_value: int = 0,
    max_value: int = 999,
) -> Tuple[Optional[int], str]:
    """
    OCR a ROI and parse an ammo integer (1–3 digits).

    Upscales small HUD crops, then tries normal + inverted polarity.
    Returns (value_or_none, raw_ocr_text from the best attempt).
    """
    prepared, pw, ph = _prepare_roi_for_ocr(raw_bgra, width, height)
    texts: list[str] = []

    for variant in (prepared, _invert_bgra(prepared, pw, ph)):
        text = recognize_text_from_bgra(variant, pw, ph)
        if text:
            texts.append(text)
        value = parse_ammo_int_from_ocr_text(
            text,
            min_value=min_value,
            max_value=max_value,
            max_digits=3,
        )
        if value is not None:
            return value, text

    return None, texts[0] if texts else ""
