# Third Space Vest - Pistol Whip Mod

A MelonLoader mod that provides haptic feedback for Pistol Whip using the Third Space Vest.

**Adapted from existing bHaptics/OWO mods** - We reused their Harmony patches and replaced SDK calls with our TCP daemon client.

## Features

- 🔫 **Gun fire** - Hand-specific recoil feedback (pistol and shotgun)
- 🔄 **Reload** - Hip and shoulder reload feedback
- 👊 **Melee hits** - Impact feedback when punching enemies
- 💥 **Player damage** - Chest impact when getting shot
- 💀 **Death** - Full body pulse on death
- ❤️ **Low health** - Heartbeat pulse when armor is low
- 💚 **Healing** - Warmth spread when picking up armor

## Prerequisites

1. **Pistol Whip** (Steam/Oculus version)
2. **MelonLoader 0.6.x** (for Il2Cpp games) - [Download here](https://github.com/LavaGang/MelonLoader/releases)
3. **Third Space Vest daemon** running on port 5050

## Installation

### Step 1: Install MelonLoader

1. Download MelonLoader installer from [releases](https://github.com/LavaGang/MelonLoader/releases)
2. Run the installer and select your Pistol Whip installation
3. Launch the game once to generate MelonLoader folders

### Step 2: Install the Mod

1. Download `ThirdSpace_PistolWhip.dll` from releases
2. Copy to `Pistol Whip/Mods/` folder
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

1. Create `Pistol Whip/Mods/ThirdSpace_Config.txt`
2. Add your IP (optionally with port):
   ```
   192.168.1.100
   # or with custom port:
   192.168.1.100:5050
   ```

## Events & Haptics

| Event | Trigger | Vest Feedback |
|-------|---------|---------------|
| Gun Fire (Right) | Firing right pistol | Right upper cells (front + back) |
| Gun Fire (Left) | Firing left pistol | Left upper cells (front + back) |
| Shotgun Fire (Right) | Firing right shotgun | Full right side (heavy recoil) |
| Shotgun Fire (Left) | Firing left shotgun | Full left side (heavy recoil) |
| Melee Hit (Right) | Right hand punch | Right upper cells |
| Melee Hit (Left) | Left hand punch | Left upper cells |
| Reload Hip (Right) | Right hip reload | Lower right front |
| Reload Hip (Left) | Left hip reload | Lower left front |
| Reload Shoulder (Right) | Right shoulder reload | Upper back right |
| Reload Shoulder (Left) | Left shoulder reload | Upper back left |
| Player Hit | Getting shot | Front chest (both upper cells) |
| Death | Fatal hit | All cells, max intensity, 1 second |
| Low Health | Armor lost | Lower front (heartbeat pulse) |
| Healing | Armor pickup | Lower front + back (warmth spread) |
| Empty Gun Fire | Trying to fire with no ammo | Subtle click on hand side |

## Building from Source

### Requirements
- Visual Studio 2019/2022
- .NET Framework 4.7.2

### Steps

1. Copy required DLLs to `libs/` folder from:
   - `Pistol Whip/MelonLoader/Managed/`:
     - `MelonLoader.dll`
     - `0Harmony.dll`
     - `Il2Cppmscorlib.dll`
     - `Il2CppUnityEngine.dll`
     - `Assembly-CSharp.dll`

2. Open `ThirdSpace_PistolWhip.sln` in Visual Studio

3. Build in Release mode

4. Copy `bin/Release/ThirdSpace_PistolWhip.dll` to `Pistol Whip/Mods/`

## Troubleshooting

### Mod not loading
- Check MelonLoader is installed correctly (version 0.6.x for Il2Cpp)
- Look for errors in `Pistol Whip/MelonLoader/Latest.log`

### No haptic feedback
- Verify daemon is running: `python -m modern_third_space.cli daemon status`
- Check the MelonLoader console for connection messages
- Ensure vest is selected in the Electron UI

### Events not firing
- Check MelonLoader log for "[ThirdSpace]" messages
- Ensure you're in VR (not flat screen mode)
- Some events require specific game actions (e.g., reload type depends on settings)

## Credits

- Based on [PistolWhip_bhaptics](https://github.com/floh-bhaptics/PistolWhip_bhaptics) by floh-bhaptics
- Based on [PistolWhip_OWO](https://github.com/floh-bhaptics/PistolWhip_OWO) by floh-bhaptics
- Uses [MelonLoader](https://github.com/LavaGang/MelonLoader) mod framework
- Uses [Harmony](https://github.com/pardeike/Harmony) for game patching

## License

MIT License - See project root LICENSE file.

