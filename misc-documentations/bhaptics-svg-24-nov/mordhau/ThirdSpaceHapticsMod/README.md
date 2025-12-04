# Third Space Haptics - Mordhau Mod

A client-side mod for MORDHAU that logs player damage events for haptic feedback integration with the Third Space Vest.

## What This Mod Does

When the player takes damage in Mordhau, this mod:

1. **Detects the damage event** - Hooks into UE4's damage system
2. **Calculates damage direction** - Determines if hit came from front/back/left/right
3. **Identifies damage type** - Slash, stab, blunt, or projectile
4. **Writes to log file** - External daemon reads events and triggers haptic feedback

## Log File Format

Events are written to:
```
%LOCALAPPDATA%\Mordhau\Saved\ThirdSpaceHaptics\haptic_events.log
```

Each line (v2 format with angle):
```
{timestamp}|{event_type}|{angle}|{zone}|{damage_type}|{intensity}
```

Example:
```
1704067200000|DAMAGE|0.0|front|slash|45
1704067200100|DAMAGE|45.5|front-right|slash|60
1704067200200|DAMAGE|135.0|back-right|stab|75
1704067200300|DAMAGE|270.0|left|projectile|30
1704067200400|DAMAGE|315.0|front-left|blunt|50
1704067201000|DEATH|-1|all|death|100
```

### Angle Convention

The angle represents the direction of the damage from the **player's perspective**:

```
                0° (Front)
                   │
  315° (Front-Left)│ 45° (Front-Right)
              ╲    │    ╱
               ╲   │   ╱
270° (Left) ───────●─────── 90° (Right)
               ╱   │   ╲
              ╱    │    ╲
  225° (Back-Left) │ 135° (Back-Right)
                   │
               180° (Back)
```

### 8-Zone Mapping

| Zone | Angle Range | Description |
|------|-------------|-------------|
| front | 337.5° - 22.5° | Damage from ahead |
| front-right | 22.5° - 67.5° | Damage from front-right |
| right | 67.5° - 112.5° | Damage from right |
| back-right | 112.5° - 157.5° | Damage from back-right |
| back | 157.5° - 202.5° | Damage from behind |
| back-left | 202.5° - 247.5° | Damage from back-left |
| left | 247.5° - 292.5° | Damage from left |
| front-left | 292.5° - 337.5° | Damage from front-left |

## Installation

### Prerequisites

- MORDHAU (Steam version)
- The mod packaged as a `.pak` file

### Installing the Mod

1. Locate your Mordhau installation:
   ```
   Steam\steamapps\common\Mordhau\Mordhau\Content\
   ```

2. Create the `CustomPaks` folder if it doesn't exist:
   ```
   Steam\steamapps\common\Mordhau\Mordhau\Content\CustomPaks\
   ```

3. Copy `ThirdSpaceHapticsWindowsClient.pak` into `CustomPaks`

4. Launch Mordhau - the mod loads automatically

### Verifying Installation

1. Launch Mordhau and join a match
2. Take damage from any source
3. Check for the log file at:
   ```
   %LOCALAPPDATA%\Mordhau\Saved\ThirdSpaceHaptics\haptic_events.log
   ```

4. Or run the test script:
   ```bash
   python test_log_parser.py
   ```

## Building the Mod

### Requirements

