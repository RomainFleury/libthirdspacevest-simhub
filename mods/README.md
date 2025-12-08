# Bundled Game Mods

This directory contains pre-built game mod files that are bundled with the Third Space Vest application. Users can download these directly from the app UI without needing to visit external sites.

## Directory Structure

```
mods/
├── superhot-vr/           # SUPERHOT VR MelonLoader mod
│   └── ThirdSpace_SuperhotVR.dll
├── pistolwhip/            # Pistol Whip MelonLoader mod
│   └── ThirdSpace_PistolWhip.dll
├── gta5/                  # GTA V SHVDN mod
│   └── ThirdSpaceGTAV.dll
├── alyx/                  # Half-Life: Alyx scripts
│   └── (Lua scripts from NexusMods)
└── l4d2/                  # Left 4 Dead 2 VScripts (in misc-documentations/)
    └── (Copied from misc-documentations during build)
```

## Building Mods

### MelonLoader Mods (SUPERHOT VR, Pistol Whip)

These require:
- Visual Studio 2019/2022
- .NET Framework 4.7.2
- MelonLoader dependencies from the game

Build steps:
```powershell
# SUPERHOT VR
cd superhot-mod
./build.ps1

# Pistol Whip
cd pistolwhip-mod
./build.ps1
```

### SHVDN Mod (GTA V)

Requires:
- Visual Studio 2019/2022
- .NET Framework 4.8
- ScriptHookVDotNet references

```powershell
cd gta5-mod
./build.ps1
```

## CI/CD Building

For automated builds, see `.github/workflows/build-mods.yml.example`.

The workflow:
1. Checks out game dependencies from cache/artifacts
2. Builds each mod with MSBuild
3. Copies DLLs to `mods/` directory
4. Commits or uploads as release artifacts

## Adding Pre-built Mods Manually

If you've built the mods locally:

1. Build the mod in Release mode
2. Copy the `.dll` to the appropriate folder:
   - `mods/superhot-vr/ThirdSpace_SuperhotVR.dll`
   - `mods/pistolwhip/ThirdSpace_PistolWhip.dll`
   - `mods/gta5/ThirdSpaceGTAV.dll`

3. The release build will bundle these automatically

## Version Tracking

Each mod should have a version file (`version.txt`) containing:
```
1.0.0
Built: 2024-12-08
Commit: abc1234
```

This helps users know which version they're downloading.
