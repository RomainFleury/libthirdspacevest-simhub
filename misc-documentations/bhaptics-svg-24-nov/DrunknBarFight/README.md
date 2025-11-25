# Drunkn Bar Fight (DBF) Telemetry & Haptics Setup Guide

This document details the setup for enabling telemetry and bHaptics support for Drunkn Bar Fight (DBF) in SimHub or compatible environments.

**Notion page reference:** [Drunkn Bar Fight bHaptics Setup](https://bhaptics.notion.site/Drunkn-Bar-Fight-da64f83aadb34b41a005b7a0a8c877ee)

## Table of Contents
1. Introduction
2. Prerequisites
3. Step-by-step Setup Instructions
4. Configuring Telemetry & Data Sources
5. Integration with SimHub & bHaptics
6. Integration with Electron-Python Bridge
7. DBF bHaptics Mod Installation Guide
8. Troubleshooting
9. References

---

Detailed instructions from the Notion guide will be added/expanded as information becomes available. Contributions are welcome!

---

## 7. DBF bHaptics Mod Installation Guide

Unlike CS2 (which uses Game State Integration/GSI), Drunkn Bar Fight requires installation of a mod to enable haptics:

### 1. Install MelonLoader
- MelonLoader is required for loading community mods in Unity-based games like DBF.
- Download from [MelonLoader](https://melonwiki.xyz/) (v0.6.1 or higher).
- Install following the instructions for your DBF directory.

### 2. Download and Install the bHaptics Integration Mod
- Get the mod for DBF from [NexusMods Drunkn Bar Fight](https://www.nexusmods.com/drunknbarfight/mods/1).
- Use a version compatible with MelonLoader 0.6.1+ (mod v2.0.0 or later).
- Extract and place all files in the `Mods` folder inside your DBF install directory.

### 3. Set Up bHaptics Player
- Download from [bHaptics Player](https://www.bhaptics.com/download).
- Install and ensure all your devices (TactSuit, Tactosy, etc.) are detected.

### 4. Run the Game
- Start bHaptics Player.
- Launch DBF as usual. The mod will now activate haptics during gameplay.

### Troubleshooting/Help
- Ensure MelonLoader, the mod, and your device firmware are all up to date.
- For support, visit: [bHaptics Discord](https://discord.gg/tHB8StRX) or the mod page forums.

---

**Note:** DBF requires modding/unofficial support for telemetry. Integration with SimHub or a custom Electron/Python approach may require adaptation, such as reading events via a mod-provided API, files, or possible memory reading if exposed or supported.

See the Notion page and contribute findings as new techniques or changes become known.

---
