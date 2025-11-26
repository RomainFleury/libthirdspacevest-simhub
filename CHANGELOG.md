# Changelog

All notable changes to this project are documented here.

This file helps AI assistants quickly understand recent project evolution.

---

## 2025-11-26 (Latest)

### Added

- **SUPERHOT VR Integration** (`superhot-mod/`, `server/superhot_manager.py`)
  - C# MelonLoader mod with TCP client to daemon
  - 12 events: death, pistol/shotgun/uzi recoil, punch, throw, parry, mindwave
  - Hand-specific haptics (left/right side cells)
  - Python manager with event-to-haptic mapping
  - Daemon commands: `superhot_event`, `superhot_start`, `superhot_stop`, `superhot_status`
  - React UI panel with live event log
  - IPC handlers: `superhotHandlers.cjs`

- **SimHub Plugin** (`simhub-plugin/`)
  - C# plugin for SimHub telemetry platform
  - Supports 90+ sim racing games (iRacing, Assetto Corsa, F1, etc.)
  - TCP client connects to Python daemon (port 5050)
  - Effects: braking, acceleration, G-forces, impacts, gear shifts, rumble, ABS/TC
  - WPF settings UI with per-effect enable/intensity controls
  - Auto-reconnect and per-cell throttling

- **SimHub Integration Docs** (`docs-external-integrations-ideas/SIMHUB_IRACING_INTEGRATION.md`)
  - Research on SimHub plugin architecture
  - Telemetry data reference (GameData properties)
  - Effect-to-cell mapping design
  - Build and installation instructions

---

## 2025-11-25

### Added

- **Half-Life: Alyx Integration** (`server/alyx_manager.py`)
  - Console log file watcher (50ms polling)
  - Event parser for `[Tactsuit] {EventType|params}` format
  - Haptic mapper with directional damage support
  - Daemon commands: `alyx_start`, `alyx_stop`, `alyx_status`, `alyx_get_mod_info`
  - Events: `alyx_started`, `alyx_stopped`, `alyx_game_event`
  - UI panel with mod setup guide and download links
  - React hook: `useAlyxIntegration`

- **Modular IPC Handlers** (`web/electron/ipc/`)
  - Split handlers into `vestHandlers.cjs`, `daemonHandlers.cjs`, `cs2Handlers.cjs`, `alyxHandlers.cjs`
  - Centralized registration in `index.cjs`

- **All 8 Vest Actuators in UI**
  - Individual controls for cells 0-7 (front and back)
  - Preset buttons: All Front, All Back, Full Blast
  - Visual feedback (flashing) when actuator triggered

- **Alyx Integration Docs** (`docs-external-integrations-ideas/ALYX_INTEGRATION.md`)
  - Setup instructions with mod download links
  - Event-to-haptic mapping reference
  - Architecture comparison with CS2 GSI

---

## 2025-11-25 (Earlier)

### Added

- **CS2 GSI Integration** (`integrations/cs2_gsi.py`)
  - HTTP server receives Counter-Strike 2 game state
  - Event detection: damage, death, flash, bomb, kills, round start
  - Haptic mapping with intensity scaling
  - CLI: `cs2 start`, `cs2 status`, `cs2 generate-config`

- **Game Integrations Package** (`integrations/`)
  - `base.py`: `DaemonConnection` and `BaseGameIntegration` classes
  - Pattern for adding new game integrations as daemon clients

- **Daemon Lifecycle Management** (`server/lifecycle.py`)
  - PID file tracking in `/tmp/vest-daemon-{port}.pid`
  - CLI: `daemon start`, `daemon stop`, `daemon status`
  - Health check via `ping` command

- **Testing Documentation** (`modern-third-space/TESTING.md`)
  - curl examples for all daemon commands
  - Simulated CS2 payloads for testing without game
  - Python test scripts

- **CS2 Integration Guide** (`docs-external-integrations-ideas/CS2_INTEGRATION.md`)
  - Setup instructions
  - Event-to-haptic mapping reference
  - Troubleshooting guide

- **Cursor AI Support** (`.cursorrules`)
  - Project-specific instructions for Cursor AI
  - Architecture overview and code patterns

### Changed

- Updated `AI_ONBOARDING.md` with daemon commands and integrations package
- Updated `README.md` with daemon architecture diagram

---

## 2025-11-24 (Earlier Work)

### Added 2025-11-24

- **Python Vest Daemon** (`server/`)
  - TCP server on port 5050
  - JSON protocol for commands/events/responses
  - Client management and event broadcasting
  - Device selection state (select once, use everywhere)

- **Vest Package Refactoring** (`vest/`)
  - Isolated hardware control from UI/integrations
  - `controller.py`: Connection and commands
  - `status.py`: `VestStatus` dataclass
  - `discovery.py`: USB device enumeration

- **Daemon Protocol** (`server/protocol.py`)
  - Commands: `ping`, `list`, `select_device`, `connect`, `trigger`, `stop`, `status`
  - Events: `connected`, `disconnected`, `effect_triggered`, `device_selected`
  - Request/response matching with `req_id`

- **Electron Daemon Bridge** (`web/electron/daemonBridge.cjs`)
  - TCP client for daemon communication
  - Event forwarding to React UI via IPC

### Changed 2025-11-24

- Replaced CLI-based Python communication with daemon
- Updated `preload.cjs` with `onDaemonEvent`, `onDaemonStatus`

---

## Architecture Evolution

```text
Before (CLI-based):
  Electron → spawn Python CLI → Vest

After (Daemon-based):
  Electron ──┐
  CS2 GSI ───┼── TCP (5050) ──► Daemon ──► Vest
  Game Mods ─┘
```

---

## Upcoming / Ideas

- [ ] Configurable effect mapping (YAML/JSON)
- [ ] More game integrations (Superhot VR, etc.)
- [x] ~~Half-Life: Alyx integration~~ ✅ Done
- [ ] Effect patterns/presets system
- [ ] Daemon auto-start from Electron
