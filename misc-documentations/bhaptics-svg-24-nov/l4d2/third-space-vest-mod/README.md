# Third Space Vest - Left 4 Dead 2 Integration Mod

This VScript mod enables haptic feedback integration for Left 4 Dead 2 by outputting structured game events to `console.log`.

## Installation

### Method 1: Manual Installation (Recommended)

1. **Locate your Left 4 Dead 2 installation directory:**
   - **Windows (Steam)**: `C:\Program Files (x86)\Steam\steamapps\common\Left 4 Dead 2\left4dead2\`
   - **Linux (Steam/Proton)**: `~/.steam/steam/steamapps/common/Left 4 Dead 2/left4dead2/`
   - **macOS**: `~/Library/Application Support/Steam/steamapps/common/Left 4 Dead 2/left4dead2/`

2. **Create the scripts directory if it doesn't exist:**
   ```
   scripts/vscripts/
   ```

3. **Copy the mod file:**
   - Copy `thirdspacevest_haptics.nut` to: `scripts/vscripts/thirdspacevest_haptics.nut`

4. **Create a map script or auto-exec script to load it:**
   
   **Option A: Create an auto-exec script** (runs on every map):
   - Create file: `cfg/autoexec.cfg`
   - Add line: `script_execute scripts/vscripts/thirdspacevest_haptics.nut`
   
   **Option B: Load manually in-game (RECOMMENDED):**
   - Open console (enable in game settings, press `~`)
   - Type: `script_execute thirdspacevest_haptics` (no path, no .nut extension)
   - You should see: `[L4D2Haptics] Third Space Vest integration mod loaded!`

### Method 2: VPK Package (Advanced)

1. Package the script into a VPK file using VPK.exe (from Source SDK)
2. Place the VPK in `left4dead2/addons/`
3. The script will auto-load when the game starts

## Setup

1. **Add launch option to Steam:**
   - Right-click Left 4 Dead 2 in Steam → Properties → Launch Options
   - Add: `-condebug`
   - This enables console logging to `console.log`

2. **Enable Developer Console:**
   - In-game Settings → Keyboard/Mouse → Enable Developer Console
   - Press `~` (tilde) to open console

3. **Load the mod:**
   - Launch the game and start a map (single-player or local server)
   - Open console (`~`)
   - Type: `script_execute thirdspacevest_haptics`
   - You should see: `[L4D2Haptics] Third Space Vest integration mod loaded!`
   - **Note:** If you see `ERROR: ListenToGameEvent not available`, the mod is loaded but event hooks may not work. See Troubleshooting section.

## Event Format

The mod outputs events to `console.log` in this format:

```
[L4D2Haptics] {EventType|param1|param2|...}
```

### Available Events

| Event | Format | Description |
|-------|--------|-------------|
| `PlayerHurt` | `{PlayerHurt\|damage\|attacker\|angle\|damage_type\|victim}` | Player took damage |
| `PlayerDeath` | `{PlayerDeath\|killer\|weapon\|victim}` | Player died |
| `WeaponFire` | `{WeaponFire\|weapon\|player}` | Player fired weapon |
| `HealthPickup` | `{HealthPickup\|item\|player}` | Player picked up health item |
| `AmmoPickup` | `{AmmoPickup\|player}` | Player picked up ammo |
| `InfectedHit` | `{InfectedHit\|infected\|damage\|attacker}` | Player hit infected |
| `PlayerHealed` | `{PlayerHealed\|amount\|player}` | Player was healed |

### Example Output

```
[L4D2Haptics] {PlayerHurt|25|hunter|180|bullet|Player}
[L4D2Haptics] {WeaponFire|weapon_rifle|Player}
[L4D2Haptics] {InfectedHit|infected|50|Player}
[L4D2Haptics] {HealthPickup|weapon_first_aid_kit|Player}
```

## Parameters

### PlayerHurt Event
- `damage`: Damage amount (integer)
- `attacker`: Name of attacker (or "unknown")
- `angle`: Angle of attack relative to player view (0-360°)
- `damage_type`: Type of damage (bullet, burn, slash, etc.)
- `victim`: Name of victim (player name)

### Damage Types
- `bullet`: Bullet damage
- `burn`: Fire damage
- `slash`: Melee/slash damage
- `crush`: Crush damage
- `blast`: Explosive damage
- `shock`: Shock damage
- `generic`: Generic damage

### Angle Reference
- `0°`: Front
- `90°`: Right
- `180°`: Back
- `270°`: Left

## Troubleshooting

### Mod not loading
- Check that the file is in the correct location: `scripts/vscripts/thirdspacevest_haptics.nut`
- Verify the file was copied correctly
- **Use the correct console command:** `script_execute thirdspacevest_haptics` (no path, no .nut extension)
- The file must be in: `<L4D2>/left4dead2/scripts/vscripts/thirdspacevest_haptics.nut`

### ListenToGameEvent not available error
- **Status:** This is a known limitation - L4D2's VScript API may not support `ListenToGameEvent` in all versions
- **Current workaround:** The mod will still output basic events, but advanced event hooks may not work
- **Alternative:** We're working on entity-level hooks as an alternative (future update)
- **Phase 1 fallback:** The integration will still work with vanilla console.log parsing (attack events, etc.)

### No events in console.log
- Ensure `-condebug` is in Steam launch options
- Check that `console.log` exists in `left4dead2/` directory
- Verify the mod loaded (check console for `[L4D2Haptics]` messages)

### Events not appearing
- Make sure you're playing (not in main menu)
- Some events only trigger during gameplay
- Check console for error messages
- **If you see "ListenToGameEvent not available":** The mod loaded but event hooks aren't working. The integration will fall back to Phase 1 (basic console.log parsing) which still detects attack events.

### Performance issues
- The mod is lightweight, but if you experience lag, try disabling debug mode:
  - Edit `thirdspacevest_haptics.nut`
  - Set `ENABLE_DEBUG = false;` at the top

## Compatibility

- **Game Version**: Left 4 Dead 2 (any version)
- **Platform**: Windows, Linux (Proton), macOS
- **Multiplayer**: Works in single-player and local servers
- **VAC**: Safe (client-side script only, no server modifications)

## Credits

- Created for Third Space Vest haptic integration
- Uses L4D2's VScript (Squirrel) API
- Compatible with existing L4D2 mods

## Support

For issues or questions:
1. Check the main integration documentation: `docs-external-integrations-ideas/L4D2_INTEGRATION.md`
2. Verify console.log contains `[L4D2Haptics]` messages
3. Ensure the Python daemon is running and watching the correct log file

