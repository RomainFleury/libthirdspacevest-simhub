# Pistol Whip Mod

Place `ThirdSpace_PistolWhip.dll` in this directory.

## Building

```powershell
cd ../../pistolwhip-mod
./build.ps1

# Or manually:
# Copy required DLLs from Pistol Whip/MelonLoader/Managed/ to libs/
msbuild ThirdSpace_PistolWhip.sln /p:Configuration=Release
copy ThirdSpace_PistolWhip\bin\Release\ThirdSpace_PistolWhip.dll ..\mods\pistolwhip\
```

## Installation (for users)

1. Install MelonLoader 0.7.0+ on Pistol Whip
2. Copy `ThirdSpace_PistolWhip.dll` to `Pistol Whip/Mods/`
3. Start the Third Space daemon
4. Launch Pistol Whip
