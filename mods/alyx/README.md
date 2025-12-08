# Half-Life: Alyx Mod

This mod comes from NexusMods and requires manual download due to licensing.

## Download Source

**NexusMods:** https://www.nexusmods.com/halflifealyx/mods/6

Download the Scripts and Application archives.

## What to Place Here

After downloading from NexusMods:
- `tactsuit.lua` - Main haptic script
- Any other required Lua files

## Why Not Bundled Automatically?

The Alyx mod is created by a third party (floh-bhaptics) and distributed via NexusMods.
We link to it rather than redistribute to respect the original author's distribution preferences.

## Installation (for users)

1. Download mod from NexusMods link above
2. Extract Scripts archive to `Half-Life Alyx/game/hlvr/scripts/vscripts/`
3. Add `-condebug` to Steam launch options
4. Start the Third Space daemon
5. Launch Half-Life: Alyx

## Third Space Integration

The Third Space daemon reads `console.log` output from the mod's Lua scripts.
No additional files are needed - just install the original bHaptics mod and our daemon handles the rest.
