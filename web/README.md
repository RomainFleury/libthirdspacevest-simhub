# Web Debugger Workspace

This folder bundles everything related to the future Electron/React debugger as well as developer tooling (Repomix snapshots, etc.).

## Commands

```bash
# Install dependencies
npm install

# Run Vite dev server + Electron shell
npm run dev

# Build static renderer assets (Electron will load them in production mode)
npm run build

# Regenerate the combined repo snapshot
npm run repomix
```

The Electron main process expects the Python bridge (see `../modern-third-space`) to be running on `http://localhost:4789`. Until the bridge is online, the UI falls back to a demo mode and marks the USB status as disconnected.
