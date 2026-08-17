# Battle Sister Mod

MelonLoader mod that sends haptic events to the Third Space Vest daemon over TCP 5050.

**Status:** BETA — Harmony patches adapted from [BattleSister_bhaptics](https://github.com/floh-bhaptics/BattleSister_bhaptics).

Do **not** install `BattleSister_bhaptics.dll` from the NexusMods dump (`BattleSister_bhaptics.zip-1-2-0-0-1690973096`). That file talks to bHaptics Player. Install **`ThirdSpace_BattleSister.dll`**.

## Build

```powershell
cd battlesister-mod
./build.ps1
copy ThirdSpace_BattleSister\bin\Release\ThirdSpace_BattleSister.dll ..\mods\battlesister\
```

## Installation

1. Install MelonLoader 0.6.x+ into Battle Sister
2. Launch once so `Mods/` exists
3. In this app, select the game folder and click **Install Mod**
4. Start the daemon, click **Start**, then launch the game
