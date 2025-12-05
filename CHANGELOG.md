# Changelog

All notable changes to this project are documented here.

This file helps AI assistants quickly understand recent project evolution.

---

## 2025-12-05 (Latest)

### Added

- **Unreal Tournament Integration** - Game log-based haptic feedback for arena combat
  - **Supported Games**: UT Alpha (2014), UT3, UT2004, UT99
  - **Integration Method**: Log file watching (similar to Half-Life: Alyx)
    - Monitors game log for haptic events
    - Optional ThirdSpaceVest mutator for enhanced events
    - Native log parsing fallback for basic events
  - **Python Manager**: `server/ut_manager.py`
    - `UTLogWatcher`: Tails game log with 50ms polling
    - Parses both ThirdSpace mutator format and native log events
    - Directional damage mapping (angle → cells)
    - Damage intensity scaling
  - **Haptic Events**:
    - Core: Player damage (directional), player death, weapon fire, reload
    - Movement: Dodge direction, jump boots, translocator
    - Arena: Killing sprees, multi-kills, headshots
    - CTF: Flag grabs, captures, returns
    - Pickups: Health, armor, power-ups
  - **Daemon Protocol**: Added `ut_start`, `ut_stop`, `ut_status` commands
    - Events: `ut_started`, `ut_stopped`, `ut_game_event`
  - **Electron UI**: Complete integration panel
    - Status display (running, events received)
    - Log path configuration with browse button
    - Auto-detection for multiple UT versions
    - Real-time event feed with icons
    - Setup guide with supported games list
  - **IPC Handlers**: `utHandlers.cjs` with electron-store for settings
  - **Documentation**: `docs-external-integrations-ideas/UT_INTEGRATION.md`
  - **Status**: Complete and ready for testing

---

## 2025-11-27

### Added

