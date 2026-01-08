## Phase B checklist

This checklist is meant to be checked off during implementation of Phase B.

---

## Preset profiles (Option A)
- [ ] Define preset source format (recommended: TS objects in `web/src/data/…`)
- [ ] Implement “Preset profiles” panel in Generic Screen Health page
- [ ] Implement “Install preset”:
  - [ ] copies preset into user storage as editable profile
  - [ ] sets installed profile as active
  - [ ] auto-captures a calibration screenshot after install
  - [ ] creates/updates a `meta` block **inside the profile JSON** (hints, last verified, etc.)
  - [ ] preserves preset id/name metadata for traceability (optional)
- [ ] Implement “Reset to preset defaults”
- [ ] Add at least 1 real preset profile for validation (can be internal/test-only initially)

---

## Directional ROI UX polish
- [ ] Ensure ROI list supports assigning direction keys cleanly
- [ ] Validate direction keys are restricted to the fixed vocabulary
- [ ] Ensure direction is carried through to daemon `hit_recorded` event params
- [ ] Keep haptics mapping random-cell (Phase B does not require directional mapping)

---

## Debugging / developer ergonomics
- [ ] (Optional) “Capture ROI crops on hit” toggle (default off)
- [ ] Improve ROI crop previews / labeling for direction

---

## Tests (explicit checkpoints)
- [ ] Add/update tests for profile validation (direction keys, multiple ROIs)
- [ ] Run: `cd modern-third-space && python3 -m pytest -q`
- [ ] (If UI logic grows complex) add minimal manual QA steps to `progress.md`

