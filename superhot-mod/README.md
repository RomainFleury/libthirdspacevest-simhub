# Third Space Vest - SUPERHOT VR Mod

A MelonLoader mod that provides haptic feedback for SUPERHOT VR using the Third Space Vest.

## Features

- 💀 **Death feedback** - Full body impact when killed
- 👊 **Punch impacts** - Hand-specific feedback when punching enemies
- 🔫 **Weapon recoil** - Pistol, shotgun, and uzi with hand-specific feedback
- 🛡️ **Bullet parry** - Feedback when deflecting bullets
- 🎯 **Throw feedback** - Feel the throw when launching objects
- ✋ **Grab feedback** - Subtle feedback when picking up items
- 🧠 **Mindwave** - Building charge and explosive release effects

## Prerequisites

1. **SUPERHOT VR** (Steam version)
2. **MelonLoader 0.7.0+** - [Download here](https://github.com/LavaGang/MelonLoader/releases)
3. **Third Space Vest daemon** running on port 5050

## Installation

### Step 1: Install MelonLoader

1. Download MelonLoader installer from [releases](https://github.com/LavaGang/MelonLoader/releases)
2. Run the installer and select your SUPERHOT VR installation
3. Launch the game once to generate MelonLoader folders

### Step 2: Install the Mod

1. Download `ThirdSpace_SuperhotVR.dll` from releases
2. Copy to `SUPERHOT VR/Mods/` folder
3. That's it!

### Step 3: Start the Daemon

Before playing, start the Third Space Vest daemon:

```bash
cd modern-third-space/src
python -m modern_third_space.cli daemon start
```

## Configuration

### Default Connection
By default, the mod connects to `localhost:5050`.

### Custom IP/Port
To connect to a daemon on a different machine:

1. Create `SUPERHOT VR/Mods/ThirdSpace_Config.txt`
2. Add your IP (optionally with port):
   ```
   192.168.1.100
   # or with custom port:
   192.168.1.100:5050
   ```

## Events & Haptics

| Event | Trigger | Vest Feedback |
|-------|---------|---------------|
| Death | Player killed | All cells, max intensity |
| Punch Hit | Punching enemy | Hand side cells |
| Bullet Parry | Deflecting bullet | Hand cell |
| Pistol Recoil | Firing pistol | Arm + shoulder cells |
| Shotgun Recoil | Firing shotgun | Full side |
| Uzi Recoil | Firing uzi | Light arm pulse |
| Throw | Throwing object | Arm + shoulder |
| Grab Object | Picking up item | Subtle hand feedback |
| Mindwave Charge | Charging ability | Building torso pulse |
| Mindwave Release | Releasing ability | Full body burst |

## Building from Source

### Requirements
- Visual Studio 2019/2022
- .NET Framework 4.7.2

### Steps

1. Copy required DLLs to `libs/` folder from:
   - `SUPERHOT VR/MelonLoader/Managed/`:
     - `MelonLoader.dll`
     - `0Harmony.dll`
     - `Assembly-CSharp.dll`
     - `UnityEngine.dll`
     - `UnityEngine.CoreModule.dll`

2. Open `ThirdSpace_SuperhotVR.sln` in Visual Studio

3. Build in Release mode

4. Copy `bin/Release/ThirdSpace_SuperhotVR.dll` to `SUPERHOT VR/Mods/`

## Troubleshooting

### Mod not loading
- Check MelonLoader is installed correctly
- Look for errors in `SUPERHOT VR/MelonLoader/Latest.log`

### No haptic feedback
- Verify daemon is running: `python -m modern_third_space.cli daemon status`
- Check the MelonLoader console for connection messages
- Ensure vest is selected in the Electron UI

### Events not firing
- Check MelonLoader log for "[ThirdSpace]" messages
- Ensure you're in VR (not flat screen mode)

## Credits

- Based on [OWO_SuperhotVR](https://github.com/OWODevelopers/OWO_SuperhotVR) by OWO Developers
- Uses [MelonLoader](https://github.com/LavaGang/MelonLoader) mod framework
- Uses [Harmony](https://github.com/pardeike/Harmony) for game patching

## License

MIT License - See project root LICENSE file.

