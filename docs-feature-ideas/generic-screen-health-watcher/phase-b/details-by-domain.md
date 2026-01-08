## Phase B — details by domain

---

## UI (React)
- Add a “Preset profiles” section to the Generic Screen Health page.
- Preset install flow:
  - creates a new stored profile in userData
  - sets it active
  - auto-captures a calibration screenshot to start ROI verification immediately
 - Preset lifecycle:
  - stored preset profiles are editable (“edit in place” UX)
  - add optional “Reset to preset defaults” action

---

## Electron main
- If presets are TS objects (renderer):
  - Electron main only needs existing IPC calls (`saveProfile`, `setActiveProfile`).
- If presets are JSON files:
  - implement file loading from packaged resources (more complex; prefer TS objects).

---

## Daemon
- No core algorithm changes required for Phase B.
- Ensure event payload includes `direction` when present.

---

## Profiles / schema
- Keep schema v0 (Phase A) and standardize multi-ROI + direction usage.
 - Store preset metadata in the stored-profile wrapper (not in daemon profile JSON), e.g.:
  - `{ presetId, gameName, hints, lastVerifiedAt, recommendedResolution, notes }`

