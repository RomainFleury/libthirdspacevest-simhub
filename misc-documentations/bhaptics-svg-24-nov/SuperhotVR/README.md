# SUPERHOT VR Telemetry & Haptics Setup Guide

This document details the setup for enabling telemetry and OWO haptics support for SUPERHOT VR using MelonLoader mod integration.

**Official OWO page reference:** [SUPERHOT VR - OWO Game](https://owogame.com/game/superhot-vr/)

## Table of Contents

1. Introduction
2. Prerequisites
3. Step-by-step Setup Instructions
4. Configuring Telemetry & Data Sources
5. Integration with SimHub & Haptics
6. Integration with Electron-Python Bridge
7. SUPERHOT VR OWO Mod Installation Guide
8. Troubleshooting
9. References

---

## 1. Introduction

SUPERHOT VR is a first-person shooter where time moves only when you move. This integration adds haptic feedback support using the OWO haptic vest system through a MelonLoader-based mod, allowing players to feel impacts, gunshots, and other in-game events.

**Platform Compatibility:** PCVR (Steam, Epic Games)  
**Mod Type:** MelonLoader  
**Haptics System:** OWO

---

## 2. Prerequisites

- **SUPERHOT VR** installed via Steam or Epic Games
- **MelonLoader** (latest version compatible with SUPERHOT VR)
- **OWO haptic vest** and OWO Player software
- Access to the mod files (GitHub or Nexus Mods)

---

## 3. Step-by-step Setup Instructions

### 3.1 Install MelonLoader

1. Download MelonLoader from the [official MelonLoader website](https://melonwiki.xyz/)
2. Install MelonLoader following the instructions for your SUPERHOT VR installation directory
3. Verify installation by checking for the `MelonLoader` folder in your game directory

### 3.2 Download the OWO Mod

The mod can be downloaded from:

- **GitHub Releases:** [OWO_SuperhotVR Releases](https://github.com/OWODevelopers/OWO_SuperhotVR/releases) - Download the latest release (currently v1.0.0)
- **GitHub Repository:** [OWO_SuperhotVR](https://github.com/OWODevelopers/OWO_SuperhotVR) - Source code and issue tracking
- **Nexus Mods:** Available in the OWO Nexus Mods profile

### 3.3 Install the Mod

1. Download the latest release of the mod
2. Extract the mod zip file
3. Place **all files and the `owo` folder** into the `Mods` directory of your SUPERHOT VR installation:

   ```text
   ..\SUPERHOT VR\Mods\
   ```

4. Ensure the mod structure is correct (files should be directly in `Mods` or in the appropriate subfolder as specified by the mod)

### 3.4 Launch and Verify

1. Start OWO Player software and ensure your haptic vest is connected
2. Launch SUPERHOT VR as usual
3. The mod should automatically activate when the game loads
4. Test haptic feedback during gameplay (dodge bullets, take hits, etc.)

---

## 7. SUPERHOT VR OWO Mod Installation Guide

### Quick Installation Steps

1. **Install MelonLoader**

   - Download from [MelonLoader](https://melonwiki.xyz/)
   - Follow installation instructions for SUPERHOT VR

2. **Download the Mod**

   - Get the latest release from [GitHub Releases](https://github.com/OWODevelopers/OWO_SuperhotVR/releases) (v1.0.0 or later)
   - Alternative: Download from Nexus Mods or check the [OWO Game page](https://owogame.com/game/superhot-vr/)
   - Use the latest release compatible with your game version

3. **Extract and Install**

   - Extract the mod zip file
   - Place all files and the `owo` folder into: `..\SUPERHOT VR\Mods`
   - Ensure proper folder structure is maintained

4. **Run the Game**
   - Start OWO Player
   - Launch SUPERHOT VR
   - Enjoy haptic feedback during gameplay! ⏳🔫

### Troubleshooting/Help

- Ensure MelonLoader, the mod, and OWO Player are all up to date
- Verify the mod files are in the correct `Mods` directory
- Check that OWO Player is running before launching the game
- For support, visit:
  - [OWO Discord community](https://discord.gg/owogame) (if available)
  - [OWO Game Support](https://owogame.com/) contact page
  - Mod's GitHub issues page

---

## 4. Configuring Telemetry & Data Sources

SUPERHOT VR uses a mod-based integration (similar to Drunkn Bar Fight) rather than native Game State Integration (GSI) like CS2. The mod intercepts in-game events and triggers haptic feedback accordingly.

**Note:** For custom telemetry workflows or SimHub integration, you may need to:

- Investigate if the mod exposes events or status (log files, memory, IPC, or local HTTP/socket APIs)
- Extend the mod code (if open source) to output telemetry data
- Capture events via log/console tailing if available

**📋 Integration Strategy:** For comprehensive strategies on integrating MelonLoader-based games with the Third Space Vest system, see [`docs-external-integrations-ideas/MELONLOADER_INTEGRATION_STRATEGY.md`](../../../../docs-external-integrations-ideas/MELONLOADER_INTEGRATION_STRATEGY.md). This document outlines multiple approaches (file logging, HTTP/WebSocket, IPC) and implementation phases.

---

## 5. Integration with SimHub & Haptics

The OWO mod for SUPERHOT VR directly interfaces with the OWO Player software. For SimHub integration or other haptic systems:

1. Check if the mod provides telemetry output that can be intercepted
2. Map game events to haptic patterns using SimHub's event system
3. Bridge mod events to your haptic control system (see Electron-Python Bridge section)

---

## 6. Integration with Electron-Python Bridge

For custom integration with the Electron-Python bridge architecture:

1. **Confirm Mod Installation**: Ensure the mod and MelonLoader are fully active in SUPERHOT VR
2. **Detect/Read Events**: Build/adapt Node/Electron code to monitor event sources:
   - Tailing log files if the mod outputs events
   - Parsing console output
   - Connecting to custom IPC/local endpoints (if the mod provides them)
3. **Bridge Logic**: Parse events, map to haptic triggers, and bridge to Python backend
4. **Python Haptics Handler**: Pass events to haptic control code and trigger effects

See `haptics_electron_python_bridge.md` for detailed implementation guidance.

---

## 8. Troubleshooting

### Common Issues

- **Mod not loading**: Verify MelonLoader installation and mod file placement
- **No haptic feedback**: Ensure OWO Player is running and vest is connected
- **Game crashes**: Check mod compatibility with your game version
- **Missing files**: Verify all mod files and the `owo` folder are in the `Mods` directory

### Getting Help

- Check the [GitHub repository](https://github.com/OWODevelopers/OWO_SuperhotVR) for known issues and source code
- Report issues on the [GitHub Issues page](https://github.com/OWODevelopers/OWO_SuperhotVR/issues)
- Visit the OWO Discord community
- Contact OWO support through their website
- Review MelonLoader documentation for troubleshooting

---

## 9. References

- **GitHub Repository:** [OWO_SuperhotVR](https://github.com/OWODevelopers/OWO_SuperhotVR)
- **GitHub Releases:** [OWO_SuperhotVR Releases](https://github.com/OWODevelopers/OWO_SuperhotVR/releases) - Download mod files here
- **OWO Game Page:** [SUPERHOT VR - OWO Game](https://owogame.com/game/superhot-vr/)
- **MelonLoader:** [MelonLoader Wiki](https://melonwiki.xyz/)
- **SUPERHOT VR:** [Steam Store](https://store.steampowered.com/app/617830/SUPERHOT_VR/) | [Epic Games](https://www.epicgames.com/store/en-US/p/superhot-vr)
- **OWO Hardware:** [OWO Shop](https://owogame.com/shop/)

---

**Note:** This documentation will be updated as more information becomes available about telemetry extraction, mod internals, and integration patterns. Contributions are welcome!