- **MORDHAU Editor** - Free from [Epic Games Store](https://store.epicgames.com/en-US/p/mordhau--editor)
- Basic Blueprint knowledge

### Build Steps

1. **Open MORDHAU Editor**
   - Download and install from Epic Games Store
   - Launch the editor

2. **Create Plugin Structure**
   - Create new plugin: `Edit > Plugins > New Plugin`
   - Type: "Content Only"
   - Name: `ThirdSpaceHaptics`

3. **Implement Blueprints**
   - Follow `BLUEPRINT_IMPLEMENTATION.md` for detailed instructions
   - Create `BP_ThirdSpaceCore` actor
   - Implement damage detection and logging

4. **Package the Mod**
   - `File > Package Project > Windows`
   - Wait for cooking to complete
   - Find `.pak` in `Saved/Cooked/WindowsNoEditor/.../Paks/`
   - Rename to `ThirdSpaceHapticsWindowsClient.pak`

## Files

```
ThirdSpaceHapticsMod/
├── ThirdSpaceHaptics.uplugin       # Plugin descriptor
├── README.md                        # This file
├── BLUEPRINT_IMPLEMENTATION.md     # Step-by-step Blueprint guide
├── test_log_parser.py              # Python script to test/verify events
└── Resources/
    └── Icon128.png                 # Plugin icon (placeholder)
```

## Integration with Third Space Vest

Once the mod is installed:

1. **Start the daemon**
   ```bash
   cd modern-third-space
   python -m src.modern_third_space.cli daemon start
   ```

2. **Start Mordhau integration in UI**
   - Open Third Space Vest UI
   - Navigate to Games → Mordhau
   - Click "Start Integration"

3. **Play Mordhau**
   - The daemon watches the log file
   - Damage events trigger haptic feedback
   - Direction maps to vest cells

### Haptic Mapping (8-Zone Precision)

The vest has 8 cells, and we map damage angles to specific cells:

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R
```

| Zone | Angle Range | Vest Cells | Description |
|------|-------------|------------|-------------|
| front | 337.5° - 22.5° | 2, 3, 4, 5 | All front cells |
| front-right | 22.5° - 67.5° | 4, 5 | Front-right only |
| right | 67.5° - 112.5° | 4, 5, 6, 7 | Right side |
| back-right | 112.5° - 157.5° | 6, 7 | Back-right only |
| back | 157.5° - 202.5° | 0, 1, 6, 7 | All back cells |
| back-left | 202.5° - 247.5° | 0, 1 | Back-left only |
| left | 247.5° - 292.5° | 0, 1, 2, 3 | Left side |
| front-left | 292.5° - 337.5° | 2, 3 | Front-left only |
| all (death) | N/A | 0-7 | All cells |

### Intensity Mapping

| Damage Amount | Haptic Speed |
|--------------|--------------|
| 80-100 | 9 (strong) |
| 60-79 | 7 |
| 40-59 | 5 |
| 20-39 | 4 |
| 0-19 | 3 (light) |

## Troubleshooting

### Mod Doesn't Load

- Verify `.pak` file is in `CustomPaks` folder
- File must end with `WindowsClient.pak` for client mods
- Check Mordhau console for mod loading messages

### No Events in Log

- Ensure you're actually taking damage (not in menus)
- Check if log directory exists
- Try the simulation mode: `python test_log_parser.py --simulate`

### Incorrect Direction

- Direction detection requires valid damage causer
- Some damage types (fall damage) may show as "unknown"
- Environmental hazards may not have direction

### No Haptic Feedback

- Ensure daemon is running
- Verify Mordhau integration is started in UI
- Check daemon logs for errors

## Testing Without the Game

Use simulation mode to test the log parser and daemon integration:

```bash
python test_log_parser.py --simulate
```

This writes fake damage events to the log file, allowing you to test:
- Log parsing
- Daemon event processing
- Haptic feedback triggering

## Development

### Modifying the Mod

1. Open project in MORDHAU Editor
2. Edit Blueprints as needed
3. Re-package and install

### Adding New Events

The mod can be extended to log additional events:

- `BLOCK` - Successful parry/block
- `PARRY` - Perfect parry
- `KILL` - Player killed an enemy
- `HEADSHOT` - Headshot hit

Update the Blueprint and log parser accordingly.

## Credits

- Third Space Vest Team
- MORDHAU Modding Community
- [mod.io](https://mod.io/g/mordhau) for mod hosting

## License

This mod is provided for personal use with the Third Space Vest system.

## Related Files

- `../README.md` - Main Mordhau integration documentation
- `../PLAN_B_README.md` - Screen capture alternative approach
- `../screen_capture_prototype.py` - Screen capture script
- `../../mordhau_manager.py` - Daemon integration manager
