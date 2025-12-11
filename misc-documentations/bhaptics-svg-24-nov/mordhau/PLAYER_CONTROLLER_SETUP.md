# Player Controller Setup for Client-Side Mods

## The Problem

You created a Player Controller Blueprint, but the game isn't using it. The game still uses the default `MordhauPlayerController`.

## Why It's Not Working

In Unreal Engine, the Game Mode determines which Player Controller class to use. Just creating a Player Controller Blueprint isn't enough - you need to tell the Game Mode to use it.

## Solution Options

### Option 1: Check if MSDK Allows Game Mode Override

If MSDK allows you to create a child of the Game Mode Blueprint:

1. Create: `BP_MyGameMode` (child of `BP_DeathmatchGameMode` or similar)
2. In Class Defaults, set:
   - **Player Controller Class**: Your custom Player Controller Blueprint
3. Configure Game.ini to use your Game Mode (if possible)

**Problem:** This might not work if MSDK doesn't allow Game Mode modification.

### Option 2: Use Player Controller Begin Play (If It Gets Called)

Even if the game doesn't use your Player Controller as the default, you might be able to hook into the existing Player Controller's Begin Play.

**Try this in your Player Controller Blueprint:**

```
Event Begin Play
  → Call Parent Function: Begin Play
  → Print String
    In String: "=== CUSTOM PLAYER CONTROLLER BEGIN PLAY ==="
    Print to Screen: ✅ Checked
    Print to Log: ✅ Checked
    Duration: 10.0
```

**Then check the log** - if you see this message, your Player Controller IS being used!

### Option 3: Spawn Actor from Player Controller

If your Player Controller's Begin Play runs, you can spawn your Actor from there:

```
Event Begin Play
  → Call Parent Function: Begin Play
  → Delay (1.0 seconds)
  → Get World
  → Spawn Actor from Class
    Class: BP_TurdLogsActor
    Transform: (0, 0, 0)
  → Print String
    In String: "Spawned Actor from Player Controller!"
    Print to Log: ✅ Checked
```

### Option 4: Check Game.ini for Player Controller Override

Try adding this to `Game.ini` under `[/Script/Mordhau.MordhauGameMode]`:

```ini
PlayerControllerClass=/TurdLogsMod/BP_MyPlayerController.BP_MyPlayerController_C
```

**Note:** This might not work - it depends on whether Mordhau's Game Mode supports this property.

## What to Check

1. **What's the exact name of your Player Controller Blueprint?**
   - Right-click it → Copy Reference
   - Share the path

2. **Does your Player Controller's Begin Play run?**
   - Add a print statement
   - Check the log

3. **Are there any errors in the log?**
   - Search for your Player Controller's name
   - Look for "Couldn't find" or "Failed to load"

## Current Status

The mod pak file is mounting successfully (line 608 in log), but:
- No print messages from Player Controller
- No errors about Player Controller not found

This suggests the Player Controller Blueprint exists but isn't being instantiated by the game.

## Next Steps

1. **Add a print to your Player Controller's Begin Play**
2. **Repackage and test**
3. **Check the log** - if you see the print, it's working!
4. **If no print appears**, the game isn't using your Player Controller, and we need a different approach

