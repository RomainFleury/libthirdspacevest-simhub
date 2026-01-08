## Phase A details by domain (MVP design notes)

This document describes Phase A at the “implementation detail” level, organized by domain. It is meant to be updated as we learn things during implementation, without changing older docs.

---

## 1) Daemon (modern-third-space) — integration + capture + detection

### Integration behavior
- **One active profile** at a time.
- `enable` starts the capture loop; `disable` stops it.
- Tick cadence defaults to **50ms** (20 FPS).

### Capture source (Phase A)
- **Monitor capture** only.
- Capture **ROI rectangles only** each tick.
- Normalized ROI (`x,y,w,h` in [0,1]) is converted to pixel coordinates against the current capture frame dimensions.

### Detector: redness ROI(s)

#### Inputs
- One or more ROIs.
- Threshold config:
  - `min_score` (or equivalent)
  - optional channel thresholds/ratios (e.g. R dominance)
- Cooldown:
  - per-ROI or per-detector cooldown (start with per-detector)

#### Output
- Emits `hit` when a redness score exceeds threshold and cooldown allows.
- Event fields:
  - `timestamp_ms`
  - `detector="redness_rois"`
  - `roi_name` (optional)
  - `direction` (optional fixed key)
  - `score` or `intensity`

#### Redness scoring (suggested)
Simple and robust score for each pixel:
- Convert captured buffer to RGB.
- Compute “red dominance”:
  - \(dominance = R - max(G, B)\)
  - normalized by 255
Aggregate per ROI:
- mean dominance or percentile (e.g. 90th percentile) to reduce noise.

Apply smoothing:
- EMA: `score = alpha * current + (1-alpha) * previous` (alpha optional)

Cooldown/debounce:
- A detection is a hit if:
  - `score >= threshold` and
  - `now - last_hit_time >= cooldown_ms`

### Haptics mapping (Phase A default)
- On `hit`, trigger a **random cell** effect.
- Keep direction metadata but do not require directional mapping yet.

### Daemon commands / protocol (Phase A)
Add commands (exact naming TBD; keep consistent with existing protocol):
- `screen_health.start(profile_json)`
- `screen_health.stop()`
- `screen_health.status()`

Add broadcast events (for UI logs):
- `screen_health.hit`
- `screen_health.status` or `screen_health.status_changed`

### Testing notes
- Add registry snapshot entry for the new integration.
- Prefer lightweight unit tests for:
  - normalized ROI → pixel rect conversion
  - cooldown behavior
  - score calculation sanity

---

## 2) Profile JSON (Phase A schema v0)

### Constraints
- Must be exportable/importable.
- Must support:
  - monitor selection
  - 1+ redness ROIs
  - optional direction key per ROI
  - detector thresholds + cooldown

### Direction keys (fixed)
`front`, `back`, `left`, `right`, `front_left`, `front_right`, `back_left`, `back_right`

### Minimal example (illustrative)
```json
{
  "schema_version": 0,
  "name": "Generic redness ROIs",
  "capture": { "source": "monitor", "monitor_index": 1, "tick_ms": 50 },
  "detectors": [
    {
      "type": "redness_rois",
      "cooldown_ms": 200,
      "threshold": { "min_score": 0.35 },
      "rois": [
        { "name": "left", "direction": "left", "rect": { "x": 0.02, "y": 0.30, "w": 0.06, "h": 0.40 } }
      ]
    }
  ]
}
```

---

## 3) Electron main process — storage, IPC, debug images

### Storage model
- Profiles stored in app data (similar to existing patterns).
- Store:
  - profiles dictionary/list
  - active profile id
  - screenshot/debug folder path
  - retention policy:
    - max images
    - max age (days)

### IPC surface (Phase A)
Profiles:
- list profiles
- create/update/delete profile
- set active profile
- export/import profile JSON

Calibration screenshots:
- capture full-frame screenshot (monitor index)
- list stored screenshots (for UI gallery)
- delete one / clear all
- set folder + retention settings

Daemon control:
- enable watcher with active profile
- disable watcher
- status query

### Debug images policy
Two image types are useful:
1) **Calibration full-frame screenshot** (user-triggered)
2) **ROI crop debug images** (optional, what detector sees)

Phase A requirement from discussion:
- UI should display captured screenshots to ease debugging.
Preferred interpretation:
- show/store **ROI crop images** for runtime/debugging
- keep calibration full-frame screenshots only when user explicitly captures

Garbage control:
- On each save/capture, enforce retention:
  - remove oldest beyond max count
  - remove older than max age

---

## 4) Electron renderer (React) — calibration + gallery

### Calibration UX (Phase A)
- Select monitor
- “Capture screenshot” → show screenshot canvas
- Draw/edit ROIs:
  - drag to create rect
  - drag handles to resize
  - store normalized rect
- Assign optional direction per ROI (dropdown using fixed keys)
- Tune detector settings:
  - threshold
  - cooldown

### Captured screenshots panel (Phase A)
- List or grid of recent images:
  - thumbnail
  - timestamp
  - type (full-frame vs ROI-crop)
- Actions:
  - open preview
  - copy file path
  - delete
  - clear all

### Enable/disable
- Single active profile selector
- Enable/disable button reflects daemon status
- Show recent `hit` events (from daemon broadcast) for quick confirmation

---

## 5) Open questions / implementation notes (to resolve during Phase A)
- Capture library choice for Windows ROI capture inside daemon (performance/reliability in packaged environment).
- Whether ROI-crop debug images are generated in daemon or Electron:
  - daemon: already has ROI frames; can write images on demand or when hits occur
  - electron: can request ROI captures for preview
- How to handle monitor index changes / resolution changes gracefully.
