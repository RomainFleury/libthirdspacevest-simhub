# Third Space Vest - Arma Reforger Mod

Haptic feedback integration for Arma Reforger using the Third Space Gaming Vest.

## Overview

This mod hooks into Arma Reforger's game events and sends them to the Third Space Vest daemon via TCP, enabling immersive tactile feedback during gameplay.

## Supported Events

### Player Events
- **Damage Taken** - Directional feedback based on damage angle
- **Death** - Full vest pulse at maximum intensity
- **Healing** - Gentle front cells pulse
- **Suppression** - Subtle full body rumble when under fire

### Weapon Events  
- **Rifle Fire** - Upper front cells, medium intensity
- **Machine Gun Fire** - Upper front cells, sustained
- **Pistol Fire** - Upper front cells, light intensity
- **Launcher Fire** - Full upper body, strong
- **Reload** - Brief front lower pulse
- **Grenade Throw** - Arm-side cells pulse

### Vehicle Events
- **Collision** - Full vest based on severity
- **Damage** - Directional based on hit location
- **Explosion** - Full vest, maximum intensity
- **Helicopter Rotor** - Sustained back cells vibration

### Environment Events
- **Nearby Explosion** - Intensity scales with distance
- **Nearby Bullet Impact** - Quick directional pulse

## Installation

⚠️ **Important**: Arma Reforger does **NOT** support local/manual mod installation. All mods must be either:
1. Published on the **Steam Workshop**, or
2. Loaded via **Arma Reforger Workbench** (development tool)

### For Users (When Published)

1. Subscribe to the mod on Steam Workshop (link TBD)
2. Enable the mod in Arma Reforger's mod menu
3. Start the Third Space Vest daemon and enable Arma Reforger integration

### For Developers (Workbench Required)

1. **Install Arma Reforger Workbench** from Steam (free with Arma Reforger)
2. **Open Workbench** and create a new addon project named "ThirdSpaceVest"
3. **Import the script files** from this folder:
   - Copy `Scripts/Game/*.c` into your addon's `Scripts/Game/` folder
   - Copy `mod.json` to the addon root
4. **Build the addon** in Workbench (Ctrl+B or Build menu)
5. **Test locally** by running the game from Workbench (F5)
6. **Publish to Workshop** when ready (Workbench → Publish)

## Requirements

- **Third Space Vest daemon** running on `localhost:5050`
- **Arma Reforger** (current version)

## Configuration

The mod connects to the daemon at `127.0.0.1:5050` by default. To change this:

1. Edit `ThirdSpaceTcpClient.c`
2. Modify `DAEMON_HOST` and `DAEMON_PORT` constants

## Testing

1. **Start the Third Space Vest daemon**:
   ```bash
   cd modern-third-space
   python -m modern_third_space.cli daemon start
   ```

2. **Enable Arma Reforger integration** in the Third Space Vest UI

3. **Launch Arma Reforger** with the mod enabled

4. **Join a game** and take damage to test the haptic feedback

## Status & Limitations

⚠️ **Development Status**: This is a template/prototype mod requiring Arma Reforger Workbench to build and test.

### Known Limitations

1. **No Local Mod Support** - Arma Reforger requires all mods to be published on Steam Workshop or loaded via Workbench. You cannot simply copy files to a mods folder.

2. **TCP Implementation** - Enfusion's socket API may differ from the conceptual code. Alternative methods like RestApi or file-based communication may be needed.

3. **Class Names** - The modded class names (`SCR_CharacterDamageManagerComponent`, etc.) are based on community documentation and may need verification with the actual game classes.

4. **Event Hooks** - Some event hooks may require alternative implementation depending on the Enfusion API.

## Troubleshooting

### Mod Not Loading
- Verify `mod.json` is valid JSON
- Check that all script files have `.c` extension
- Ensure the addon folder structure matches the expected layout

### No Haptic Feedback
- Verify the daemon is running (`python -m modern_third_space.cli daemon status`)
- Check that "Arma Reforger" integration is enabled in the Third Space UI
- Look for `[ThirdSpaceVest]` log messages in Arma Reforger console

### Connection Issues
- Ensure no firewall is blocking localhost:5050
- Verify the daemon port in UI settings matches the mod configuration

## File Structure

```
armareforger-mod/
├── mod.json                              # Mod manifest
├── README.md                             # This file
└── Scripts/
    └── Game/
        ├── ThirdSpaceVestMod.c           # Main mod entry point
        ├── ThirdSpaceTcpClient.c         # TCP communication
        ├── ThirdSpacePlayerDamageHandler.c  # Player damage/heal hooks
        ├── ThirdSpaceWeaponHandler.c     # Weapon fire/reload hooks  
        ├── ThirdSpaceVehicleHandler.c    # Vehicle collision/damage hooks
        └── ThirdSpaceEnvironmentHandler.c   # Explosion/suppression hooks
```

## Contributing

This mod is part of the Third Space Vest community project. Contributions welcome!

### Development Notes

- Test with Arma Reforger Workbench for debugging
- Use the script console to verify event hooks are firing
- Enable verbose logging to track TCP communication

## License

MIT License - See main project LICENSE file.
