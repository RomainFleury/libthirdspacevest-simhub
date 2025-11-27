# Star Wars Battlefront 2 (2005) Haptic Integration

## Quick Start

This folder contains test scripts and documentation for integrating haptic feedback with SWBF2.

## Files

- `haptic_test.lua` - Test script to verify event registration and file I/O
- `README.md` - This file

## Installation (Testing)

### Step 1: Find Script Location

SWBF2 mission scripts are typically located in:

```
SteamLibrary\steamapps\common\Star Wars Battlefront II\GameData\Addon\YourMod\Scripts\
```

Or possibly:

```
SteamLibrary\steamapps\common\Star Wars Battlefront II\GameData\Common\Scripts\
```

**Note:** The exact location may vary. Check SWBF2 modding documentation or ZeroEditor.

### Step 2: Copy Test Script

Copy `haptic_test.lua` to the scripts directory.

### Step 3: Load Script

Scripts may be:
- Auto-loaded from the Scripts folder
- Assigned via ZeroEditor to specific missions
- Loaded via mission configuration

**Check SWBF2 modding documentation for exact loading method.**

### Step 4: Test

1. Launch SWBF2
2. Play a mission
3. Check for:
   - Console output (if file I/O fails)
   - `haptic_events.log` file in game directory
4. Trigger events:
   - Die (should see DEATH event)
   - Take damage (should see DAMAGE event)
   - Spawn (should see SPAWN event)

## Troubleshooting

### Script Not Loading

- Verify script location is correct
- Check ZeroEditor script assignment
- Look for Lua errors in console/log

### File I/O Not Working

The script will automatically fall back to console output. You can capture this with:
- Launch option: `-log` (if available)
- Check game log files

### Events Not Triggering

- Verify event registration syntax
- Check if events are mission-specific
- Test with simple `print()` statements first

## Next Steps

Once the test script works:

1. Verify event format matches Python parser expectations
2. Create Python file watcher (similar to HL:Alyx)
3. Map events to haptic feedback
4. Integrate with daemon

See `docs-external-integrations-ideas/SWBF2_INTEGRATION.md` for full strategy.

