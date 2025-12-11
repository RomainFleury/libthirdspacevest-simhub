# TurdLogsMod - Minimal Test Mod Setup Guide

A simple test mod that prints messages to verify your Mordhau modding setup works.

## Goal

Create a mod that:
- Prints "Hello yolo" on Begin Play
- Prints tick messages continuously
- Works when you **host** a game (for initial testing)

---

## Step 1: Create the Actor (Not Component!)

**Skip the Component for now - just create a simple Actor.**

1. Open **MORDHAU Editor**
2. In Content Browser, right-click → **Blueprint Class**
3. Select **Actor** as parent class
4. Name it: `BP_TurdLogsActor`
5. Click **Create**

### Step 1.1: Add Begin Play Logic

1. Open `BP_TurdLogsActor`
2. In **Class Defaults**, set:
   - **Start with Tick Enabled**: ✅ Checked
3. In the **Event Graph**, add:

```
Event Begin Play
  → Print String
    In String: "=== TURDLOGS ACTOR SPAWNED ==="
    Print to Screen: ✅ Checked
    Print to Log: ✅ Checked
    Duration: 10.0
```

### Step 1.2: Add Tick Logic

```
Event Tick
  → Print String
    In String: "TurdLogs Tick"
    Print to Screen: ❌ Unchecked (too spammy)
    Print to Log: ✅ Checked
    Duration: 0.0
```

4. **Compile and Save**

---

## Step 2: Get the Blueprint Path

1. In Content Browser, right-click `BP_TurdLogsActor`
2. Select **Copy Reference**
3. Paste it somewhere to see the path

**Example output:**
```
Blueprint'/TurdLogsMod/BP_TurdLogsActor.BP_TurdLogsActor'
```

**Convert to Game.ini format:**
- Remove `Blueprint'` and `'`
- Add `_C` at the end

**Result:** `/TurdLogsMod/BP_TurdLogsActor.BP_TurdLogsActor_C`

---

## Step 3: Configure Game.ini

**⚠️ IMPORTANT:** This only works when YOU are the server (hosting or local game).

1. Open: `%LOCALAPPDATA%\Mordhau\Saved\Config\WindowsClient\Game.ini`

2. Find the section `[/Script/Mordhau.MordhauGameMode]`

3. Add this line (use YOUR path from Step 2):
   ```ini
   SpawnServerActorsOnMapLoad=/TurdLogsMod/BP_TurdLogsActor.BP_TurdLogsActor_C
   ```

4. Save the file

---

## Step 4: Package and Install

1. In MORDHAU Editor: **File → Package Project → Windows**
2. Wait for packaging
3. Find the `.pak` file in the output folder
4. Copy to: `SteamLibrary\steamapps\common\Mordhau\Mordhau\Content\CustomPaks\`

---

## Step 5: Test (HOST A GAME!)

**⚠️ You MUST host the game for `SpawnServerActorsOnMapLoad` to work!**

1. Launch Mordhau with `-dev -log` flags
2. **Create a local server** or **host a game** (don't join someone else's server!)
3. Check the log: `%LOCALAPPDATA%\Mordhau\Saved\Logs\Mordhau.log`
4. Look for: `=== TURDLOGS ACTOR SPAWNED ===`

**If you see the message when hosting, the mod works!**

---

## Troubleshooting

### Mod mounts but nothing prints

**Verify in log:**
```
Successfully mounted ...TurdLogsMod...pak
```

If you see this but no print messages:

1. **Are you hosting?** `SpawnServerActorsOnMapLoad` only works on servers, not clients joining servers.

2. **Is the path correct?** Check for errors like "Couldn't find file" in the log.

3. **Try both path formats:**
   - `/TurdLogsMod/BP_TurdLogsActor.BP_TurdLogsActor_C`
   - `/TurdLogsMod/Content/BP_TurdLogsActor.BP_TurdLogsActor_C`

### No print messages at all

1. Check if `Print to Log` is ✅ checked in your Blueprint
2. Make sure you compiled the Blueprint before packaging
3. Verify the Actor has Begin Play event connected

---

## Client-Side Spawning (For Joining Servers)

`SpawnServerActorsOnMapLoad` **does NOT work** when joining someone else's server. For client-side mods, you need a different approach:

### Option A: Modify Mordhau Player Controller (If MSDK Allows)

If MSDK lets you create a child Blueprint of `MordhauPlayerController`:

1. Create: `BP_MyPlayerController` (child of `MordhauPlayerController`)
2. In Begin Play: Spawn your Actor
3. Configure the game to use your Player Controller

### Option B: Use mod.io Hooks (If Available)

Check if Mordhau's mod.io integration provides client-side hooks.

### Option C: Accept Server-Only

For now, test by hosting. Client-side spawning in Mordhau requires deeper MSDK knowledge.

---

## Quick Reference

| What | Value |
|------|-------|
| Blueprint path (example) | `/TurdLogsMod/BP_TurdLogsActor.BP_TurdLogsActor_C` |
| Game.ini location | `%LOCALAPPDATA%\Mordhau\Saved\Config\WindowsClient\Game.ini` |
| CustomPaks folder | `SteamLibrary\steamapps\common\Mordhau\Mordhau\Content\CustomPaks\` |
| Log file | `%LOCALAPPDATA%\Mordhau\Saved\Logs\Mordhau.log` |
| Launch flags | `-dev -log` |

---

## Success Checklist

- [ ] Mod mounts successfully (check log for "Successfully mounted")
- [ ] No errors about "Couldn't find file" in log
- [ ] When **hosting** a game, see "=== TURDLOGS ACTOR SPAWNED ===" in log
- [ ] See "TurdLogs Tick" messages repeating in log

**If all boxes are checked when hosting, your mod setup is correct!**
