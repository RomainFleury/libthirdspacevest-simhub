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

The Electron main process expects the Python bridge (see `../modern-third-space`) to be running on `http://localhost:4789`. Until the bridge is online, the UI falls back to a demo mode and marks the USB status as disconnected.
