# Building All Mods

This repository contains multiple mods/plugins that can be built using a unified build script.

## Quick Start

Build all mods:
```powershell
.\build-all-mods.ps1
```

Build specific mods:
```powershell
.\build-all-mods.ps1 -Mods simhub
```

Clean and rebuild:
```powershell
.\build-all-mods.ps1 -Clean
```

## Available Mods

| Mod Key | Name | Path | Description |
|---------|------|------|-------------|
| `simhub` | SimHub Plugin | `simhub-plugin/` | C# plugin for SimHub telemetry |

**Note**: Other mods (SUPERHOT VR, GTA V, Pistol Whip) have been moved to `misc-documentations/archived-untested-mods/` as they are untested.

## Prerequisites

1. **Visual Studio 2019/2022** (Community, Professional, or Enterprise)
   - Required for MSBuild
   - Install with .NET Framework 4.7.2 development tools

2. **Mod-specific dependencies** (optional, but recommended):
   - **SimHub**: Either install SimHub, or copy SDK DLLs to `simhub-plugin\libs\`

## Build Script Options

```powershell
.\build-all-mods.ps1 [options]
```

### Options

- `-Mods <mod1,mod2,...>` - Build specific mods (default: simhub)
  - Example: `-Mods simhub`
  
- `-Clean` - Clean previous builds before building
  
- `-SkipPrerequisites` - Skip prerequisite checks (faster, but may fail if tools missing)

### Examples

```powershell
# Build all mods
.\build-all-mods.ps1

# Build SimHub plugin only
.\build-all-mods.ps1 -Mods simhub

# Clean rebuild
.\build-all-mods.ps1 -Mods simhub -Clean
```

## Individual Mod Build Scripts

Some mods have their own specialized build scripts that handle mod-specific requirements:

- **SimHub**: `simhub-plugin\build.ps1` - Handles SimHub SDK detection and optional installation

The unified script will automatically use these if they exist, otherwise it uses the standard MSBuild process.

## Build Output

After a successful build, DLLs are created in:

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

1. **Copy DLLs to mod directories**:
   - SimHub: Copy to SimHub installation directory

2. **Start the Python daemon**:
   ```bash
   python -m modern_third_space.cli daemon start
   ```

3. **Launch the application**

See individual mod READMEs for detailed installation and usage instructions.

