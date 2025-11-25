# AI Tool Onboarding

If you're an AI assistant working on this repository, follow these steps to get oriented.

## Cursor IDE Tips

If you're using **Cursor IDE**, these features will help you get context faster:

### Quick Context Loading
Use `@` references to load files directly into context:
```
@AI_ONBOARDING.md @.cursorrules @CHANGELOG.md
```

### Key Files to Reference
- `@.cursorrules` - Auto-loaded project rules (architecture, constraints, patterns)
- `@CHANGELOG.md` - Recent changes and what was modified
- `@modern-third-space/TESTING.md` - Test examples and curl commands
- `@docs-external-integrations-ideas/DAEMON_ARCHITECTURE.md` - Daemon protocol

### Generate Full Codebase Snapshot
```bash
cd web && yarn repomix
# Creates repomix-output.md with full codebase context
```

### Files Excluded from Context
See `.cursorignore` - excludes `legacy-do-not-change/`, `node_modules/`, cache files.

## Project Overview

This is a **Third Space Vest** haptic device debugger and development tool. The project maintains the original legacy driver code untouched while building modern tooling around it:

- **Legacy code**: `legacy-do-not-change/` - Historical C/Python USB driver (read-only)
- **Python bridge**: `modern-third-space/` - Modern Python wrapper that loads the legacy driver
- **Python daemon**: `modern-third-space/src/modern_third_space/server/` - TCP daemon for centralized vest control
- **Electron app**: `web/` - React/TypeScript debugger UI for testing and monitoring
- **Documentation**: `misc-documentations/` - Reference materials and archives
- **Integration strategies**: `docs-external-integrations-ideas/` - Strategies for integrating with games, mods, and external systems

## Critical Architecture: Python Daemon

The vest is controlled via a **long-running Python daemon** that:
- Maintains a single USB connection to the vest
- Accepts multiple TCP clients (Electron, game mods, scripts)
- Broadcasts all events to all connected clients
- Provides device selection state (set once, use everywhere)

```
Electron UI ──┐
Game Mod 1 ───┼── TCP (localhost:5050) ──► Python Daemon ──► Vest Hardware
Game Mod 2 ───┘
```

**Key files:**
- `server/daemon.py` - Main daemon loop
- `server/protocol.py` - JSON protocol (commands, events, responses)
- `server/client_manager.py` - Track connected clients
- `server/lifecycle.py` - Start/stop/status management

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

3. **Start the daemon (required for Electron app):**

   ```bash
   python3 -m modern_third_space.cli daemon start
   # Should print: ✅ Daemon started on 127.0.0.1:5050 (PID 12345)
   
   # Verify it's running:
   python3 -m modern_third_space.cli daemon status
   ```

4. **Check Node.js setup:**

   ```bash
   cd web
   yarn check:python
   # Should show Python bridge status and device list
   ```

5. **Generate repository snapshot:**

   ```bash
   cd web
   yarn repomix
   # Creates repomix-output.md with full codebase context
   ```

6. **Read the snapshot:**
   - Open `web/repomix-output.md`
   - Review the project structure, key files, and recent changes
   - Pay attention to:
     - Python daemon (`modern-third-space/src/modern_third_space/server/`)
     - Electron daemon bridge (`web/electron/daemonBridge.cjs`)
     - React components (`web/src/components/`)
     - Device selection and status management

7. **Review integration strategies** (if working on game/external integrations):
   - Check `docs-external-integrations-ideas/` for integration patterns
   - **Read `DAEMON_ARCHITECTURE.md`** for full protocol documentation
   - See `MELONLOADER_INTEGRATION_STRATEGY.md` for MelonLoader-based game mods
   - Review game-specific guides in `misc-documentations/bhaptics-svg-24-nov/[GameName]/`

## Key Commands Reference

**Python daemon (REQUIRED for Electron):**

```bash
python3 -m modern_third_space.cli daemon start      # Start daemon on port 5050
python3 -m modern_third_space.cli daemon status     # Check status + health
python3 -m modern_third_space.cli daemon stop       # Stop the daemon
python3 -m modern_third_space.cli daemon start --port 5051  # Custom port
```

**Python CLI (direct commands, no daemon):**

