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

3. **Copy the mod files:**
   - Copy `thirdspacevest_haptics.nut` to: `scripts/vscripts/thirdspacevest_haptics.nut`
   - Copy `coop.nut` to: `scripts/vscripts/coop.nut` (enables Scripted Mode for campaign)

4. **How it works:**
   
   **Automatic (Recommended):**
   - The `coop.nut` file is a Mode Script that auto-loads when you start a campaign
   - It enables Scripted Mode (required for game event hooks)
   - It automatically loads `thirdspacevest_haptics.nut`
   - **No manual loading needed!** Just start a campaign game.
   
   **Manual loading (if needed):**
   - Open console (enable in game settings, press `~`)
   - Type: `script_execute coop` (this loads the mode script which enables Scripted Mode)
   - Or type: `script_execute thirdspacevest_haptics` (loads just the haptics script, but Scripted Mode won't be enabled)

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
   - Launch the game and start a campaign (single-player or local server)
   - The `coop.nut` Mode Script will auto-load, enabling Scripted Mode
   - Open console (`~`) to verify
   - You should see: `[L4D2Haptics] Third Space Vest integration mod loaded!`
   - You should see: `[L4D2Haptics] Game event callbacks registered!`
   - **Note:** If you see `WARNING: Scripted Mode not enabled!`, make sure `coop.nut` is in the `scripts/vscripts/` folder

## Event Format

The mod outputs events to `console.log` in this format:

```
[L4D2Haptics] {EventType|param1|param2|...}
```

### Available Events

| Event | Format | Description | Status |
|-------|--------|-------------|--------|
| `PlayerHurt` | `{PlayerHurt\|damage\|attacker\|angle\|damage_type\|victim}` | Player took damage | ✅ Active |
| `PlayerDeath` | `{PlayerDeath\|killer\|weapon\|victim}` | Player died | ✅ Active |
| `WeaponFire` | `{WeaponFire\|weapon\|player}` | Player fired weapon | ⏸️ Disabled (too frequent) |
| `HealthPickup` | `{HealthPickup\|item\|player}` | Player picked up health item | ✅ Active |
| `AmmoPickup` | `{AmmoPickup\|player}` | Player picked up ammo | ✅ Active |
| `InfectedHit` | `{InfectedHit\|infected\|damage\|attacker}` | Player hit infected | ✅ Active |
| `PlayerHealed` | `{PlayerHealed\|amount\|player}` | Player was healed | ✅ Active |

**Note:** `WeaponFire` events are currently disabled to reduce log spam and resource usage. The code is preserved in the script (commented out) and can be re-enabled by uncommenting the `OnGameEvent_weapon_fire()` function.

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

### Scripted Mode not enabled error
- **Cause:** The mod requires Scripted Mode to be enabled for game event hooks to work
- **Solution:** Make sure `coop.nut` is in `scripts/vscripts/` folder
- **How it works:** `coop.nut` is a Mode Script that auto-loads when you start a campaign, enabling Scripted Mode
- **Alternative:** If you're not playing campaign mode, create a Mode Script for your game mode (e.g., `versus.nut`, `survival.nut`)
- **Phase 1 fallback:** If Scripted Mode isn't enabled, the integration will still work with vanilla console.log parsing (attack events, etc.)

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

