# SimHub SDK DLLs

This folder contains the SimHub SDK DLLs required to build the Third Space Vest SimHub plugin.

## Required Files

Copy the following files from your SimHub installation folder to this `lib/` directory:

1. **GameReaderCommon.dll**
2. **SimHub.Plugins.dll**

## Where to Find These Files

### Default SimHub Installation Locations

The SimHub SDK DLLs are typically located in the SimHub installation directory. Common locations:

- `C:\Program Files (x86)\SimHub\`
- `C:\Program Files\SimHub\`
- `%LOCALAPPDATA%\Programs\SimHub\`

### How to Copy

1. Navigate to your SimHub installation folder
2. Copy `GameReaderCommon.dll` and `SimHub.Plugins.dll`
3. Paste them into this `lib/` folder

**Example:**
```powershell
# From the simhub-plugin directory
Copy-Item "C:\Program Files (x86)\SimHub\GameReaderCommon.dll" -Destination "ThirdSpaceSimHub\lib\"
Copy-Item "C:\Program Files (x86)\SimHub\SimHub.Plugins.dll" -Destination "ThirdSpaceSimHub\lib\"
```

## Alternative: Using libs/ Folder

The project also supports a `libs/` folder at the `simhub-plugin/` root level (one level up from this folder). If you prefer to keep SDK DLLs there instead, you can create:

```
simhub-plugin/
  libs/
    GameReaderCommon.dll
    SimHub.Plugins.dll
```

The build system will check both locations automatically.

## Note

These DLLs are **not** included in the repository (they're in `.gitignore`) because they are part of the SimHub SDK and should be obtained from your SimHub installation.

## Verification

After copying the files, verify they exist:

```powershell
Test-Path "ThirdSpaceSimHub\lib\GameReaderCommon.dll"
Test-Path "ThirdSpaceSimHub\lib\SimHub.Plugins.dll"
```

Both should return `True`.

