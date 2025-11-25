# Project Structure

This repository is organized to keep the original `libthirdspacevest` sources intact while adding modern tooling and new documentation archives around them.

- `legacy-do-not-change/` — verbatim copy of the historical driver/library. Treat as read-only and layer patches elsewhere.
- `modern-third-space/` — Python package that dynamically loads the legacy `thirdspace.py` driver and exposes a modern API plus CLI endpoints for other tooling (Electron debugger, scripts, etc.).
- `web/` — Electron + React + Tailwind workspace (plus Repomix tooling). All Node dependencies, UI code, and yarn-based workflows live here so they stay isolated from the legacy tree.
- `misc-documentations/` — curated documentation, assets, and legacy SimHub/bHaptics references (e.g., Alyx mod README, SimHub plugin sources, illustrative images). Nothing here is built or shipped, but it provides design/reference material for future work.

When adding new functionality:

1. Leave `legacy-do-not-change/` unchanged.
2. Build/extend the Python bridge in `modern-third-space/` (install with `pip install -e .` if you need local changes).
3. Place all Node/Electron work under `web/`.
4. Keep documentation dumps, research notes, or third-party integration references under `misc-documentations/`.
5. Use bridging layers (scripts, adapters, etc.) outside the legacy directory if you need to interact with the original driver.

This setup lets us iterate on modern tooling while preserving the historical code for reference.

## Running the Debug Tool

The Electron debugger console allows you to monitor USB connectivity, trigger individual actuators, and inspect command logs.

### Prerequisites

- Node.js (v25.2.1 recommended — see `web/.nvmrc`)
- Yarn (managed via Corepack)
- Python 3.11+ (for the `modern-third-space` bridge)

### Setup Steps

**Important:** You must set up the Python bridge before starting the Electron app.

1. **Install the Python package:**

   ```bash
   cd modern-third-space
   pip install -e .
   ```

   This installs the `modern-third-space` CLI and its dependencies (including PyUSB).

2. **Verify the Python bridge works:**

   ```bash
   python3 -m modern_third_space.cli ping
   ```

   You should see: `{"status": "ok", "message": "Python bridge is reachable"}`

3. **Optional: Test device listing:**

   ```bash
   python3 -m modern_third_space.cli list
   ```

   This will show connected USB vests (or a fake device with serial "sorry-bro" if PyUSB isn't installed).

4. **Navigate to the web workspace:**

   ```bash
   cd ../web
   ```

5. **Install Node.js dependencies:**

   ```bash
   corepack enable
   yarn install
   ```

6. **Start the development environment:**

   ```bash
   yarn dev
   ```

   This launches both the Vite dev server (renderer) and the Electron window in parallel.

7. **Or run components separately:**

   ```bash
   # Terminal 1: Start the renderer (React UI)
   yarn dev:renderer

   # Terminal 2: Start Electron (waits for renderer on port 5173)
   yarn dev:electron
   ```

The debugger UI will open in an Electron window. The Python bridge will be automatically detected on startup.

**Note:** If you see errors about PyUSB not being available, see `modern-third-space/README.md` for platform-specific installation instructions.

For more details, see `web/README.md`.
