# Changelog

All notable changes to this project are documented here.

This file helps AI assistants quickly understand recent project evolution.

---

## 2025-11-25

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

### Added
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

### Changed
- Replaced CLI-based Python communication with daemon
- Updated `preload.cjs` with `onDaemonEvent`, `onDaemonStatus`

---

## Architecture Evolution

```
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
- [ ] More game integrations (Superhot VR, Half-Life: Alyx)
- [ ] Effect patterns/presets system
- [ ] Daemon auto-start from Electron

