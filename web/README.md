# Web Debugger Workspace

This folder bundles everything related to the future Electron/React debugger as well as developer tooling (Repomix snapshots, etc.).

## Commands

1. `nvm use` (the `.nvmrc` pins Node `v25.2.1` to match our Electron toolchain).
2. `corepack enable` (once per machine) to allow shims for Yarn/Berry.
3. `yarn install` to install dependencies via Corepack-managed Yarn 4.

Daily commands:

```bash
# Run Vite dev server + Electron shell
yarn dev

# Build static renderer assets (Electron will load them in production mode)
yarn build

# Regenerate the combined repo snapshot
yarn repomix
```

## Debugging and Environment Setup

### Check Python Bridge Setup

Before starting the Electron app, verify your Python environment is correctly configured:

```bash
yarn check:python
```

This diagnostic script will:

- ✅ Test the `ping` command to verify the Python CLI is reachable
- ✅ Test the `list` command to check USB device enumeration
- ⚠️  Warn if PyUSB is not installed (shows fake device with serial "sorry-bro")
- 📋 Display connected USB vest devices if any are found
- 💡 Provide helpful error messages and setup guidance

**Example output:**

```text
🔍 Checking Python bridge setup...

1️⃣  Testing 'ping' command...
   ✅ Ping successful!

2️⃣  Testing 'list' command...
   ✅ List command successful!
   Found 1 device(s):
  ⚠️  Device 1:
    Serial: sorry-bro
    ⚠️  This is a fake device - PyUSB is not installed!

⚠️  WARNING: PyUSB is not installed!
```

**Troubleshooting:**

- If `ping` fails: The Python package may not be installed. Run `pip install -e .` from `../modern-third-space/`
- If `list` shows "sorry-bro": PyUSB is not installed. See `../modern-third-space/README.md` for installation instructions.
- If you see import errors: Make sure you've installed the package with `pip install -e .` from the `modern-third-space/` directory.

The Electron main process communicates with the Python bridge via CLI commands. The bridge is automatically detected on startup, and the UI will show connection status in real-time.
