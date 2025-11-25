# AI Tool Onboarding

If you're an AI assistant working on this repository, follow these steps to get oriented:

## Project Overview

This is a **Third Space Vest** haptic device debugger and development tool. The project maintains the original legacy driver code untouched while building modern tooling around it:

- **Legacy code**: `legacy-do-not-change/` - Historical C/Python USB driver (read-only)
- **Python bridge**: `modern-third-space/` - Modern Python wrapper that loads the legacy driver
- **Electron app**: `web/` - React/TypeScript debugger UI for testing and monitoring
- **Documentation**: `misc-documentations/` - Reference materials and archives

## First Steps Checklist

1. **Verify project structure:**

   ```bash
   ls -la legacy-do-not-change/ modern-third-space/ web/ misc-documentations/
   ```

2. **Check Python setup:**

   ```bash
   cd modern-third-space
   python3 -m modern_third_space.cli ping
   # Should return: {"status": "ok", "message": "Python bridge is reachable"}
   ```

3. **Check Node.js setup:**

   ```bash
   cd web
   yarn check:python
   # Should show Python bridge status and device list
   ```

4. **Generate repository snapshot:**

   ```bash
   cd web
   yarn repomix
   # Creates repomix-output.md with full codebase context
   ```

5. **Read the snapshot:**
   - Open `web/repomix-output.md`
   - Review the project structure, key files, and recent changes
   - Pay attention to:
     - Python bridge architecture (`modern-third-space/src/modern_third_space/`)
     - Electron IPC communication (`web/electron/`)
     - React components (`web/src/components/`)
     - Device selection and status management

## Key Commands Reference

**Python bridge:**

```bash
cd modern-third-space
python3 -m modern_third_space.cli ping      # Health check
python3 -m modern_third_space.cli list      # List USB devices
python3 -m modern_third_space.cli status    # Connection status
python3 -m modern_third_space.cli connect --bus X --address Y  # Connect to device
```

**Electron app:**

```bash
cd web
yarn dev                    # Start dev server + Electron
yarn dev:renderer          # Vite dev server only
yarn dev:electron          # Electron only
yarn check:python          # Verify Python setup
yarn repomix               # Generate codebase snapshot
```

## Important Constraints

- **Never modify** `legacy-do-not-change/` - This is historical code that must remain untouched
- **Python 2→3 compatibility**: The vendored legacy code in `modern-third-space/src/modern_third_space/legacy_port/` has been ported to Python 3
- **Device selection**: Users can select specific USB devices via the Electron UI; preferences are saved automatically
- **Setup detection**: The app detects when PyUSB is missing (shows "sorry-bro" fake device) and displays warnings

## Common Tasks

- **Adding a new CLI command**: Add handler in `modern-third-space/src/modern_third_space/cli.py`, expose via IPC in `web/electron/main.cjs`, add to `bridgeApi.ts`
- **Adding a UI component**: Create in `web/src/components/`, import in `web/src/App.tsx`
- **Debugging Python bridge**: Use `yarn check:python` or test CLI commands directly
- **Updating device info**: Modify `VestStatus` in `controller.py`, update TypeScript types, update UI components

## Before Making Changes

1. Run `yarn repomix` to ensure you have the latest codebase context
2. Read relevant sections of `repomix-output.md`
3. Verify the setup works: `yarn check:python` from `web/` directory
4. Test your changes with `yarn dev` to see them in the Electron app

**Ready to proceed?** Review the repomix output, then wait for specific instructions from the user.

