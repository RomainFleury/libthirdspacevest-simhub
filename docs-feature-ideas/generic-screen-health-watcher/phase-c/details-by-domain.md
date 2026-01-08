## Phase C — details by domain

---

## Daemon
- Add a `health_bar` detector implementation:
  - capture ROI (BGRA)
  - segment “filled” portion
  - compute `health_percent`
  - detect drops and emit `hit_recorded`

---

## Protocol/events
- Decide how to expose `health_percent` to UI:
  - new event type (e.g. `screen_health_health`)
  - or embed in existing events (params)

---

## UI (React)
- Add a configuration panel for:
  - ROI selection
  - orientation/fill direction
  - threshold/smoothing
- Add a live readout for:
  - current health percent
  - last N seconds (optional)

---

## Presets
- Health bar presets need more per-game tuning than redness ROIs; include notes:
  - resolution/HUD scaling assumptions
  - “take screenshot with full health” recommendation

