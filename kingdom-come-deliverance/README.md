# Third Space Haptics for Kingdom Come: Deliverance

This mod provides haptic feedback integration for Kingdom Come: Deliverance using the Third Space Vest.

## Installation

### Option 1: Mod Package (.pak file)

1. Download or create the `ThirdSpaceHaptics.pak` file
2. Place it in your KCD installation's `Mods/` folder:
   - **KCD 1**: `Steam/steamapps/common/KingdomComeDeliverance/Mods/`
   - **KCD 2**: `Steam/steamapps/common/KingdomComeDeliverance2/Mods/`
3. Launch the game - the script will auto-load

### Option 2: Manual Installation

1. Create the folder structure:
   ```
   Mods/ThirdSpaceHaptics/Scripts/Startup/
   ```

2. Copy `thirdspace_haptics.lua` to:
   ```
   Mods/ThirdSpaceHaptics/Scripts/Startup/thirdspace_haptics.lua
   ```

3. Launch the game

## Development Mode (Testing)

To test the script manually:

1. Launch KCD with `-devmode` flag:
   - Create a shortcut to `KingdomCome.exe`
   - Add `-devmode` to the shortcut target
   - Launch with this shortcut

2. Open the console with `~` or `^`

3. Test commands:
   ```
   #ts_init      - Initialize the haptics integration
   #ts_status    - Show current status
   #ts_update    - Manual update (for testing)
   ```

## How It Works

The Lua script:
1. Polls player health every 100ms
2. Detects changes (damage, healing, death)
3. Writes events to the game log in format: `[ThirdSpace] {EventType|param1=value1|...}`

The Python daemon:
1. Watches the game log file
2. Parses `[ThirdSpace]` events
3. Maps events to haptic effects
4. Triggers the vest hardware

## Event Format

All events use this format:
```
[ThirdSpace] {EventType|param1=value1|param2=value2|...}
```

### Supported Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `Init` | `version` | Script initialization |
| `PlayerFound` | `health` | Player entity located |
| `PlayerDamage` | `damage`, `health`, `previous`, `direction`, `bodyPart` | Player took damage |
| `PlayerDeath` | `lastHealth` | Player died |
| `PlayerHeal` | `amount`, `health` | Player healed |
| `CriticalHealth` | `health` | Health below 20% |
| `Attack` | `weapon`, `type` | Player attacked |
| `Block` | `success`, `direction` | Player blocked |
| `Hit` | `damage`, `direction`, `bodyPart` | Player's attack hit enemy |

## Troubleshooting

### Script Not Loading

- Ensure the mod folder structure is correct
- Check that the script is in `Scripts/Startup/` subfolder
- Try launching with `-devmode` to see console output

### No Events in Log

- Check that the game log file exists
- Verify the script is running with `#ts_status` in console
- Check log file location (varies by KCD version)

### Python Daemon Not Receiving Events

- Ensure the daemon is running: `python -m modern_third_space.cli daemon start`
- Check that the log path is correct: `python -m modern_third_space.cli kcd status`
- Verify the log file is being written to (check file modification time)

## Future Enhancements

- Combat event detection (attacks, blocks, parries)
- Directional damage detection
- Body part targeting
- Weapon-specific feedback
- Status effect detection (bleeding, injuries)

## Version Compatibility

| Game Version | Status | Notes |
|--------------|--------|-------|
| KCD 1 | 🟡 Needs testing | Original game |
| KCD 1 Royal Edition | 🟡 Needs testing | All DLC included |
| KCD 2 | 🟡 Needs testing | Uses newer CryEngine fork |

## Resources

- **KCD Coding Guide:** https://github.com/benjaminfoo/kcd_coding_guide
- **KCD2 Mod Docs:** https://github.com/muyuanjin/kcd2-mod-docs
- **CryEngine Docs:** https://docs.cryengine.com/
- **KCD Modding Tools:** https://www.nexusmods.com/kingdomcomedeliverance/mods/864
