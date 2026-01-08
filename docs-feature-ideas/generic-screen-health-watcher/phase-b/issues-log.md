## Phase B — issues / decisions log

### Template
#### YYYY-MM-DD — <short title>
- **Context**:
- **Observed**:
- **Hypothesis**:
- **Investigation**:
- **Decision**:
- **Follow-ups**:

---

## Entries

### 2026-01-08 — Decisions: presets are game-specific + editable + auto-screenshot
- **Context**: Phase B planning for how capture-based “games” appear to users.
- **Decision**:
  - Presets are **game-specific** (not generic layouts).
  - Presets should feel like **editable templates (“edit in place”)**.
  - Installing a preset should **auto-capture a calibration screenshot** to guide ROI verification.
  - “Reset to preset defaults” should be provided.
  - Preset metadata should be embedded **inside the exported profile JSON** (e.g. `profile.meta`) so imports stay self-describing.
- **Notes**:
  - Practical implementation: “edit in place” means presets are installed into user storage on first use, then edited there; optionally support “Reset to preset defaults”.

