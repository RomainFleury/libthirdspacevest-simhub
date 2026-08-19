# Bundled Game Mods

This directory contains pre-built game mod files that are bundled with the Third Space Vest application. Users can download these directly from the app UI without needing to visit external sites.

## Directory Structure

```
mods/
├── alyx/                  # Half-Life: Alyx scripts
│   └── (Lua scripts from NexusMods)
├── l4d2/                  # Left 4 Dead 2 VScripts (in misc-documentations/)
│   └── (Copied from misc-documentations during build)
└── swbf2-kyber/           # KYBER LAN telemetry server plugin
    └── ThirdSpaceVestTelemetry/
```

## Building Mods

Most mods here are plain scripts:
- Pre-built files from external sources (Alyx scripts from NexusMods)
- Copied from `misc-documentations/` during the build process (L4D2 scripts)

Package the KYBER server plugin with:

```powershell
.\build-all-mods.ps1 -Mods kyber
```

The resulting ZIP is written under `mods/swbf2-kyber/dist/`.

For archived/untested mods, see `misc-documentations/archived-untested-mods/`.

## CI/CD Building

For automated builds, see `.github/workflows/build-mods.yml.example`.

The workflow:
1. Checks out game dependencies from cache/artifacts
2. Builds each mod with MSBuild
3. Copies DLLs to `mods/` directory
4. Commits or uploads as release artifacts

## Adding Pre-built Mods Manually

If you need to add mods manually:

1. Place the mod files in the appropriate folder under `mods/`
2. The release build will bundle these automatically

## Version Tracking

Each mod should have a version file (`version.txt`) containing:
```
1.0.0
Built: 2024-12-08
Commit: abc1234
```

This helps users know which version they're downloading.
