## Generic Screen Health Watcher — phased plan

### Guiding principles
- **Windows-only** for this feature.
- Keep **existing architecture**: Electron UI + Python daemon.
- Implement as a **new integration type** in the daemon (no separate daemon).
- “Add a game” primarily by shipping a **default profile JSON**.
- **One active profile at a time**.
- Runtime capture captures **ROI rectangles only** (performance + privacy).
- Calibration uses **user-triggered full-frame screenshot** to draw ROIs.

---

## Phase A — MVP: `hit recorded` from redness ROI(s)

### Outcomes
- A new “Generic Screen Health” integration exists and can be enabled from the UI.
- A profile with one or more ROIs can detect “redness” and emit **hit** events.
- Direction is optional (profile may provide direction keys per ROI).
- Haptics mapping uses **random cell** by default (direction data can be carried but does not need to affect mapping).
- UI supports calibration via screenshot + ROI drawing and shows captured debug images.

### Deliverables
- Daemon: capture ROI rectangles + redness score + cooldown/debounce + hit event
- Daemon protocol: start/stop/status for this watcher (and event broadcast for UI logs)
- Electron UI: screenshot capture, ROI editor, enable/disable, debug screenshots panel
- Profile JSON: schema v0 for redness ROIs
- Import/export JSON

---

## Phase B — Directional hits (multi-ROI directional blocks)

### Outcomes
- Multiple ROIs mapped to fixed direction keys:
  - `front`, `back`, `left`, `right`, `front_left`, `front_right`, `back_left`, `back_right`
- UI supports adding/removing ROIs and assigning direction per ROI.

### Notes
- Direction may still not affect haptics if we keep default random-cell mapping.
- This phase mostly strengthens the event metadata and profile expressiveness.

---

## Phase C — Health bar tracking (stable UI)

### Outcomes
- Add a “health bar” detector that estimates fill percentage within an ROI.
- Derive:
  - `health_percent` updates (for UI/debug)
  - `hit recorded` when health decreases beyond a minimum drop threshold

### Notes
- This improves game compatibility for titles without a strong red vignette cue.

---

## Phase D — Health number OCR (digits; optional)

### Outcomes
- Add a “health number” detector using OCR on a digits ROI.
- Derive:
  - `health_value` updates
  - `hit recorded` when value decreases

### Notes
- Keep opt-in per profile; OCR is the most brittle + dependency-heavy.

---

## Phase E (optional) — Capture source expansion

### Outcomes
- Expand capture options beyond monitor:
  - window capture (if desired)
  - multi-monitor handling improvements
  - safer handling for borderless vs exclusive fullscreen

### Notes
- Not required for MVP; capture complexity can grow quickly.
