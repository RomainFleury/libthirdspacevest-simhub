# AI Integration Guide: Triggering Haptics for Drunkn Bar Fight via Electron-Python Bridge

## Purpose
This document is for AI/automation contributors and developers. It will evolve as Drunkn Bar Fight (DBF) integration details are explored, especially if it differs from other games such as CS2.

---

## 1. Project Structure & Key Files
- **Electron App (Node.js/JS):** `web/electron/`
    - `main.cjs`, `preload.cjs`: Electron lifecycle/entry
    - `pythonBridge.cjs`: IPC or socket communication with Python backend
- **Frontend:** `web/src/`
    - For any UI-originated triggers or feedback
- **Backend Python:**
    - Native or bridge code for haptic control (see `/modern-third-space`)

## 2. DBF Mod-Based Integration (vs. GSI for CS2)
- Drunkn Bar Fight does not natively support HTTP-based Game State Integration (GSI) as CS2 does. Haptic telemetry instead relies on a mod:
    - **bHaptics Integration Mod** (requires [MelonLoader](https://melonwiki.xyz/))
    - [DBF bHaptics Mod Page](https://www.nexusmods.com/drunknbarfight/mods/1)
- Mods inject logic into Unity to intercept and trigger events based on gameplay actions.

## 3. Mod Output/Event Extraction
- For custom telemetry/haptics workflow or Electron bridge:
    - Investigate if the mod exposes events or status (log files, memory, IPC, or local HTTP/socket APIs)
    - If the mod does not expose telemetry, you may need to extend the mod code (if open source) or capture events via log/console tailing.
- Typical mod event flows:
    - Log/console output: DBF mod may print event lines as actions occur (e.g., hits, grabs, special events)
    - File output: Some mods write recent telemetry to disk, which can be tailed by another process
    - In-memory or IPC: Less common but possible, check mod docs or code

## 4. General Integration Strategy

1. **Confirm Mod Installation**: Ensure the mod and MelonLoader are fully active in DBF (see README steps).
2. **Detect/Read Events**: Build/adapt Node/Electron code to continuously monitor (or poll) the event/log source:
    - Tailing a file, parsing log, or (if available) connecting to a custom IPC/local endpoint provided by the mod
3. **Bridge Logic**: (Same as other games)
    - Parse events, map to haptics triggers
    - Bridge to Python backend via IPC/socket
4. **Python Haptics Handler**: Pass these events to bHaptics control code and trigger effects

## 5. Troubleshooting & Adaptation
- If no direct bridgeable telemetry, manual code modification of the mod (or building a custom plugin) may be necessary to output events in a form usable by Electron/Python.
- Document all new methods and update this file for future teams.

## 6. Checklist
- [ ] MelonLoader and mod installed and verified working
- [ ] Documented method for reading/extracting haptic event data from DBF runtime
- [ ] Node/Electron parsers and mappers for mod event flow
- [ ] Functional Python haptic control bridge

---

**Document owner:** AI/Automation team. Update and refine as DBF mod handling and event output becomes better understood.
