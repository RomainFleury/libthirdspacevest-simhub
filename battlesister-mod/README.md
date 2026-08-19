# Third Space Vest - Battle Sister Mod

MelonLoader mod that sends haptic events to the Third Space Vest daemon (TCP 5050).

Harmony patches are adapted from [BattleSister_bhaptics](https://github.com/floh-bhaptics/BattleSister_bhaptics). The NexusMods file `BattleSister_bhaptics.dll` talks to bHaptics Player — do not install it for this vest.

## Prerequisites

1. Warhammer 40,000: Battle Sister (Steam App ID 1733890)
2. MelonLoader 0.6.x+
3. Third Space Vest daemon on port 5050

## Build

Needs a .NET 6 or 8 SDK. If MelonLoader is installed in Battle Sister, pass that folder:

```powershell
./build.ps1 -GameDir "C:\path\to\Battle Sister"
```

Otherwise the script can compile against another game's `MelonLoader\net6` (same MelonLoader/Harmony DLLs). Copy `..\mods\battlesister\ThirdSpace_BattleSister.dll` into `Battle Sister/Mods/` after MelonLoader is installed, or use **Install Mod** in the Electron UI.
