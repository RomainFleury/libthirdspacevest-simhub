## Summary of our exchanges (Generic Screen Health Watcher)

### Goal
Create a **standardized way to integrate new games** by detecting on-screen signals related to player damage/health (e.g. red damage vignette, health bar, health number), without requiring game mods.

### Must-have vs nice-to-have
- **Must-have event**: **hit recorded**
  - Can be derived from either:
    - a **visual “hit” cue** (e.g. red vignette), or
    - **health decreasing** (health tracking implies hit events).
- **Directional hits**: **optional**, but desirable.
  - Direction can be supported via **multiple ROIs**, where each ROI maps to a fixed direction key (e.g. `left`, `back`, etc.).

### Platform & architecture constraints
- **Windows-only** target for this feature.
- Keep the current architecture: **Electron UI + Python daemon**.
- **Do not introduce a new daemon**; implement as a new integration type inside the existing daemon.

### Capture approach decisions
- MVP can assume **borderless/windowed** mode to simplify capture.
- For now, capturing a **monitor region** is acceptable (future can add window capture).
- **Runtime capture** should capture **ROI rectangles only**, not full-screen frames (performance + privacy).
- **Calibration UI** still needs a **user-triggered full-frame screenshot** so the user can draw ROIs.

### Configuration & “game integrations”
- “Adding a game” should be achievable by shipping a **default JSON profile**.
- Users can tune and then **export/import JSON** profiles.
- **One profile active at a time** (matches UI mental model, avoids multiple watchers).
- Enabling a game/profile means: **daemon starts watching** with that profile.

### UX / debugging preferences
- Strong preference for **configuring ROIs using a screenshot** in the UI.
- In Phase A, add a UI panel that displays **captured screenshots** to ease debugging.
  - Agreement: show/store **ROI crop debug images** (what the detector sees) for runtime debugging.
  - Provide retention/cleanup controls; allow user to configure where screenshots are stored.

### Defaults and early choices
- Direction keys should be **fixed** (not freeform).
- Hit spam control: global “tick” cadence (e.g. 50ms) + per-detector cooldown/debounce.
- Phase A haptics mapping: **random cell** by default (direction data can be carried but not required to map yet).

### Detector types agreed
- **Red vignette (single ROI)**
- **Multiple red vignettes (directional ROIs)**
- **Health bar (stable UI)**
- **Health number (digits; OCR)**
