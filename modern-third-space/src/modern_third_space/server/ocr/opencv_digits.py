"""OpenCV digit isolation helpers (contours / cells + synthetic kNN)."""

from __future__ import annotations

import threading
from typing import List, Optional, Tuple

try:
    import numpy as np
except Exception:  # pragma: no cover
    np = None  # type: ignore

_KNN_LOCK = threading.Lock()
_KNN = None
_KNN_FAILED: Optional[str] = None
_PATCH = 20


def opencv_unavailable_reason() -> Optional[str]:
    if np is None:
        return (
            "numpy is required for OpenCV digit OCR. Install into the daemon interpreter, e.g.\n"
            "  py -3.14 -m pip install numpy"
        )
    try:
        import cv2  # noqa: F401
        return None
    except Exception as e:
        return (
            "OpenCV is not installed. Install into the daemon interpreter, e.g.\n"
            '  py -3.14 -m pip install "opencv-python-headless>=4.8,<5"\n'
            f"Import error: {e}"
        )


def _bgra_to_gray(raw_bgra: bytes, width: int, height: int):
    expected = int(width) * int(height) * 4
    img = np.frombuffer(raw_bgra[:expected], dtype=np.uint8).reshape((int(height), int(width), 4))
    bgr = img[:, :, :3]
    import cv2

    return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


def _get_digit_knn():
    global _KNN, _KNN_FAILED
    with _KNN_LOCK:
        if _KNN is not None:
            return _KNN
        if _KNN_FAILED:
            raise RuntimeError(_KNN_FAILED)
        reason = opencv_unavailable_reason()
        if reason:
            _KNN_FAILED = reason
            raise RuntimeError(reason)
        import cv2

        samples: List[np.ndarray] = []
        labels: List[int] = []
        fonts = (
            cv2.FONT_HERSHEY_SIMPLEX,
            cv2.FONT_HERSHEY_DUPLEX,
            cv2.FONT_HERSHEY_PLAIN,
        )
        for digit in range(10):
            for font in fonts:
                for scale in (0.6, 0.8, 1.0, 1.2):
                    for thickness in (1, 2):
                        canvas = np.zeros((_PATCH, _PATCH), dtype=np.uint8)
                        cv2.putText(
                            canvas,
                            str(digit),
                            (2, _PATCH - 4),
                            font,
                            scale,
                            255,
                            thickness,
                            cv2.LINE_AA,
                        )
                        samples.append(canvas.reshape(1, _PATCH * _PATCH).astype(np.float32))
                        labels.append(digit)
        knn = cv2.ml.KNearest_create()
        knn.train(np.vstack(samples), cv2.ml.ROW_SAMPLE, np.array(labels, dtype=np.int32))
        _KNN = knn
        return _KNN


def _classify_patch(gray_patch) -> str:
    import cv2

    knn = _get_digit_knn()
    patch = cv2.resize(gray_patch, (_PATCH, _PATCH), interpolation=cv2.INTER_AREA)
    _, bw = cv2.threshold(patch, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    if np.mean(bw) > 127:
        bw = 255 - bw
    sample = bw.reshape(1, _PATCH * _PATCH).astype(np.float32)
    _ret, results, _neigh, _dist = knn.findNearest(sample, k=3)
    return str(int(results[0][0]))


def _binaries(gray) -> List:
    import cv2

    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    out = []
    for src in (blur, 255 - blur):
        _, bw = cv2.threshold(src, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        out.append(bw)
    return out


def _patches_from_contours(bw) -> List:
    import cv2

    h, w = bw.shape
    contours, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes: List[Tuple[int, int, int, int]] = []
    min_h = max(6, int(h * 0.28))
    min_a = max(12, int(w * h * 0.01))
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if ch < min_h or cw * ch < min_a:
            continue
        if cw > w * 0.9:
            continue
        boxes.append((x, y, cw, ch))
    boxes.sort(key=lambda b: b[0])
    patches = []
    for x, y, cw, ch in boxes[:4]:
        pad = 2
        x0 = max(0, x - pad)
        y0 = max(0, y - pad)
        x1 = min(w, x + cw + pad)
        y1 = min(h, y + ch + pad)
        patches.append(bw[y0:y1, x0:x1])
    return patches


def _patches_from_cells(bw) -> List:
    h, w = bw.shape
    col = (bw > 0).sum(axis=0).astype(np.float32)
    if col.max() <= 0:
        return []
    thr = max(1.0, float(col.max()) * 0.12)
    ink = col >= thr
    spans: List[Tuple[int, int]] = []
    i = 0
    while i < w:
        if not ink[i]:
            i += 1
            continue
        j = i
        while j < w and ink[j]:
            j += 1
        if j - i >= 2:
            spans.append((i, j))
        i = j
    if not spans:
        return [bw]
    merged: List[Tuple[int, int]] = [spans[0]]
    for a, b in spans[1:]:
        pa, pb = merged[-1]
        if a - pb <= max(1, w // 40):
            merged[-1] = (pa, b)
        else:
            merged.append((a, b))
    patches = []
    for a, b in merged[:4]:
        pad = 1
        x0 = max(0, a - pad)
        x1 = min(w, b + pad)
        patches.append(bw[:, x0:x1])
    return patches


def _best_digit_string(raw_bgra: bytes, width: int, height: int, patch_fn) -> Optional[int]:
    from .parse import number_from_ocr_text

    gray = _bgra_to_gray(raw_bgra, width, height)
    best = ""
    for bw in _binaries(gray):
        patches = patch_fn(bw)
        if not patches:
            continue
        text = "".join(_classify_patch(p) for p in patches)
        if text.isdigit() and len(text) > len(best):
            best = text
    return number_from_ocr_text(best)


def read_opencv_knn_number(raw_bgra: bytes, width: int, height: int) -> Optional[int]:
    return _best_digit_string(raw_bgra, width, height, _patches_from_contours)


def read_opencv_cells_number(raw_bgra: bytes, width: int, height: int) -> Optional[int]:
    return _best_digit_string(raw_bgra, width, height, _patches_from_cells)
