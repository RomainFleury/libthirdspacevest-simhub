## Phase D checklist (Health number OCR - optional)

---

## Daemon detector: `health_number`
- [ ] OCR approach: digits-only first (bundled)
- [ ] Implement preprocessing pipeline (threshold/invert/scale)
- [ ] Implement stability filtering (reject outliers, stable_reads)
- [ ] Derive `hit_recorded` from decreases (min_drop + cooldown)
- [ ] Emit `health_value` for UI/debug

---

## Profile schema
- [ ] Extend profile schema with `health_number` detector definition
- [ ] Backward compatible with earlier phases

---

## UI
- [ ] OCR calibration UI (show ROI crop + recognized value)
- [ ] “Test capture once” button (avoid continuous OCR while tuning)
- [ ] Ensure OCR can run per tick (performance + stability controls)
- [ ] Explain strict assumptions (digits-only, fixed font) and why (per-tick performance)

---

## Tests (explicit checkpoints)
- [ ] Unit tests for parsing/validation of OCR output
- [ ] Deterministic preprocessing tests (fixture images)
- [ ] Run: `cd modern-third-space && python3 -m pytest -q`

