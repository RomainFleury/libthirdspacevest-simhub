## Phase C checklist (Health bar tracking)

---

## Daemon detector: `health_bar`
- [ ] Implement health bar percent estimation in ROI
- [ ] Phase C scope: horizontal bars only
- [ ] Add smoothing options (EMA or window)
- [ ] Derive `hit_recorded` from decreases (min_drop + cooldown)
- [ ] Emit `health_percent` for UI/debug (event or params)

---

## Profile schema
- [ ] Extend profile schema with `health_bar` detector definition
- [ ] Backward compatible with Phase A/B profiles

---

## UI
- [ ] Add health bar detector configuration UI
- [ ] Show live `health_percent` readout for tuning
- [ ] Add “sample filled color” + “sample empty color” tools (recommended UX)
- [ ] Add help text on common pitfalls (gradients, flashing overlays, HUD scaling)

---

## Tests (explicit checkpoints)
- [ ] Unit tests for percent estimation on synthetic frames
- [ ] Unit tests for hit-on-decrease logic + cooldown
- [ ] Run: `cd modern-third-space && python3 -m pytest -q`

