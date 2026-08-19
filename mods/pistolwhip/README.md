# Pistol Whip Mod

MelonLoader mod that sends haptic events to the Third Space Vest daemon over TCP 5050.

**Status:** BETA — Harmony patches are adapted from the archived bHaptics/OWO investigation and have not been verified in-game yet.

## What to install

Install **`ThirdSpace_PistolWhip.dll`** into `Pistol Whip/Mods/`.

Do **not** install `PistolWhip_bhaptics.dll` from the NexusMods dump. That file is the original Tactsuit mod (bHaptics Player). It was the Harmony-patch reference for our C# source; it does not talk to this daemon.

## Source and reference

- Our MelonLoader project: `pistolwhip-mod/` (copied from the archived investigation)
- Investigation notes: `misc-documentations/achived-untested-mods/pistolwhip-mod/README.md`
- Original bHaptics DLL dump: `misc-documentations/achived-untested-mods/pistolwhip-mod/bHaptics-nexusmods/PistolWhip_bhaptics.zip-1-2-0-1-1692419467/`

## Building

Needs MelonLoader 0.6+ already installed in Pistol Whip (uses `MelonLoader/net6/*.dll`) and a .NET 6 or 8 SDK.

```powershell
cd pistolwhip-mod
./build.ps1 -GameDir "F:\SteamLibrary\steamapps\common\Pistol Whip"
```

That writes `ThirdSpace_PistolWhip.dll` into this folder. **Install Mod** in the Electron UI copies it into the game `Mods/` directory (and will try to build first if the DLL is missing).

## Installation

1. Install [MelonLoader 0.6.x or 0.7.x](https://github.com/LavaGang/MelonLoader/releases) into Pistol Whip
2. Launch the game once so MelonLoader creates `Mods/`
3. In this app, select the Pistol Whip folder and click **Install Mod**
4. Start the Third Space Vest daemon (TCP 5050)
5. Open Pistol Whip in this app, click **Start**, then launch the game

Optional remote daemon: create `Pistol Whip/Mods/ThirdSpace_Config.txt` with `IP` or `IP:PORT`.
