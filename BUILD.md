# Building All Mods

This repository contains multiple mods/plugins that can be built using a unified build script.

## Quick Start

Build all mods:
```powershell
.\build-all-mods.ps1
```

Build specific mods:
```powershell
.\build-all-mods.ps1 -Mods superhot,gta5
```

Clean and rebuild:
```powershell
.\build-all-mods.ps1 -Clean
```

## Available Mods

| Mod Key | Name | Path | Description |
|---------|------|------|-------------|
| `superhot` | SUPERHOT VR | `superhot-mod/` | MelonLoader mod for SUPERHOT VR |
| `gta5` | GTA V | `gta5-mod/` | Script Hook V .NET mod for GTA V |
| `pistolwhip` | Pistol Whip | `pistolwhip-mod/` | MelonLoader mod for Pistol Whip |
| `simhub` | SimHub Plugin | `simhub-plugin/` | C# plugin for SimHub telemetry |

## Prerequisites

1. **Visual Studio 2019/2022** (Community, Professional, or Enterprise)
   - Required for MSBuild
   - Install with .NET Framework 4.7.2 development tools

2. **Mod-specific dependencies** (optional, but recommended):
   - **SUPERHOT VR**: Copy DLLs from `SUPERHOT VR\MelonLoader\Managed\` to `superhot-mod\libs\`
   - **GTA V**: Copy `ScriptHookVDotNet.dll` and `GTA.dll` to `gta5-mod\libs\`
   - **Pistol Whip**: Copy DLLs from `Pistol Whip\MelonLoader\Managed\` to `pistolwhip-mod\libs\`
   - **SimHub**: Either install SimHub, or copy SDK DLLs to `simhub-plugin\libs\`

## Build Script Options

```powershell
.\build-all-mods.ps1 [options]
```

### Options

- `-Mods <mod1,mod2,...>` - Build specific mods (default: all)
  - Example: `-Mods superhot,gta5`
  
- `-Clean` - Clean previous builds before building
  
- `-SkipPrerequisites` - Skip prerequisite checks (faster, but may fail if tools missing)

### Examples

```powershell
# Build all mods
.\build-all-mods.ps1

# Build only VR mods
.\build-all-mods.ps1 -Mods superhot,pistolwhip

# Clean rebuild of GTA V mod
.\build-all-mods.ps1 -Mods gta5 -Clean

# Build SimHub plugin only
.\build-all-mods.ps1 -Mods simhub
```

## Individual Mod Build Scripts

Some mods have their own specialized build scripts that handle mod-specific requirements:

- **GTA V**: `gta5-mod\build.ps1` - Checks for Script Hook V .NET DLLs
- **SimHub**: `simhub-plugin\build.ps1` - Handles SimHub SDK detection and optional installation

The unified script will automatically use these if they exist, otherwise it uses the standard MSBuild process.

## Build Output

After a successful build, DLLs are created in:

- `superhot-mod\ThirdSpace_SuperhotVR\bin\Release\ThirdSpace_SuperhotVR.dll`
- `gta5-mod\ThirdSpaceGTAV\bin\Release\ThirdSpaceGTAV.dll`
- `pistolwhip-mod\ThirdSpace_PistolWhip\bin\Release\ThirdSpace_PistolWhip.dll`
- `simhub-plugin\ThirdSpaceSimHub\bin\Release\ThirdSpaceSimHub.dll`

## Troubleshooting

### MSBuild not found
- Install Visual Studio 2019/2022
- Ensure .NET Framework 4.7.2 development tools are installed

### Missing DLL references
- The build script will warn about missing DLLs
- Copy required DLLs to each mod's `libs\` folder
- See individual mod READMEs for specific DLL requirements

### Build fails for specific mod
- Check the mod's individual build script (if it exists) for mod-specific requirements
- Review the mod's README for setup instructions
- Check MSBuild output for specific error messages

### Mod has its own build script
- The unified script will automatically use mod-specific build scripts when available
- This ensures mod-specific requirements (like SimHub SDK detection) are handled correctly

## Next Steps

After building:

1. **Copy DLLs to game/mod directories**:
   - SUPERHOT VR: Copy to `SUPERHOT VR\Mods\`
   - GTA V: Copy to `GTA V\scripts\`
   - Pistol Whip: Copy to `Pistol Whip\Mods\`
   - SimHub: Copy to SimHub installation directory

2. **Start the Python daemon**:
   ```bash
   python -m modern_third_space.cli daemon start
   ```

3. **Launch the game/application**

See individual mod READMEs for detailed installation and usage instructions.

