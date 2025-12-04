# Third Space Haptics Mod for Kingdom Come: Deliverance 2

This mod enables haptic feedback for the Third Space Vest in Kingdom Come: Deliverance 2.

## Features

- **Melee Combat Feedback**: Feel sword, mace, and axe impacts with directional haptics
- **Blocking and Parrying**: Get feedback when blocking or performing perfect parries
- **Arrow Hits**: Sharp, sudden feedback when hit by ranged attacks
- **Health System**: Heartbeat effect at low health, death impact at full vest
- **Status Effects**: Subtle pulsing for bleeding, poison, and exhaustion
- **Fall Damage**: Lower body impact feedback for falls
- **Combat State**: Quick alert pulse when combat starts

## Installation

1. Locate your KCD2 installation folder:
   - Steam: `C:\Program Files (x86)\Steam\steamapps\common\KingdomComeDeliverance2\`
   - GOG: `C:\Program Files (x86)\GOG Galaxy\Games\Kingdom Come Deliverance 2\`
   - Epic: `C:\Program Files\Epic Games\KingdomComeDeliverance2\`

2. Copy the `ThirdSpaceHaptics` folder to the `Mods` directory:
   ```
   KingdomComeDeliverance2/
   └── Mods/
       └── ThirdSpaceHaptics/
           ├── mod.manifest
           └── Scripts/
               └── Startup/
                   └── thirdspace_kcd2.lua
   ```

3. Launch the game - the mod loads automatically on startup.

## Testing (Developer Mode)

To test the mod during development:

1. Create a shortcut to `KingdomComeDeliverance2.exe`
2. Add `-devmode` to the launch arguments
3. Launch the game with the shortcut
4. Press `~` or `^` to open the console
5. Use the test commands:
   ```
   #ts_status           -- Check current player status
   #ts_test_damage      -- Test damage event
   #ts_test_death       -- Test death event
   #ts_test_heal        -- Test heal event
   ```

## Event Format

The mod logs events in this format:
```
[ThirdSpace] {EventType|param1=value1|param2=value2}
```

### Supported Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `Init` | `version`, `game` | Script initialization |
| `PlayerFound` | `health` | Player entity located |
| `PlayerDamage` | `damage`, `health`, `direction`, `bodyPart`, `weaponType` | Player took damage |
| `PlayerDeath` | `lastHealth`, `cause` | Player died |
| `PlayerHeal` | `amount`, `health` | Player healed |
| `CriticalHealth` | `health` | Health below 20 |
| `PlayerAttack` | `weapon`, `type` | Player attacked |
| `PlayerBlock` | `success`, `direction`, `perfect` | Player blocked |
| `PlayerHitEnemy` | `damage`, `enemyType`, `weapon` | Player hit enemy |
| `PlayerFall` | `damage`, `height` | Player fell |
| `LowStamina` | `stamina` | Stamina below 15 |
| `CombatStart` | | Combat started |
| `CombatEnd` | | Combat ended |

## Requirements

- Kingdom Come: Deliverance 2
- Third Space Vest
- Third Space Vest Daemon running

## Compatibility

- Compatible with most other mods
- Does not modify core game files
- Uses standard CryEngine Lua scripting

## Troubleshooting

**Mod not loading?**
- Ensure the folder structure is correct
- Check that the `Mods` folder exists in your game installation
- Verify the game is running with mods enabled

**No haptic feedback?**
- Make sure the Third Space Vest Daemon is running
- Click "Start Watching" in the Third Space UI
- Check the game console for `[ThirdSpace]` messages

**Console commands not working?**
- Ensure you're in dev mode (`-devmode` launch argument)
- Prefix commands with `#` (e.g., `#ts_status`)

## Credits

- Third Space Community
- Based on [Warhorse Modding Tools](https://warhorse.youtrack.cloud/articles/KM-A-55/The-Modding-Tools)

## License

MIT License - Feel free to modify and redistribute.
