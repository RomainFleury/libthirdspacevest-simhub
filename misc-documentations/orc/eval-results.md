# Ammo OCR engine eval (2026-08-14)

Fixture folder: `modern-third-space/tests/fixtures/ammo_ocr/` (25 HUD crops; filename = expected integer).

Command:

```bash
cd modern-third-space
py -3.14 -m modern_third_space.cli ocr eval --repeats 5
```

All backends stay in the daemon (`server/ocr/backends.py`) so we can re-run this when models or OpenCV change. **Daemon Settings only offers two live choices:** Windows OCR and OpenCV contours + kNN.

## Why those two

| Need | Pick |
|------|------|
| Live recoil tick (~50 ms) | Must stay well under the tick. RapidOCR median **331 ms** is too slow. |
| Speed | OpenCV kNN median **2 ms**. |
| Bundled / no extra native OCR | Windows OCR median **8 ms**, already in the daemon on Windows. |

RapidOCR was the most accurate (**84%**, stable across 5 repeats) but cannot keep up with recoil polling. Keep it for lab eval only.

## 5-repeat results

Same decoded pixels each pass. Every engine returned the **same prediction** on every image (25/25 stable). Accuracy did not flicker; time still varies (warmup + jitter).

| Engine | Acc (all 5 runs) | Stable | Median | Range | UI |
|--------|-----------------:|-------:|-------:|-------|-----|
| RapidOCR | 21/25 (84%) | 25/25 | 331 ms | 235–1432 ms | lab only |
| Windows OCR | 12/25 (48%) | 25/25 | 8 ms | 4–40 ms | **offered** |
| Tesseract | 12/25 (48%) | 25/25 | 136 ms | 129–287 ms | lab only |
| OpenCV + Tesseract boxes | 6/25 (24%) | 25/25 | 257 ms | 127–306 ms | lab only |
| OpenCV contours + kNN | 3/25 (12%) | 25/25 | 2 ms | 1–7 ms | **offered** |
| OpenCV cells + kNN | 2/25 (8%) | 25/25 | 2 ms | 1–3 ms | lab only |

RapidOCR misses (same all 5 runs): `100.png`, `54.png`, `741.png`, `9.png`.

## Install (not in the Electron build)

- **Windows OCR:** OCR language pack in Windows Settings (see `windows-ocr-setup.md`). WinRT packages **are** daemon dependencies; the OS pack **is not** something we can put in the Electron installer.
- **OpenCV kNN:** into the daemon interpreter, OpenCV 4.x (5.x dropped `cv2.ml`):

  `py -3.14 -m pip install "opencv-python-headless>=4.8,<5"`

- **Lab engines:** `py -3.14 -m pip install "modern-third-space[ocr-all]"` plus Tesseract EXE on PATH. Then `ocr eval --repeats 5`.
