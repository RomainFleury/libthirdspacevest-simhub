# Third Space Vest - Battle Sister Mod

MelonLoader mod that sends haptic events to the Third Space Vest daemon (TCP 5050).

Harmony patches are adapted from [BattleSister_bhaptics](https://github.com/floh-bhaptics/BattleSister_bhaptics). The NexusMods file `BattleSister_bhaptics.dll` talks to bHaptics Player — do not install it for this vest.

## Prerequisites

1. Warhammer 40,000: Battle Sister (Steam App ID 1733890)
2. MelonLoader 0.6.x+
3. Third Space Vest daemon on port 5050

## Build

Copy MelonLoader / Il2Cpp DLLs into `libs/` from:

- `Battle Sister\MelonLoader\net6\` — `MelonLoader.dll`, `0Harmony.dll`
- `Battle Sister\MelonLoader\Il2CppAssemblies\` — `Assembly-CSharp.dll`, `UnityEngine.CoreModule.dll`, `UnityEngine.PhysicsModule.dll`

Then:

```powershell
./build.ps1
```

Copy `ThirdSpace_BattleSister\bin\Release\ThirdSpace_BattleSister.dll` to `Battle Sister/Mods/`.
