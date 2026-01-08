## Phase C — details by domain

---

## Daemon
- Add a `health_bar` detector implementation:
  - capture ROI (BGRA)
  - segment “filled” portion
  - compute `health_percent`
  - detect drops and emit `hit_recorded`

### Performance-first segmentation (fastest path)
Prefer per-pixel integer math (no floats, no sqrt) for per-tick operation:
- Convert BGRA → RGB cheaply while iterating bytes.
- If using sampled colors:
  - compute L1 distance: `abs(r-rf)+abs(g-gf)+abs(b-bf)` and compare to `tolerance_l1` (int)
  - (optional) also compare distance-to-empty and classify pixel as “filled” if it’s closer to filled than empty
This keeps CPU cost low even for moderately sized ROIs.

---

## Protocol/events
- Decide how to expose `health_percent` to UI:
  - new event type (e.g. `screen_health_health`)
  - or embed in existing events (params)

---

## UI (React)
- Add a configuration panel for:
  - ROI selection
  - Phase C scope: horizontal only
  - sampled filled/empty colors + `tolerance_l1`
  - threshold/smoothing (fallback/advanced)
- Add a live readout for:
  - current health percent
  - last N seconds (optional)

---

## Presets
- Health bar presets need more per-game tuning than redness ROIs; include notes:
  - resolution/HUD scaling assumptions
  - “take screenshot with full health” recommendation

