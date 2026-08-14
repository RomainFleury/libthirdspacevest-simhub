"""Shared ROI prep used by every ammo OCR engine."""

from __future__ import annotations

from typing import Tuple

from .types import OcrRoi

# Tiny HUD crops often fail; nearest-neighbor upscale to about this size.
_MIN_OCR_HEIGHT = 96
_MIN_OCR_WIDTH = 160
_MAX_SCALE = 8


def prepare_roi(raw_bgra: bytes, width: int, height: int) -> OcrRoi:
    """Upscale tiny HUD ROIs, pad edges, force opaque alpha."""
    bgra, w, h = _prepare_roi_bytes(raw_bgra, width, height)
    return OcrRoi(bgra=bgra, width=w, height=h)


def invert_roi(roi: OcrRoi) -> OcrRoi:
    return OcrRoi(bgra=_invert_bgra(roi.bgra, roi.width, roi.height), width=roi.width, height=roi.height)


def _prepare_roi_bytes(raw_bgra: bytes, width: int, height: int) -> Tuple[bytes, int, int]:
    w, h = int(width), int(height)
    expected = w * h * 4
    if w <= 0 or h <= 0:
        raise ValueError("width and height must be > 0")
    if len(raw_bgra) < expected:
        raise ValueError(f"BGRA buffer too small: {len(raw_bgra)} < {expected}")

    try:
        import numpy as np
    except Exception as e:  # pragma: no cover
        raise RuntimeError("numpy required for OCR ROI prep") from e

    img = np.frombuffer(raw_bgra[:expected], dtype=np.uint8).reshape((h, w, 4)).copy()
    img[:, :, 3] = 255

    scale_h = max(1, int((_MIN_OCR_HEIGHT + h - 1) // h)) if h < _MIN_OCR_HEIGHT else 1
    scale_w = max(1, int((_MIN_OCR_WIDTH + w - 1) // w)) if w < _MIN_OCR_WIDTH else 1
    scale = min(_MAX_SCALE, max(scale_h, scale_w))
    if scale > 1:
        img = np.repeat(np.repeat(img, scale, axis=0), scale, axis=1)

    pad = max(4, scale * 2)
    out_h, out_w = int(img.shape[0]) + pad * 2, int(img.shape[1]) + pad * 2
    padded = np.zeros((out_h, out_w, 4), dtype=np.uint8)
    padded[:, :, 3] = 255
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
        raise RuntimeError("numpy required for OCR ROI prep") from e
    expected = int(width) * int(height) * 4
    img = np.frombuffer(raw_bgra[:expected], dtype=np.uint8).reshape((int(height), int(width), 4)).copy()
    img[:, :, :3] = 255 - img[:, :, :3]
    img[:, :, 3] = 255
    return img.tobytes()
