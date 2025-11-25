# Counter-Strike 2 (CS2) Telemetry Setup Guide

This guide will walk you through setting up telemetry for the CS2 implementation using SimHub and bHaptics vest integrations.

**Notion page reference**: [Counter-Strike 2 bHaptics Setup](https://bhaptics.notion.site/Counter-Strike-2-2416d5724b8b804cb597ffd7db86c1c3)

## Table of Contents
1. Introduction
2. Prerequisites
3. Step-by-step Setup Instructions
4. Configuring Telemetry Data
5. Integration with SimHub & bHaptics
6. Using CounterStrike2GSI Library
7. C Integration Plans
8. Troubleshooting
9. References

---

Detailed instructions from the Notion guide will be added here as this page is updated. Contributions are welcome!

---

## 6. Using CounterStrike2GSI Library

[CounterStrike2GSI](https://github.com/antonpup/CounterStrike2GSI) is an open-source C# library to interface with Counter-Strike 2's Game State Integration (GSI). This library functions by listening for HTTP POST requests sent by CS2 on a configured local endpoint. These requests contain game state updates in JSON form.

### Key Features:
- Listens for HTTP POSTs from CS2's GSI system.
- Parses game state JSON into C# objects.
- Provides events like `NewGameState`, `BombStateUpdated`, etc.
- Allows subscribing to detailed game, player, round, and event states.

**Example Usage:**

```csharp
var gsl = new GameStateListener();
gsl.NewGameState += OnNewGameState;
gsl.Start();

void OnNewGameState(GameState gs)
{
    // Access parsed game state
}
```

For detailed integration steps, see the [official repo documentation](https://github.com/antonpup/CounterStrike2GSI) and explore event handling patterns for your telemetry or feedback needs.

## 7. C Integration Plans

Our project may require a native (C or C++) implementation or wrapper for broader platform and language support. Options include:
- Building a lightweight HTTP server in C or C++ mirroring the listener logic.
- Parsing CS2's GSI JSON posts directly into C/C++ data structures.
- Creating a cross-language bridge for native interop (e.g., with Python or C# apps).

This approach will help us:
- Enable low-level integration with legacy or performance-critical modules.
- Simplify cross-platform deployment and avoid mixed-runtime complexities.

Please contribute if you have experience or recommendations for native GSI integrations!

---

# Proposal: Modular "Games" Tab Integration (Electron UI ↔ Python Game Backends)

## 1. Overview
This design enables an Electron desktop app to manage multiple game integrations (CS:GO, CS2, etc.) using a unified "Games" tab UI. Selecting a game in the UI triggers a healthcheck or other commands (such as `ping`) for the specific Python integration, allowing modular, testable bridges for game telemetry, haptics, etc.

## 2. Workflow
- **Frontend (Electron/React):**
  - Add a "Games" tab listing supported games.
  - For each game, display actions ("Ping", "Status", "Start", etc.).
  - When an action is triggered, send an IPC message to the Electron backend (Node.js).

- **Backend (Electron Main Process):**
  - Listen for UI commands indicating the game/action selected.
  - Map the command to a specific Python CLI/module call (e.g., `python3 -m modern_third_space.cli ping` for CS2).
  - Execute the Python process, passing any required parameters.
  - Relay output/errors/status back to the frontend.

- **Python Game Backends:**
  - Each game exposes at least a `ping` or `helloworld` CLI/command (for health-check/extensibility).
  - (Optional) Use a unified CLI interface to expose more actions for future feature growth.

## 3. Example UI Workflow
1. User opens the "Games" tab and sees a list (CS:GO, CS2, ...).
2. User clicks "Ping" for CS2.
3. Electron backend runs: `python3 -m modern_third_space.cli ping`.
4. Python returns status. UI displays online/offline.

## 4. Rationale & Benefits
- **Extensible**: New games/additional integrations can be added without changing the core app logic.
- **Modular**: Python backend for each game can be developed and maintained independently.
- **Unified Diagnostics**: UI can centrally show the health/status of all game bridges.
- **Separation of Concerns**: Electron focuses on UX/orchestration; Python handles domain/game-specific logic.

## 5. Implementation Notes
- Store game integration metadata (name, CLI command, parameters, etc.) in a config/registry JSON for easy expansion.
- IPC in Electron can use `ipcMain.handle` to asynchronously respond to UI commands.
- Python scripts should emit simply parseable JSON or status lines for robust UI integration.

## 6. Future Extensions
- Add richer action support (start/stop, diagnostics, integration tests) per game.
- Dynamic discovery of available game integrations/modules.
- Auto-refresh or polling for live status updates.

---

See also: `AI_ONBOARDING.md` and `CounterStrikeGSI.md` for background on modular and bridgeable game telemetry workflows.