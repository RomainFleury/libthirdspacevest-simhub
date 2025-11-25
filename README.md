# Project Structure

This repository is organized to keep the original `libthirdspacevest` sources intact while adding modern tooling and new documentation archives around them.

## TLDR - Quickstart

**Fastest way to get the debugger running:**

```bash
# 1. Install Python package
cd modern-third-space && pip install -e . && cd ..

# 2. Install Node dependencies and start
cd web && yarn install && yarn dev
```

That's it! The Electron window will open. If you see a "sorry-bro" device, install PyUSB: `pip install pyusb` (see `modern-third-space/README.md` for platform-specific notes).

**Verify setup:**

```bash
cd web && yarn check:python
```

## For AI Assistants

If you're an AI assistant working on this repository, see [`AI_ONBOARDING.md`](./AI_ONBOARDING.md) for a complete onboarding guide, including project overview, setup verification steps, key commands, and development guidelines.


## Enough time to do the slow start and introduction and shit

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

### Windows Quick Setup

**For Windows users**, we provide automated setup scripts in the `windows/` directory:

```powershell
# Run from the project root directory
.\windows\setup-windows.ps1
```

This script will:
- ✅ Check/install Node.js v25.2.1 using nvm-windows
- ✅ Enable Corepack for Yarn
- ✅ Install all Node.js dependencies
- ✅ Optionally verify Python bridge setup

**Requirements:**
- nvm-windows must be installed first: https://github.com/coreybutler/nvm-windows/releases
- Run PowerShell (you may need to allow script execution: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)

**Options:**
```powershell
.\windows\setup-windows.ps1 -SkipPythonCheck  # Skip Python verification
.\windows\setup-windows.ps1 -Help              # Show help message
```

**To start the development server:**
```powershell
.\windows\dev-windows.ps1
```

For more details, see [`windows/HOW_TO_RUN_DEV.md`](./windows/HOW_TO_RUN_DEV.md).

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

### Debugging and Verification

After setting up the Python bridge, you can verify your environment is correctly configured:

**From the `web/` directory:**

```bash
yarn check:python
```

This script will:

- ✅ Test the `ping` command to verify the Python CLI is reachable
- ✅ Test the `list` command to check USB device enumeration
- ⚠️  Warn if PyUSB is not installed (shows fake device with serial "sorry-bro")
- 📋 Display connected USB vest devices if any are found

**Manual verification:**

You can also test the Python CLI directly:

```bash
# Test ping
python3 -m modern_third_space.cli ping

# List devices
python3 -m modern_third_space.cli list
```

For more details, see `web/README.md`.





## TODO

add a callback from python when commands are triggerred so the UI can display debugging tool when integrating games