- **Pistol Whip Integration** - Complete MelonLoader mod integration for Pistol Whip
  - Reused existing bHaptics/OWO mod Harmony patches, adapted for Third Space Vest daemon
  - **Mod Features**:
    - Gun fire (pistol & shotgun) with hand-specific recoil feedback
    - Reload detection (hip & shoulder) with position-specific haptics
    - Melee hit detection with hand-specific impact feedback
    - Player hit detection (chest impact when getting shot)
    - Death detection (full body pulse)
    - Low health heartbeat pulse
    - Healing feedback (warmth spread)
    - Empty gun fire detection (subtle click feedback)
  - **Mod Files**: `pistolwhip-mod/ThirdSpace_PistolWhip/` (C# MelonLoader project)
    - `ThirdSpace_PistolWhip.cs`: Main mod with Harmony patches
    - `DaemonClient.cs`: TCP client for daemon communication (reused from SUPERHOT)
  - **Python Manager**: `server/pistolwhip_manager.py`
    - Processes all Pistol Whip game events
    - Hand-specific cell mapping (left/right)
    - Intensity scaling (shotgun stronger than pistol)
  - **Daemon Protocol**: Added `pistolwhip_event`, `pistolwhip_start`, `pistolwhip_stop`, `pistolwhip_status` commands
  - **Electron UI**: Complete integration panel with live event log
    - Status display (enabled/disabled, events received)
    - Enable/disable controls
    - Real-time event feed with icons
    - Mod installation instructions
  - **Build System**: 
    - `pistolwhip-mod/build.ps1` - Individual mod build script
    - Integrated into unified `build-all-mods.ps1` script
  - **Documentation**: `docs-external-integrations-ideas/PISTOLWHIP_INTEGRATION.md`
  - **Status**: Complete and ready for testing

- **Unified Build Script** - `build-all-mods.ps1` for building all mods
  - Builds SUPERHOT VR, GTA V, Pistol Whip, and SimHub plugin
  - Supports selective builds (`-Mods superhot,gta5`)
  - Auto-detects MSBuild and checks prerequisites
  - Uses mod-specific build scripts when available
  - **Documentation**: `BUILD.md` with usage examples

- **GTA V Integration (Phase 1)** - Script Hook V .NET mod for Grand Theft Auto V
  - Player damage detection with directional haptic feedback (angle-based cell mapping)
  - Player death detection with full vest pulse (all cells, max intensity)
  - Damage intensity scaling (damage amount → haptic speed 1-10)
  - TCP client connects to Python daemon (port 5050)
  - Auto-connect on mod startup with in-game connection status notifications
  - **Mod Files**: `gta5-mod/ThirdSpaceGTAV/` (C# Script Hook V .NET project)
    - `ThirdSpaceGTAV.cs`: Main mod entry point
    - `DaemonClient.cs`: TCP client for daemon communication
    - `EventHooks.cs`: Player damage/death detection
    - `HapticMapper.cs`: Angle-to-cells and damage-to-intensity mapping
  - **Python Manager**: `server/gtav_manager.py`
    - Processes `player_damage` and `player_death` events
    - Maps damage angles (0-360°) to directional vest cells
    - Scales intensity based on damage amount
  - **Daemon Protocol**: Added `gtav_event`, `gtav_start`, `gtav_stop`, `gtav_status` commands
  - **Build System**: `build.ps1` script for automated building
  - **Documentation**: `docs-external-integrations-ideas/GTAV_INTEGRATION.md` (strategy and setup guide)
  - **Status**: Phase 1 complete (damage/death). Vehicle events deferred to Phase 2.

- **Effects Library** - Predefined haptic patterns from TN Games SDK
  - 28 effects across 5 categories: Weapons, Impacts, Melee, Driving, Special
  - `vest/effects.py`: Effect pattern definitions using `HapticEffect` dataclass
  - Daemon commands: `play_effect`, `list_effects`, `stop_effect`
  - React UI panel with collapsible categories and play buttons
  - **Files**: `effects.py`, `effectsHandlers.cjs`, `EffectsLibraryPanel.tsx`
  - **Docs**: See [`docs-external-integrations-ideas/EFFECTS_LIBRARY.md`](docs-external-integrations-ideas/EFFECTS_LIBRARY.md) for details

- **Cell Layout Fixes** - Corrected hardware cell mapping across all integrations
  - Central `vest/cell_layout.py` module with correct hardware indices
  - Updated CS2, Alyx, and SUPERHOT managers to use shared constants
  - **Docs**: See [`docs-external-integrations-ideas/CELL_MAPPING_AUDIT.md`](docs-external-integrations-ideas/CELL_MAPPING_AUDIT.md)

- **SimHub Plugin Cell Mapping** - Corrected `VestCells` constants to match hardware
  - `HapticCommand.cs`: Fixed all 8 cell indices based on reverse engineering
  - Updated cell groups (`AllFront`, `AllBack`, `LeftSide`, etc.) to use named constants
  - Now consistent with Python `cell_layout.py` module

### Fixed

- **SUPERHOT VR IPC Handlers** - Fixed `sendCommand is not a function` error
  - `superhotHandlers.cjs`: Use `getDaemonBridge()` and specific methods (`superhotStart()`, etc.)
  - Was incorrectly trying to call non-existent `sendCommand()` method

- **Effects Library IPC Handlers** - Fixed daemon instance timing
  - `effectsHandlers.cjs`: Get daemon instance inside each handler, not at registration time

- **useSuperHotIntegration Hook** - Fixed invalid import
  - Removed non-existent `onDaemonEvent` import from `bridgeApi.ts`
  - Use `window.vestBridge.onDaemonEvent` directly like other hooks

---

## 2025-11-26

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
- [x] ~~SUPERHOT VR integration~~ ✅ Done
- [x] ~~Half-Life: Alyx integration~~ ✅ Done
- [x] ~~Effect patterns/presets system~~ ✅ Done (Effects Library)
- [x] ~~GTA V integration (Phase 1)~~ ✅ Done (damage/death)
- [x] ~~Unreal Tournament integration~~ ✅ Done (log watching)
- [ ] GTA V Phase 2: Vehicle events (crashes, G-forces, acceleration/braking)
- [ ] Daemon auto-start from Electron
- [ ] Pistol Whip integration (planned)
