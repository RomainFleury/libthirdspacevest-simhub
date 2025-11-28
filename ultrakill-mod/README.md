# Third Space Vest - ULTRAKILL Integration

BepInEx mod for ULTRAKILL that sends haptic events to the Third Space Vest daemon.

## Requirements

- ULTRAKILL (Steam version)
- BepInEx 5.4.23.3 (NOT 6.x)
- Third Space Vest Daemon running

## Installation

### 1. Install BepInEx

1. Download [BepInEx 5.4.23.3](https://github.com/BepInEx/BepInEx/releases/tag/v5.4.23.3)
2. Extract to your ULTRAKILL game folder:
   ```
   C:\Program Files (x86)\Steam\steamapps\common\ULTRAKILL\
   ```
3. Run the game once to generate BepInEx folders
4. Close the game

### 2. Install This Mod

Copy `ThirdSpace_ULTRAKILL.dll` to:
```
ULTRAKILL/BepInEx/plugins/ThirdSpace_ULTRAKILL.dll
```

### 3. Start the Daemon

Before launching the game, start the Third Space Vest daemon:
```powershell
python -m modern_third_space.cli daemon start
```

Or use the GUI app (`windows/start-all.bat`)

### 4. Play!

Launch ULTRAKILL and enjoy haptic feedback!

## Features

### Combat Feedback
- **Directional damage** - Feel hits from the direction they come from
- **Death** - Full body feedback on death
- **Explosions** - Intense feedback for explosion damage

### Weapon Feedback
- **Revolver** - Medium recoil on shot
- **Shotgun** - Strong recoil
- **Nailgun** - Rapid light feedback
- **Railcannon** - Very strong recoil
- **Rocket Launcher** - Strong recoil
- **Punch/Parry** - Arm feedback

### Movement Feedback
- **Jump** - Light lower body feedback
- **Landing** - Intensity based on fall speed
- **Stomp** - Strong lower body feedback
- **Dash** - Directional feedback

## Configuration

Create `ThirdSpace_Config.txt` in `BepInEx/plugins/` to set a custom daemon address:

```
# Custom daemon address (default: 127.0.0.1:5050)
192.168.1.100:5050
```

## Troubleshooting

### Mod not loading
- Make sure you have BepInEx 5.x (not 6.x)
- Check `BepInEx/LogOutput.log` for errors

### No haptic feedback
- Is the daemon running? Check the GUI app
- Is the vest connected? Check "Device" tab in daemon UI
- Check BepInEx console for `[ThirdSpace]` messages

### Connection refused
- Make sure daemon is running before launching the game
- Check firewall isn't blocking port 5050

## Building from Source

```powershell
cd ultrakill-mod
.\build.ps1
```

Requirements:
- .NET SDK 6.0+
- BepInEx libraries (download separately and place in `libs/`)

## Credits

Based on research from:
- [OWO_ULTRAKILL](https://github.com/OWODevelopers/OWO_ULTRAKILL)
- [Bhaptics_Ultrakill](https://github.com/Evelyn3440/Bhaptics_Ultrakill)
