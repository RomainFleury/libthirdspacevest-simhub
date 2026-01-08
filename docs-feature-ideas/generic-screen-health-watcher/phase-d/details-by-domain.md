## Phase D — details by domain

---

## Daemon
- Add `health_number` detector:
  - ROI capture
  - preprocessing
  - OCR (digits-only)
  - stability filtering
  - hit derivation

---

## Dependencies
- Decide whether OCR dependency is:
  - bundled/required, or
  - optional (recommended) and enabled only when detector is configured

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