```bash
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

**Daemon protocol (for testing/debugging):**

```bash
# Send commands to daemon via netcat or Python
echo '{"cmd": "ping"}' | nc localhost 5050
echo '{"cmd": "list"}' | nc localhost 5050
echo '{"cmd": "select_device", "bus": 1, "address": 5}' | nc localhost 5050
```

**Game integrations (CS2):**

```bash
python3 -m modern_third_space.cli cs2 start           # Start CS2 GSI listener
python3 -m modern_third_space.cli cs2 status          # Check integration status
python3 -m modern_third_space.cli cs2 generate-config # Generate CS2 config file
```

## Important Constraints

- **Never modify** `legacy-do-not-change/` - This is historical code that must remain untouched
- **Python 2→3 compatibility**: The vendored legacy code in `modern-third-space/src/modern_third_space/legacy_port/` has been ported to Python 3
- **Device selection**: Users can select specific USB devices via the Electron UI; preferences are saved automatically
- **Setup detection**: The app detects when PyUSB is missing (shows "sorry-bro" fake device) and displays warnings

## Python Package Architecture

The `modern-third-space` package has a clear separation of concerns:

```
modern_third_space/
├── vest/                    # 🔒 CORE VEST HARDWARE (isolated)
│   ├── controller.py        # VestController - connection + commands
│   ├── status.py            # VestStatus dataclass
│   └── discovery.py         # list_devices() - USB scanning
├── server/                  # 🌐 TCP DAEMON
│   ├── daemon.py            # Main daemon loop, command handlers
│   ├── protocol.py          # JSON protocol (Command, Event, Response)
│   ├── client_manager.py    # Track connected TCP clients
│   └── lifecycle.py         # Start/stop/status management
├── integrations/            # 🎮 GAME INTEGRATIONS (daemon clients)
│   ├── base.py              # Base class for game integrations
│   └── cs2_gsi.py           # Counter-Strike 2 GSI integration
├── presets.py               # UI effect presets (NOT hardware code)
├── cli.py                   # CLI interface (daemon, cs2 subcommands)
├── legacy_adapter.py        # Legacy driver loader
└── legacy_port/             # Ported legacy code
```

### ⚠️ Isolation Principle

**The `vest/` package must remain isolated from:**
- Game integrations and listeners
- External interfaces (WebSocket, HTTP, etc.)
- UI-specific code or presets

**The `server/` package:**
- Imports from `vest/` to control hardware
- Provides TCP interface for external clients
- Broadcasts events to all connected clients

**When adding game integrations**, create a separate package (e.g., `integrations/` or `listeners/`) that imports from `vest/`. Never add integration code directly into `vest/`.

## Common Tasks

- **Adding a new daemon command**: Add to `protocol.py` (CommandType, EventType), implement handler in `daemon.py`
- **Adding a new CLI command**: Add handler in `cli.py`, expose via IPC in `web/electron/main.cjs`, add to `bridgeApi.ts`
- **Adding a UI component**: Create in `web/src/components/`, import in `web/src/App.tsx`
- **Debugging Python daemon**: `daemon status`, check logs, test with `echo '{"cmd":"ping"}' | nc localhost 5050`
- **Updating device info**: Modify `VestStatus` in `vest/status.py`, update TypeScript types, update UI components
- **Adding game integrations**: Create in `integrations/` (see `cs2_gsi.py` as example), integrate with daemon as TCP client
- **Reviewing integration strategies**: Check `docs-external-integrations-ideas/`, especially `DAEMON_ARCHITECTURE.md`, `CS2_INTEGRATION.md`, and `MELONLOADER_INTEGRATION_STRATEGY.md`

## Before Making Changes

1. Run `yarn repomix` to ensure you have the latest codebase context
2. Read relevant sections of `repomix-output.md`
3. Start the daemon: `python3 -m modern_third_space.cli daemon start`
4. Verify the setup works: `yarn check:python` from `web/` directory
5. Test your changes with `yarn dev` to see them in the Electron app

## Daemon Protocol Quick Reference

| Command | Description |
|---------|-------------|
| `{"cmd": "ping"}` | Health check, returns daemon state |
| `{"cmd": "list"}` | List USB devices |
| `{"cmd": "select_device", "bus": 1, "address": 5}` | Select a device |
| `{"cmd": "get_selected_device"}` | Get currently selected device |
| `{"cmd": "clear_device"}` | Clear device selection |
| `{"cmd": "connect"}` | Connect to selected device |
| `{"cmd": "disconnect"}` | Disconnect from device |
| `{"cmd": "trigger", "cell": 0, "speed": 5}` | Trigger effect |
| `{"cmd": "stop"}` | Stop all effects |
| `{"cmd": "status"}` | Get connection status |

Events are broadcast to ALL clients: `effect_triggered`, `connected`, `disconnected`, `device_selected`, etc.

See `docs-external-integrations-ideas/DAEMON_ARCHITECTURE.md` for full protocol documentation.

**Ready to proceed?** Start the daemon, review the repomix output, then wait for specific instructions from the user.

