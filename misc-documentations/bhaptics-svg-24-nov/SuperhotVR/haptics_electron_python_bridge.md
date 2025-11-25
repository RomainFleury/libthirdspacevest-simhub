# AI Integration Guide: Triggering Haptics for SUPERHOT VR via Electron-Python Bridge

## Purpose
This document is for AI/automation contributors and developers. It will evolve as SUPERHOT VR integration details are explored, especially regarding mod-based event extraction and telemetry workflows.

---

## 1. Project Structure & Key Files
- **Electron App (Node.js/JS):** `web/electron/`
    - `main.cjs`, `preload.cjs`: Electron lifecycle/entry
    - `pythonBridge.cjs`: IPC or socket communication with Python backend
- **Frontend:** `web/src/`
    - For any UI-originated triggers or feedback
- **Backend Python:**
    - Native or bridge code for haptic control (see `/modern-third-space`)

---

## 2. SUPERHOT VR Mod-Based Integration (vs. GSI for CS2)
- SUPERHOT VR does not natively support HTTP-based Game State Integration (GSI) as CS2 does. Haptic telemetry relies on a mod:
    - **OWO Integration Mod** (requires [MelonLoader](https://melonwiki.xyz/))
    - **GitHub Repository:** [OWO_SuperhotVR](https://github.com/OWODevelopers/OWO_SuperhotVR)
    - **GitHub Releases:** [OWO_SuperhotVR Releases](https://github.com/OWODevelopers/OWO_SuperhotVR/releases) - Download mod files and view source code
    - Mod also available on [Nexus Mods](https://www.nexusmods.com/) (check OWO profile)
    - [OWO Game Page](https://owogame.com/game/superhot-vr/)
- Mods inject logic into Unity to intercept and trigger events based on gameplay actions (hits, gunshots, dodges, etc.).

---

## 3. Mod Output/Event Extraction
- For custom telemetry/haptics workflow or Electron bridge:
    - **Investigate mod source code**: The mod source code is available on [GitHub](https://github.com/OWODevelopers/OWO_SuperhotVR) - examine how it captures events and interfaces with OWO Player
    - **Log/console output**: The mod may print event lines as actions occur (e.g., hits, dodges, gunshots, time manipulation events)
    - **File output**: Some mods write recent telemetry to disk, which can be tailed by another process
    - **In-memory or IPC**: Check if the mod exposes a local HTTP endpoint, WebSocket, or named pipe for event streaming
    - **OWO Player API**: Investigate if OWO Player exposes an API that can be queried for active effects/events

---

## 4. General Integration Strategy

1. **Confirm Mod Installation**: Ensure the OWO mod and MelonLoader are fully active in SUPERHOT VR (see README steps).

2. **Detect/Read Events**: Build/adapt Node/Electron code to continuously monitor (or poll) the event/log source:
    - Tailing a file if the mod writes events to disk
    - Parsing log/console output
    - Connecting to a custom IPC/local endpoint provided by the mod (if available)
    - Interfacing with OWO Player API if it exposes event data

3. **Bridge Logic**: (Same as other games)
    - Parse events (hits, gunshots, dodges, time manipulation, etc.)
    - Map to haptic triggers and intensity levels
    - Bridge to Python backend via IPC/socket

4. **Python Haptics Handler**: Pass these events to haptic control code and trigger effects on the Third Space Vest or other compatible devices.

---

## 5. SUPERHOT VR Specific Events

Based on the game mechanics, potential events to capture:
- **Player hit/damage**: Directional feedback for impacts
- **Gunfire**: Weapon recoil and firing sensations
- **Bullet dodges**: Feedback when successfully avoiding projectiles
- **Time manipulation**: Effects related to time slowing/speeding
- **Enemy interactions**: Hits on enemies, melee attacks
- **Environmental interactions**: Object grabs, throws, impacts
- **Game state changes**: Level transitions, checkpoint saves

---

## 6. Troubleshooting & Adaptation

- If no direct bridgeable telemetry, manual code modification of the mod (or building a custom plugin) may be necessary to output events in a form usable by Electron/Python.
- Consider creating a wrapper or proxy that intercepts OWO Player communications if the mod communicates directly with OWO Player.
- Document all new methods and update this file for future teams.

---

## 7. Checklist

- [ ] MelonLoader and OWO mod installed and verified working
- [ ] Documented method for reading/extracting haptic event data from SUPERHOT VR runtime
- [ ] Investigated mod source code (if available) for event capture mechanisms
- [ ] Explored OWO Player API for event/status endpoints
- [ ] Node/Electron parsers and mappers for mod event flow
- [ ] Functional Python haptic control bridge
- [ ] Tested event mapping for key game actions (hits, gunshots, dodges)

---

## 8. Future Enhancements

- **Real-time event streaming**: If mod supports it, implement WebSocket or HTTP streaming for low-latency feedback
- **Event replay**: Log events for debugging and pattern analysis
- **Custom effect mapping**: Allow users to customize haptic patterns per event type
- **Performance monitoring**: Track event frequency and haptic trigger latency

---

**Document owner:** AI/Automation team. Update and refine as SUPERHOT VR mod handling and event output becomes better understood.

**Related Documentation:**
- **📋 Integration Strategy:** See `../../../../docs-external-integrations-ideas/MELONLOADER_INTEGRATION_STRATEGY.md` for comprehensive integration approaches and implementation plans
- See `README.md` for installation and setup instructions
- See `../DrunknBarFight/haptics_electron_python_bridge.md` for similar MelonLoader-based integration patterns
- See `../CS2/` for GSI-based integration examples (different approach)

**GitHub Resources:**
- **Repository:** [OWO_SuperhotVR](https://github.com/OWODevelopers/OWO_SuperhotVR)
- **Releases:** [OWO_SuperhotVR Releases](https://github.com/OWODevelopers/OWO_SuperhotVR/releases)
- **Issues:** [Report issues or view known problems](https://github.com/OWODevelopers/OWO_SuperhotVR/issues)

