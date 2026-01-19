## Phase D — details by domain

---

## Daemon
- Add `health_number` detector:
  - ROI capture
  - preprocessing
  - OCR (digits-only, strict fixed font)
  - stability filtering
  - hit derivation

---

## Dependencies
- OCR dependencies should be **bundled** in the Windows distribution.

### Fast digits-only approach (per-tick)
To support per-tick use, prefer a simple digits-only pipeline:
- Preprocess ROI to a small binary image.
- Segment into fixed digit cells (fixed width).
- Recognize each digit via template matching (Hamming distance on bitmaps).
This avoids heavyweight OCR engines and keeps per-tick costs predictable.

---

## UI (React)
- Add OCR calibration controls:
  - threshold/invert/scale
  - show last recognized value
  - “test once” capture

---

## Presets
- OCR-based presets are fragile; prefer shipping only when validated, with clear notes:
  - known-good resolution/HUD scale
  - language/font assumptions

