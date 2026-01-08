## Initial project: Generic Screen Health Watcher (daemon + Electron)

### Problem statement
Many games provide **on-screen feedback** for damage/health (red vignette, health bar, health digits) but do not expose a modding API or events we can hook. We want a **simple, standardized integration path** that works when no mod/telemetry exists.

The integration should produce a minimum standardized event:
- **`hit recorded`** (must-have)

Optional enhancements:
- **Directional hit** (using multiple ROIs mapped to direction keys)
- **Health tracking** (health bar fill % and/or health number OCR) which can also derive hit events

### Non-goals (for MVP)
- Cross-platform support (Windows-only for now)
- Exclusive fullscreen capture reliability (assume borderless/windowed first)
- Memory reading / anti-cheat sensitive approaches

---

## High-level architecture

### Core idea
Implement a new integration type inside the existing Python daemon:
- **Generic Screen Health Watcher**

“Adding a game” becomes shipping a **profile JSON** that configures what the watcher looks for and how it maps detections to events/haptics.

### Components

#### 1) Python daemon (modern-third-space)
- Owns the **capture loop** and **detection logic**.
- Runs at a configurable tick (default: 50ms / 20 FPS).
- Captures **only the ROI rectangles** from the configured profile.
- Emits standardized events (for logging/UI) and triggers haptics through the daemon.

#### 2) Electron UI (web/)
- Provides a **calibration workflow**:
  - user-triggered **full-frame screenshot** (monitor selection)
  - draw ROIs on screenshot
  - select detector type and thresholds
  - test detection live (best effort)
- Provides **profile management**:
  - save/edit/delete profiles
  - **import/export** JSON profiles
  - “Enable” a profile (one active at a time)
- Provides **debugging assets**:
  - show a “Captured screenshots” panel (Phase A request)
  - store and display **ROI crop debug images** (what the detector sees)
  - retention/cleanup controls and user-configurable storage directory

---

## Standard events (internal contract)

Minimum standardized event:
- **`hit`**:
  - **timestamp**
  - **source detector** (`redness_roi`, `health_bar_drop`, etc.)
  - **intensity** (0–1 or 0–100; scaling TBD)
  - **direction**: optional fixed key

Optional derived signals:
- **`health_percent`** (0–1)
- **`health_value`** (int)

These are primarily for UI/logging and future mapping improvements; Phase A only requires `hit`.

---

## Direction keys (fixed vocabulary)
Use a fixed set:
- `front`, `back`, `left`, `right`, `front_left`, `front_right`, `back_left`, `back_right`

Directional detection is optional. A profile can:
- provide one ROI without direction (generic hit), or
- provide multiple ROIs each mapped to a direction key.

---

## Profile JSON (game configuration)

### Why JSON
- It can be shipped as “defaults” per game/layout.
- It can be user-tuned and then exported/imported.
- It allows a generic integration without writing per-game code.

### Coordinate system
Store ROIs as **normalized coordinates** relative to the captured frame:
- `x`, `y`, `w`, `h` are floats in [0,1]

This keeps profiles robust across resolution changes (within reason).

### Suggested minimal schema (evolvable)
- Profile metadata: id, name, version
- Capture source: monitor index, tick rate
- Detectors list:
  - detector type + thresholds
  - ROIs + optional direction mapping
  - cooldown/debounce settings

---

## Relationship to existing repo artifacts

This repo already contains relevant prototypes/docs:
- A screen capture prototype for BF2 2017 in:
  - `misc-documentations/bhaptics-svg-24-nov/star-wars-battlefront-2-2017/screen_capture_prototype.py`
- Docs recommending screen capture for BF2 2017:
  - `docs-external-integrations-ideas/EA_BATTLEFRONT2_2017_INTEGRATION.md`
- Electron IPC + storage for BF2 threshold tuning (existing UI precedent):
  - `web/electron/ipc/bf2Handlers.cjs`

The new “Generic Screen Health Watcher” should generalize this approach into a **proper daemon integration** with **profiles** and a **calibration UI**.

---

## Enable/disable model
- The UI selects **one active profile** at a time.
- Enabling a profile means:
  - send the profile to daemon
  - daemon starts watcher loop using that profile
- Disabling means daemon stops capture/detection.
