## Phase A implementation checklist (MVP)

This checklist is intentionally concrete so we can track implementation progress and regressions without editing older docs.

---

## Daemon / backend
- [ ] **Integration registry**: register “Generic Screen Health” integration (spec entry)
- [ ] **Manager**: implement a `screen_health_manager` (name TBD) with:
  - [ ] start(profile)
  - [ ] stop()
  - [ ] status()
- [ ] **Capture**: ROI-only capture on Windows
  - [ ] monitor selection
  - [ ] normalized ROI → pixel rect conversion
  - [ ] capture tick (default 50ms)
- [ ] **Detection**: redness ROI detector
  - [ ] redness score calculation
  - [ ] smoothing (optional)
  - [ ] cooldown/debounce
  - [ ] emit standardized `hit` event
- [ ] **Haptics**: on hit, trigger **random cell** effect
- [ ] **Daemon protocol**: add commands
  - [ ] `screen_health.start(profile_json)`
  - [ ] `screen_health.stop()`
  - [ ] `screen_health.status()`
- [ ] **Broadcast events to UI** (optional but recommended for debugging)
  - [ ] `screen_health.hit`
  - [ ] `screen_health.status_changed` (if useful)
- [ ] **Tests**:
  - [ ] add integration snapshot entry (registry snapshot test)
  - [ ] unit tests for ROI normalization and cooldown behavior (if practical)

---

## Electron main process
- [ ] **Storage** for screen-health profiles
  - [ ] save/load profiles
  - [ ] active profile id
  - [ ] import/export JSON
- [ ] **IPC** endpoints
  - [ ] list profiles
  - [ ] create/update/delete profile
  - [ ] set active profile
  - [ ] enable/disable watcher (bridge to daemon)
  - [ ] screenshot capture (full-frame, on demand, for calibration)
  - [ ] debug image retention settings
  - [ ] delete/clear debug images

---

## Electron renderer (React UI)
- [ ] **New integration page/panel** for Generic Screen Health
- [ ] **Calibration UI**
  - [ ] “Capture screenshot” button
  - [ ] ROI drawing/editing (normalized coords)
  - [ ] detector settings (threshold/cooldown)
- [ ] **Captured screenshots panel**
  - [ ] gallery/list of recent images
  - [ ] preview full-size
  - [ ] delete image / clear all
  - [ ] show path + timestamp
- [ ] **Enable/disable flow**
  - [ ] one active profile at a time
  - [ ] status indicator (running/stopped)
- [ ] **Import/export UI**
  - [ ] export JSON to file
  - [ ] import JSON from file

---

## Profiles / schema
- [ ] Define **schema v0** for Phase A:
  - [ ] capture source: monitor index, fps/tick
  - [ ] detector: redness ROIs
  - [ ] direction keys: fixed vocabulary
  - [ ] normalized ROI format
- [ ] Provide at least one **example default profile** JSON for testing

---

## Packaging / permissions (Windows)
- [ ] Confirm screenshot/capture method works in packaged Electron build
- [ ] Ensure capture libraries are included/compatible
- [ ] Ensure user-configurable storage directory works
