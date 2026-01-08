## Phase C — Health bar tracking (documentation)

Phase C adds an optional detector that tracks a **health bar fill** in an ROI and derives `hit recorded` from decreases.

---

## Goals
- Support games that don’t have a strong red vignette, but have a stable HP bar.
- Emit:
  - `health_percent` updates (for UI/debug)
  - `hit_recorded` when health decreases enough

---

## Non-goals
- OCR digits (Phase D)
- Perfect cross-game bar detection without calibration (users will still tune ROI + thresholds)

---

## Detector concept: `health_bar`

### Inputs (profile)
- `roi`: normalized rectangle around the bar
- Phase C scope: **horizontal only** (future can add vertical / other fill directions)
- color/segmentation:
  - **user samples colors** in UI (recommended UX):
    - “health on” color (filled)
    - “health off” color (empty/background)
  - still allow a threshold-based fallback (brightness/saturation) for tough UIs
- smoothing:
  - EMA `alpha` or rolling average window
- hit derivation:
  - `min_drop` (e.g. 0.02)
  - `cooldown_ms`

### Output
- `health_percent` (0..1)
- `hit_recorded` when:
  - `prev_health - new_health >= min_drop` and cooldown allows

### Why this is hard
- HUD scaling, post-processing, bar gradients, and “damage flash” effects can skew segmentation.

---

## Profile schema additions (Phase C)

Add a second detector type:

```json
{
  "type": "health_bar",
  "roi": { "x": 0.1, "y": 0.9, "w": 0.3, "h": 0.03 },
  "orientation": "horizontal",
  "color_sampling": {
    "filled_rgb": [220, 40, 40],
    "empty_rgb": [40, 40, 40],
    "tolerance": 0.15
  },
  "threshold": { "mode": "brightness", "min": 0.4 }, // optional fallback
  "smoothing": { "alpha": 0.3 },
  "hit_on_decrease": { "min_drop": 0.02, "cooldown_ms": 150 }
}
```

---

## UI changes
- Add detector type selection: `redness_rois` vs `health_bar`
  - or allow multiple detectors in one profile (recommended long-term).
- Health bar calibration:
  - live display of `health_percent`
  - “sample fill color” tool (optional)
- Add a simple “health graph” (last N seconds) for tuning (optional).

---

## Daemon changes
- Implement the `health_bar` detector (ROI-only capture still).
- Add new daemon event broadcast:
  - `screen_health_health` (optional) for UI visualization, OR reuse `screen_health_hit` + embed `health_percent` in params.

---

## Tests
- Unit tests for:
  - bar percent estimation on synthetic images
  - hit-on-decrease threshold/cooldown behavior
