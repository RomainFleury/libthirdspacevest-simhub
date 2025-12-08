# GTA V Mod

Place `ThirdSpaceGTAV.dll` in this directory.

## Building

```powershell
cd ../../gta5-mod
./build.ps1

# Or manually:
# Requires ScriptHookVDotNet references
msbuild ThirdSpaceGTAV.sln /p:Configuration=Release
copy ThirdSpaceGTAV\bin\Release\ThirdSpaceGTAV.dll ..\mods\gta5\
```

## Prerequisites for Users

- ScriptHookV: http://www.dev-c.com/gtav/scripthookv/
- ScriptHookVDotNet: https://github.com/scripthookvdotnet/scripthookvdotnet

## Installation (for users)

1. Install ScriptHookV and ScriptHookVDotNet
2. Copy `ThirdSpaceGTAV.dll` to `GTA V/scripts/`
3. Start the Third Space daemon
4. Launch GTA V
