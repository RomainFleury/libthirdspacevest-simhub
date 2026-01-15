# SUPERHOT VR Mod

Place `ThirdSpace_SuperhotVR.dll` in this directory.

## Building

```powershell
cd ../../superhot-mod
# Copy required DLLs from SUPERHOT VR/MelonLoader/Managed/ to libs/
# - MelonLoader.dll
# - 0Harmony.dll
# - Assembly-CSharp.dll
# - UnityEngine.dll
# - UnityEngine.CoreModule.dll

# Build with Visual Studio or MSBuild
msbuild ThirdSpace_SuperhotVR.sln /p:Configuration=Release

# Copy output
copy ThirdSpace_SuperhotVR\bin\Release\ThirdSpace_SuperhotVR.dll ..\mods\superhot-vr\
```

## Installation (for users)

1. Install MelonLoader 0.7.0+ on SUPERHOT VR
2. Copy `ThirdSpace_SuperhotVR.dll` to `SUPERHOT VR/Mods/`
3. Start the Third Space daemon
4. Launch SUPERHOT VR
