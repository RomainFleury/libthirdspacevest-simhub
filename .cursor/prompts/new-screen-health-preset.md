## Prompt: Create a new Screen Health preset (default settings) from a screenshot

You are helping add a **bundled preset profile** for the “Generic Screen Health” integration.

### Goal
- Take a game screenshot (and any user-provided pixel coordinates / sampled colors) and produce a **high-quality default profile**.
- Add it to the app’s bundled presets list so it appears in the UI under **Preset profiles**.

### Constraints (must follow)
- **Windows-only** at runtime is OK; development environment may not have capture deps.
- **Do not** implement a new game integration/manager for this task.
- **Do not** add full-screen capture at runtime; only ROI capture is used by the daemon.
- Keep changes small and localized to presets + docs if needed.

### Where presets live
- Add the preset entry to: `web/src/data/screenHealthPresets.ts` (array `SCREEN_HEALTH_PRESETS`)
- The UI already supports installing presets (copying them into user storage as editable profiles).

### What to ask the user for (if missing)
- A **full-frame screenshot** (preferred) and the **resolution** (e.g. 1920×1080).
- Which detector they want:
  - `health_bar` (Phase C) preferred when available
  - `redness_rois` (Phase A) for damage vignette
  - `health_number` (Phase D) only if digits-only, fixed font, fixed digit count
- For `health_bar`:
  - Pixel bounds for ROI (left/right/top/bottom) OR permission to estimate ROI from the screenshot
  - Sampled `filled_rgb` and `empty_rgb` (or let the agent sample by inspection)
- For `health_number`:
  - ROI bounds and digit count
  - A screenshot where the number is clearly visible (for template learning), plus the exact number shown

### Output profile shape (schema_version 0)
Create a preset object like:
- `preset_id`: stable id, e.g. `cs2_health_bar_v1`
- `display_name`: user-friendly string
- `profile`: daemon-compatible JSON with:
  - `schema_version: 0`
  - `name`
  - `meta` (embedded in the profile JSON)
  - `capture: { source: "monitor", monitor_index: 1, tick_ms: 50 }`
  - `detectors: [...]`

Use normalized ROI coordinates:
- `x = left_px / screen_width`
- `y = top_px / screen_height`
- `w = (right_px - left_px) / screen_width`
- `h = (bottom_px - top_px) / screen_height`

### Recommended defaults (starting point)
- `tick_ms`: 50
- `hit_on_decrease.cooldown_ms`: 150
- `health_bar.hit_on_decrease.min_drop`: 0.02
- `health_bar.color_sampling.tolerance_l1`: start at 100–140

### Implementation steps
1. Derive ROI normalized coordinates and pick sane padding (1–3px) if needed.
2. For `health_bar`, set `filled_rgb`, `empty_rgb`, and `tolerance_l1`.
3. Add a new preset entry in `web/src/data/screenHealthPresets.ts`.
4. Run checks:
   - `cd modern-third-space && python3 -m pytest -q`
   - `cd web && yarn build`
5. Reply with:
   - The final preset id and display name
   - The exact profile JSON (for export/import)
   - The file(s) changed

