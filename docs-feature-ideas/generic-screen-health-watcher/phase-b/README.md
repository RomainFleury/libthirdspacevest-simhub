## Phase B — Preset profiles + directional hits UX (documentation)

Phase B focuses on making the capture-based approach feel like “real game integrations” by:
- shipping **game-specific preset profiles** (Option A)
- improving the directional ROI workflow (without requiring directional haptics mapping yet)

---

## Goals
- Users can pick a **preset profile** for a specific game/layout and install it with one click.
- A profile can encode **directional ROIs** using fixed keys:
  - `front`, `back`, `left`, `right`, `front_left`, `front_right`, `back_left`, `back_right`
- UI makes it easy to:
  - add multiple ROIs
  - assign directions
  - validate “what the detector sees” (ROI crop previews)

---

## Out of scope (Phase B)
- Health bar tracking (Phase C)
- OCR health numbers (Phase D)
- Window capture / fullscreen handling (deferred to `future-next-steps/`)
- Directional haptics mapping (can remain random-cell in Phase B)

---

## Preset profiles (Option A) — how it should work

### Where presets live
Recommended:
- `web/src/data/screenHealthPresets.ts` exporting an array of presets (TS objects).

Each preset:
- has an id (stable key)
- has display metadata (name, game name, notes)
- includes a `profile` field that matches the daemon profile JSON schema

### Preset lifecycle: “edit in place templates” (practical implementation)
We want presets to feel like **templates you can edit in place**. Since presets are bundled with the app, the practical behavior should be:
- On first use, **install** the preset into user storage as a stored profile.
- After that, edits are applied to that stored profile (so it behaves like “edit in place” for the user).
- Provide an optional “Reset to preset defaults” action to re-apply the bundled preset.

### Preset metadata location: inside exported JSON
Preset metadata must be embedded **inside the profile JSON** (so export/import stays self-describing), e.g.:
- `profile.meta` (ignored by daemon)
- contains: `preset_id`, `game_name`, `last_verified_at`, `hints`, `recommended_resolution`, etc.

### Install behavior
- “Install preset”:
  - copies preset into Electron user storage (`screenHealthStorage`)
  - sets it as **active profile**
  - automatically **captures a calibration screenshot** to let user immediately validate/tweak ROIs

### Preset metadata (required)
Add a metadata block (`meta`) to each preset **inside the exported JSON** to help users troubleshoot:
- recommended resolution / aspect ratio
- HUD scale / UI scaling assumptions
- borderless/windowed note
- known conflicts (color filters, accessibility modes)
- “what to try if it doesn’t work” hints
- last verified date + game version (if known)

### Why TS objects (vs raw JSON files)
- Easy bundling with Vite/Electron (no file-path surprises).
- Easy to evolve schema with type assistance.

---

## Profile schema changes (Phase B)

No required schema changes if Phase A schema already supports:
- multiple ROIs
- optional `direction` per ROI

If Phase A shipped minimal ROI support, Phase B can standardize:
- `detectors[0].rois[]` contains:
  - `name: string`
  - `direction?: DirectionKey`
  - `rect: {x,y,w,h}` normalized

---

## UI/UX additions

### Presets panel
- Section in Generic Screen Health page:
  - preset selector (dropdown/search)
  - “Install preset” button
  - preset notes: recommended resolution, HUD scale assumptions, etc.

### Directional ROI assignment
- In ROI list:
  - direction dropdown per ROI
  - quick “duplicate ROI” action (common for symmetric HUD)

### Debugging support
- Keep ROI crop capture and gallery
- Add “Capture ROI crops on hit” (optional, off by default) to collect examples for tuning presets

---

## Daemon changes (Phase B)

Minimal:
- Include direction field in `hit_recorded` event (already supported in Phase A design).
- Optionally attach `roi` name + score in event params.

No changes required to haptics mapping if direction remains informational.

---

## Tests
- Add tests for:
  - profile validation of `direction` keys (reject unknown strings)
  - multiple ROI selection behavior (only triggers once per ROI cooldown)
- UI: lightweight smoke test manually (no automated web tests currently in repo).
