# External Integration Ideas & Strategies

This folder contains documentation and strategies for integrating the Third Space Vest with external systems, games, and platforms.

## Purpose

These documents outline approaches, patterns, and implementation strategies for connecting the Third Space Vest to various external systems beyond the core debugger functionality. This includes:

- Game integrations (via mods, APIs, telemetry)
- Platform integrations (SimHub, other haptic systems)
- Protocol bridges and adapters
- Event streaming and telemetry systems

## Contents

### Core Architecture

- **`DAEMON_ARCHITECTURE.md`** - Centralized Python daemon for vest control
  - TCP server accepting multiple clients (UI, game mods, scripts)
  - JSON-based protocol for commands and events
  - Event broadcasting (UI sees all activity, including from game mods)
  - Client examples in Python, C#, Node.js
  - Implementation phases

- **`EFFECTS_LIBRARY.md`** - Predefined haptic effects from TN Games SDK
  - 28 effects across 5 categories (Weapons, Impacts, Melee, Driving, Special)
  - Effect pattern definitions and cell mappings
  - Daemon protocol: `play_effect`, `list_effects`, `stop_effect`
  - UI panel with categorized effect buttons
  - ✅ **IMPLEMENTED**

- **`CELL_MAPPING_AUDIT.md`** - Hardware cell layout documentation
  - Correct cell indices from reverse engineering
  - Audit of game integration implementations
  - Central `cell_layout.py` module reference

### Game Integration Strategies

- **`CS2_INTEGRATION.md`** - Counter-Strike 2 integration via Game State Integration (GSI)
  - Uses Valve's official HTTP-based GSI API
  - No mods required - config file only
  - Embedded in daemon for real-time event broadcasting
  - ✅ **IMPLEMENTED**

- **`CS2_UI_INTEGRATION.md`** - Electron UI for managing CS2 GSI
  - Start/stop GSI server from UI
  - Config file generation and path management
  - Live event display
  - ✅ **IMPLEMENTED**

- **`ALYX_INTEGRATION.md`** - Half-Life: Alyx integration via console log parsing
  - No official API - requires Lua script mods (download links provided)
  - Parses [Tactsuit] events from console.log
  - Directional damage support (angle-based)
  - 50+ game events available
  - Embedded in daemon with UI panel
  - ✅ **IMPLEMENTED**

- **`SIMHUB_IRACING_INTEGRATION.md`** - SimHub integration for 90+ sim racing games
  - C# plugin using SimHub SDK (IDataPlugin interface)
  - Supports iRacing, Assetto Corsa, F1, Forza, BeamNG, etc.
  - TCP connection to Python daemon (port 5050)
  - Effects: braking, acceleration, G-forces, impacts, gear shifts, rumble
  - WPF settings UI with intensity controls
  - ✅ **IMPLEMENTED** - See `simhub-plugin/`

- **`SUPERHOTVR_INTEGRATION.md`** - SUPERHOT VR integration via MelonLoader mod
  - Fork of OWO_SuperhotVR mod with TCP client instead of OWO SDK
  - 12 events: death, gunfire (pistol/shotgun/uzi), punch, throw, parry, mindwave
  - Hand-specific haptics (left/right)
  - Direct TCP connection to daemon (lower latency than OWO)
  - ✅ **IMPLEMENTED** - See `superhot-mod/`

- **`PISTOLWHIP_INTEGRATION.md`** - Pistol Whip integration via MelonLoader mod
  - Rhythm-based VR shooter by Cloudhead Games
  - ~10 events: gun fire, shotgun, melee, reload (3 types), hit, death, healing
  - Hand-specific haptics with dual-wield support
  - Source available: bHaptics and OWO GitHub repos
  - 📋 **PLANNED** - Ready for implementation

- **`DEEP_ROCK_GALACTIC_INTEGRATION.md`** - Deep Rock Galactic integration via UE4 Blueprint mod
  - 1-4 player co-op FPS/mining game by Ghost Ship Games
  - Unreal Engine 4 with official mod.io support
  - Existing bHaptics mod provides reference implementation
  - 4 classes (Scout, Driller, Engineer, Gunner) with unique weapons
  - Events: damage, weapon fire, mining, drilling, fall damage, shields, hazards
  - Directional damage support using attacker position
  - 📋 **RESEARCH COMPLETE** - Strategy documented, ready for implementation

- **`MELONLOADER_INTEGRATION_STRATEGY.md`** - Comprehensive strategy for integrating MelonLoader-based game mods (Unity games like SUPERHOT VR, Drunkn Bar Fight, etc.)
  - Multiple integration approaches (file logging, HTTP/WebSocket, IPC)
  - Event mapping strategies
  - Implementation phases and recommendations
  - Based on analysis of OWO_SuperhotVR mod

### Future Additions

This folder will grow as new integration strategies are developed for:
- Other game modding frameworks
- Native game APIs (GSI, etc.)
- SimHub plugins
- Other haptic device bridges

## Usage

These documents are reference materials for:
- **Developers** implementing new integrations
- **AI assistants** understanding integration patterns
- **Contributors** planning new features

When starting a new integration:
1. Review relevant strategy documents here
2. Check `misc-documentations/` for game-specific setup guides
3. Follow the implementation phases outlined in the strategy documents

## Related Documentation

- **Game-specific setup guides**: `misc-documentations/bhaptics-svg-24-nov/[GameName]/`
- **Project architecture**: See `AI_ONBOARDING.md` and `README.md`
- **Python bridge**: `modern-third-space/README.md`
- **Electron app**: `web/README.md`

