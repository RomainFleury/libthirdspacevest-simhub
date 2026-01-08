## Phase D — Health number OCR (optional) (documentation)

Phase D adds an optional detector that reads a health number from a digits ROI (OCR) and derives `hit recorded` from decreases.

---

## Goals
- Support games where:
  - there is no reliable red vignette, and
  - the health bar is too stylized/animated, but
  - the health number is stable and readable.

---

## Risks / why optional
- OCR adds heavy dependencies and failure modes:
  - font changes, outlines, shadows, compression artifacts
  - localization (different digits rendering)
  - HUD scaling and post-processing
- Performance cost can be high if run too frequently.

---

## Detector concept: `health_number`

### Inputs (profile)
- `roi`: normalized rectangle around digits
- pre-processing:
  - grayscale / invert
  - thresholding
  - scale factor
- OCR engine selection (implementation choice):
  - lightweight digit-only approach first (template matching / simple classifier), or
  - Tesseract (more robust but heavier)
- smoothing + validation:
  - reject outliers
  - require N consistent reads
- hit derivation:
  - `min_drop` (e.g. 1 HP)
  - `cooldown_ms`

### Output
- `health_value` (integer)
- `hit_recorded` when:
  - `prev_health - new_health >= min_drop` and cooldown allows

---

## Profile schema additions (Phase D)

```json
{
  "type": "health_number",
  "roi": { "x": 0.05, "y": 0.90, "w": 0.10, "h": 0.05 },
  "preprocess": { "grayscale": true, "invert": false, "threshold": 0.6, "scale": 2.0 },
  "readout": { "min": 0, "max": 300, "stable_reads": 2 },
  "hit_on_decrease": { "min_drop": 1, "cooldown_ms": 150 }
}
```

---

## UI changes
- OCR calibration view:
  - show ROI crop preview
  - show “raw recognized text” and parsed integer
  - tuning controls for threshold/scale/invert
- Add a “test capture” button that runs OCR once and displays result (avoid continuous OCR while configuring).

---

## Daemon changes
- Implement OCR pipeline as an optional module:
  - keep import optional when OCR isn’t configured (similar pattern to capture deps).
- Add event broadcast for UI:
  - `screen_health_health_number` (or embed `health_value` in params).

---

## Tests
- Unit tests for:
  - parsing + validation of OCR output (digits-only)
  - hit-on-decrease cooldown logic
  - deterministic pre-processing steps (using small fixture images)
