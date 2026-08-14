# Ammo OCR screenshot fixtures

Drop HUD crops here. The filename **is the expected integer**.

| File | Expected |
|------|----------|
| `12.png` | 12 |
| `9.jpg` | 9 |
| `07.png` | 7 |
| `30_ut2004.png` | 30 |
| `12-dark.png` | 12 |

Supported: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.webp`

Crop tightly around the magazine counter. Images in this folder are gitignored.

## Evaluate every OCR engine

```bash
cd modern-third-space
python -m modern_third_space.cli ocr eval
python -m modern_third_space.cli ocr eval --engine tesseract_boxes
python -m modern_third_space.cli ocr engines
python -m pytest tests/test_ocr_eval.py -s
```

The shared pipeline (upscale/pad, then normal + inverted polarity) is the same for every engine. Only the final `read_number()` call differs.

Live recoil in the UI offers **Windows OCR** and **OpenCV contours + kNN** only. Full scores and the lab backends: `misc-documentations/orc/eval-results.md`.
