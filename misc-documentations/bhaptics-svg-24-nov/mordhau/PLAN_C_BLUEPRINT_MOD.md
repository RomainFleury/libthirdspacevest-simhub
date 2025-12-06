# Plan C: Full Blueprint Mod - Direct Event Hooks

This guide explains how to create a Blueprint Actor Component mod for Mordhau that directly hooks into game events and logs them to a file for the daemon to process.

## Overview

**Status: 🔨 IN DEVELOPMENT**

This approach creates a Blueprint mod that:
1. ✅ Detects player damage events
2. ✅ Detects parry events
3. ✅ Detects fall damage events
4. ✅ Writes events to a log file
5. ✅ Python daemon watches the log file

**Advantages:**
- ✅ Most accurate - Direct access to game events
- ✅ Can get exact damage amounts, directions, types
- ✅ No screen capture overhead
- ✅ Works regardless of visual settings

**Requirements:**
- MORDHAU Editor (from Epic Games Store)
- Basic understanding of Blueprints
- MSDK (Mordhau SDK) - included with MORDHAU Editor

---

## 🚀 MINIMAL VERSION (Start Here!)

**Goal:** Just detect damage and log it. We'll add parry, fall damage, and direction later.

### Step 1: Create the Component

1. Open **MORDHAU Editor**
2. In Content Browser, right-click → **Blueprint Class**
3. Select **Actor Component** as parent class
4. Name it: `BP_ThirdSpaceHaptics`

### Step 2: Component Properties

In **Class Defaults**:
- **Start with Tick Enabled**: ✅ Checked
- **Tick Interval**: `0.0`

### Step 3: Add Variables

Add these variables:
- `LastHealth` (Float) - Default: `100.0`
- `MordhauCharacter` (Mordhau Character) - Default: (None)

### Step 4: Initialize (Begin Play)

**Event:** `Begin Play`

**Nodes:**
1. **Get View Target Character** → Set `MordhauCharacter` variable
2. **Get Health** (from `MordhauCharacter`) → **To Float** → Set `LastHealth` variable

### Step 5: Create Write Event Function

1. Click **Functions** → **+ Function**
2. Name: `WriteDamageEvent`
3. Add Input: `DamageAmount` (Float)
4. Function logic:

```
Get Game Time In Seconds
  → Multiply (× 1000) to get milliseconds
  → Convert to Integer
  → Format String
    Format: "{0}|DAMAGE|unknown|generic|{1}"
    {0} = Timestamp (Integer)
    {1} = DamageAmount (Float)
  → Print to Console and Log
    In String: (formatted string)
    Duration: 0.0
```

### Step 6: Detect Damage (Tick Event)

**Event:** `Tick`

**Nodes:**
1. **Is Valid** (check `MordhauCharacter`)
2. **Get Health** (from `MordhauCharacter`) → **To Float**
3. **Branch**: Is Current Health < LastHealth?
   - **TRUE**:
     - **Float - Float** (LastHealth - Current Health) = Damage
     - **Call WriteDamageEvent** (DamageAmount = Damage)
     - **Set LastHealth** = Current Health
   - **FALSE**:
     - **Set LastHealth** = Current Health

### Step 7: Test

1. Compile and save
2. Package as .pak file
3. Place in `CustomPaks` folder
4. Launch Mordhau and take damage
5. Check log: `%LOCALAPPDATA%\Mordhau\Saved\Logs\Mordhau.log`
6. Look for: `12345|DAMAGE|unknown|generic|25.5`

**That's it!** The daemon will automatically detect and process these events.

---

## Full Version (Advanced - Do Later)

## Blueprint Actor Component Setup

### Step 1: Create the Component

1. Open **MORDHAU Editor**
2. In Content Browser, right-click → **Blueprint Class**
3. Select **Actor Component** as parent class
4. Name it: `BP_ThirdSpaceHaptics` (or similar)

### Step 2: Component Properties

In the Component's **Details** panel, set:
- **Component Name**: `ThirdSpaceHaptics`
- **Can Tick**: ✅ **Enabled** (we need Tick for some checks)
- **Tick Interval**: `0.0` (every frame, or adjust as needed)

### Step 3: Variables

Add these variables to your component:

| Variable Name | Type | Default Value | Description |
|---------------|------|---------------|-------------|
| `LogFilePath` | String | `%LOCALAPPDATA%\Mordhau\haptic_events.log` | Path to log file |
| `LastHealth` | Float | `100.0` | Track health for damage detection (convert from Byte) |
| `LastParryTime` | Float | `0.0` | Cooldown for parry detection |
| `ParryCooldown` | Float | `0.5` | Seconds between parry detections |
| `LastFallDamageTime` | Float | `0.0` | Cooldown for fall damage |
| `FallDamageCooldown` | Float | `1.0` | Seconds between fall damage detections |
| `MordhauCharacter` | Mordhau Character | (None) | Reference to Mordhau character (for health access) |

## Minimal Version (Start Here!)

Let's start simple - just detect damage and log it. We'll add parry, fall damage, and direction detection later.

### Step 1: Create a Custom Function to Write Events

1. In your Blueprint, click **Functions** → **+ Function**
2. Name it: `WriteDamageEvent`
3. Add these **Inputs**:
   - `DamageAmount` (Float)
4. In the function, add this logic:

```
WriteDamageEvent Function:
  Input: DamageAmount (Float)
  
  Logic:
    → Get Game Time In Seconds
    → Multiply by 1000 (to get milliseconds)
    → Convert to Integer (or keep as Float)
    → Format String:
       Format: "{0}|DAMAGE|unknown|generic|{1}"
       {0} = Timestamp (milliseconds)
       {1} = DamageAmount
    → Print to Console and Log
      - In String: (the formatted string)
      - Text Color: (default)
      - Duration: 0.0
```

**Format String node setup:**
- Format: `{0}|DAMAGE|unknown|generic|{1}`
- {0}: Timestamp (Integer or Float)
- {1}: DamageAmount (Float)

### Step 2: Initialize Component

**Event:** `Begin Play`

**Blueprint Logic:**
```
Begin Play
  → Get View Target Character
  → Set MordhauCharacter variable
  → Get Health (from MordhauCharacter)
  → To Float (convert Byte to Float)
  → Set LastHealth variable
```

### Step 3: Detect Damage in Tick

**Event:** `Tick`

**Blueprint Logic:**
```
Tick
  → Check if MordhauCharacter is valid (Is Valid node)
  → Get Health (from MordhauCharacter)
  → To Float (convert Byte to Float)
  → Branch: Is Current Health < LastHealth?
    → TRUE:
      → Calculate Damage = LastHealth - Current Health
      → Call WriteDamageEvent (DamageAmount = Damage)
      → Set LastHealth = Current Health
    → FALSE:
      → Set LastHealth = Current Health
```

That's it! This will:
- ✅ Detect when you take damage
- ✅ Calculate the damage amount
- ✅ Log it to the game's log file
- ✅ The daemon will automatically pick it up

**Test it:**
1. Compile and save your Blueprint
2. Package it as a .pak file
3. Place it in `CustomPaks` folder
4. Launch Mordhau and take some damage
5. Check the log file: `%LOCALAPPDATA%\Mordhau\Saved\Logs\Mordhau.log`
6. Look for lines like: `12345|DAMAGE|unknown|generic|25.5`

---

## Full Version (Advanced - Do Later)

### Event Hooks

### 1. Initialize Component

**Event:** `Begin Play` (or `Initialize Component`)

**Blueprint Logic:**
```
Begin Play
  → Get View Target Character (directly available in Actor Component)
  → Set MordhauCharacter variable
  → Get Health (from Mordhau Character) - Returns Byte (0-255)
  → Convert Byte to Float (use "To Float" conversion node)
  → Set LastHealth variable
  → Open Log File (see File I/O section below)
```

**Note:** In Mordhau's Actor Component, you can use "Get View Target Character" directly without needing to get the Player Controller or Pawn first. This returns a "Mordhau Character" type, from which you can access health and other Mordhau-specific properties.

### 2. Damage Detection

**Method:** Monitor health changes in `Tick` event

**Blueprint Logic:**
```
Tick
  → Check if MordhauCharacter is valid (Is Valid node)
  → Get Health (from Mordhau Character) - Returns Byte (0-255)
  → Convert Byte to Float (use "To Float" conversion node)
  → Branch: Is Current Health < LastHealth?
    → TRUE:
      → Calculate Damage = LastHealth - Current Health (Float subtraction)
      → Get Damage Direction (see Direction Detection below)
      → Get Damage Type (see Damage Type Detection below)
      → Write Damage Event (see File I/O section)
      → Set LastHealth = Current Health (Float)
    → FALSE:
      → Set LastHealth = Current Health (Float)
```

**Note:** 
- Use the `MordhauCharacter` variable (not PlayerPawn) to access health
- Health is returned as **Byte** (0-255), so you need to convert it to **Float** using a "To Float" conversion node
- In Blueprint, right-click on the Health output pin and select "Convert Byte to Float" or use a "To Float" node
- This conversion is needed for calculations and storing in the Float `LastHealth` variable

**Note:** You may need to use MSDK-specific nodes to get damage information. Look for:
- `On Take Damage` event (if available)
- `Get Last Damage Amount` function
- `Get Last Damage Direction` function
- `Get Last Damage Type` function

### 3. Parry Detection

**Method:** Hook into parry events (if available in MSDK)

**Option A: Direct Event (if MSDK provides it)**
```
On Parry Event (MSDK node)
  → Get Current Time (Get Game Time In Seconds)
  → Branch: Is (Current Time - LastParryTime) > ParryCooldown?
    → TRUE:
      → Write Parry Event (see File I/O section)
      → Set LastParryTime = Current Time
```

**Option B: Monitor Block State**
```
Tick
  → Check if MordhauCharacter is valid
  → Get Is Blocking (from Mordhau Character)
  → Get Was Blocking (store previous frame - add as variable)
  → Branch: Is Blocking = TRUE AND Was Blocking = FALSE?
    → TRUE:
      → Get Current Time (Get Game Time In Seconds)
      → Branch: Is (Current Time - LastParryTime) > ParryCooldown?
        → TRUE:
          → Write Parry Event (see File I/O section)
          → Set LastParryTime = Current Time
  → Set Was Blocking = Is Blocking
```

**Note:** Use the `MordhauCharacter` variable to access blocking state. You may need to add a `Was Blocking` (Boolean) variable to track the previous frame's state.

**Note:** Parry detection may require MSDK-specific nodes. Look for:
- `On Parry` event
- `On Successful Parry` event
- `Get Parry State` function

### 4. Fall Damage Detection

**Method:** Monitor velocity and health changes

**Blueprint Logic:**
```
Tick
  → Check if MordhauCharacter is valid
  → Get Velocity (from Mordhau Character or Movement Component)
  → Get Z Component (from Velocity vector - use Break Vector)
  → Branch: Is Z < -1000? (falling fast)
    → TRUE:
      → Wait for Landing (use On Landed event or check velocity = 0)
      → Get Health (from Mordhau Character) - Returns Byte
      → Convert Byte to Float
      → Branch: Is Current Health < LastHealth?
        → TRUE:
          → Get Current Time (Get Game Time In Seconds)
          → Branch: Is (Current Time - LastFallDamageTime) > FallDamageCooldown?
            → TRUE:
              → Calculate Damage = LastHealth - Current Health
              → Write Fall Damage Event (see File I/O section)
              → Set LastFallDamageTime = Current Time
              → Set LastHealth = Current Health
```

**Note:** Use the `MordhauCharacter` variable to access velocity and health. You may need to get the Movement Component first, or velocity might be directly available on the Mordhau Character.

**Alternative:** Use `On Landed` event if available:
```
On Landed Event
  → Get Landing Velocity (from event)
  → Branch: Is Landing Velocity > Threshold?
    → TRUE:
      → Get Current Health
      → Calculate Damage
      → Write Fall Damage Event
```

## Direction Detection

To determine damage direction, you need the damage source position or angle:

**Method 1: Get Damage Angle (if MSDK provides it)**
```
Get Last Damage Angle (MSDK node)
  → Convert to Direction String:
    - 0-45° or 315-360° → "front"
    - 45-135° → "right"
    - 135-225° → "back"
    - 225-315° → "left"
```

**Method 2: Calculate from Damage Source Position**
```
Get Last Damage Source Position (MSDK node)
  → Get Player Position
  → Calculate Direction Vector = Damage Source - Player Position
  → Get Forward Vector (from Player)
  → Calculate Angle (use Dot Product or Atan2)
  → Convert to Direction String
```

**Method 3: Use Hit Location (if available)**
```
Get Last Hit Location (MSDK node)
  → Compare to Player Position
  → Determine Direction
```

**Fallback:** If direction is not available, use `"unknown"`

## Damage Type Detection

Mordhau has 5 damage types (found in "Mordhau Take Damage" function):
- **Generic** - Generic/unknown damage
- **Melee** - Melee weapon damage (swords, axes, maces, etc.)
- **Ranged** - Ranged weapon damage (bows, crossbows, throwing weapons)
- **Fall** - Fall damage
- **Fire** - Fire damage

**Method:**
When you detect damage, you need to get the damage type. Look for:
- "Get Last Damage Type" node (if available)
- Or use the damage type from the "Mordhau Take Damage" function's input
- Or check the weapon/attack type that caused the damage

**Convert to String for logging:**
```
Get Damage Type (from event or function)
  → Convert to String (lowercase):
    - Generic → "generic"
    - Melee → "melee"
    - Ranged → "ranged"
    - Fall → "fall"
    - Fire → "fire"
```

**Fallback:** If damage type is not available, use `"generic"`

## File I/O

### Writing Events to Log File

**Recommended Approach: Use "Print to Console and Log"**

UE4 Blueprints have a built-in **"Print to Console and Log"** function that writes to both the console and a log file. This is the simplest approach!

**Blueprint Logic for Writing Events:**
```
Write Event Function (Custom Function)
  Inputs:
    - EventType (String): "DAMAGE", "PARRY", "FALL_DAMAGE"
    - Direction (String): "front", "back", "left", "right", "unknown"
    - DamageType (String): "generic", "melee", "ranged", "fall", "fire"
    - Amount (Float): Damage amount or 0 for parry
  
  Logic:
    → Get Current Time (Get Game Time In Seconds)
    → Convert to Milliseconds (Time * 1000)
    → Convert to Integer
    → Format String: "{Timestamp}|{EventType}|{Direction}|{DamageType}|{Amount}"
    → Print to Console and Log
      - In String: Formatted event string
      - Text Color: (optional, can leave default)
      - Duration: 0.0 (we don't need it on screen)
```

**Important Notes:**
- "Print to Console and Log" writes to the game's main log file: `%LOCALAPPDATA%\Mordhau\Saved\Logs\Mordhau.log`
- **This log file location is NOT configurable** - it's the standard UE4 log location
- The daemon will watch this log file and filter for lines matching our event format
- The parser automatically ignores lines that don't match our format (returns None for invalid lines)

**Log File Location:**
- Windows: `C:\Users\<YourUsername>\AppData\Local\Mordhau\Saved\Logs\Mordhau.log`
- Or use: `%LOCALAPPDATA%\Mordhau\Saved\Logs\Mordhau.log`

**Testing:**
1. After implementing, check if events appear in the log file
2. Open the log file and search for lines with the format: `timestamp|EVENT_TYPE|direction|damage_type|amount`
3. The daemon will automatically filter and parse these lines from the main log

## Log File Format

Events are written as pipe-delimited lines in the main game log file. The daemon will automatically filter and parse these lines.

**Format:**
```
timestamp|EVENT_TYPE|direction|damage_type|amount
```

**Examples:**
```
1704067200000|DAMAGE|front|melee|25.5
1704067200200|PARRY|unknown|generic|0
1704067200400|FALL_DAMAGE|back|fall|15.0
1704067200600|DAMAGE|right|ranged|30.0
```

**Fields:**
- **timestamp**: Milliseconds since game start (or epoch, your choice)
- **EVENT_TYPE**: `DAMAGE`, `PARRY`, or `FALL_DAMAGE`
- **direction**: `front`, `back`, `left`, `right`, or `unknown`
- **damage_type**: `generic`, `melee`, `ranged`, `fall`, or `fire`
- **amount**: Damage amount (float, 0 for parry)

**Important:** The log file will contain many other lines (engine logs, game events, etc.). The daemon automatically filters for lines matching this exact format, so other log entries are ignored.

## MSDK Research Needed

Since MSDK documentation may be limited, you'll need to explore:

1. **Damage Events:**
   - Search for "Damage" nodes in Blueprint editor
   - Look for "On Take Damage" events
   - Check Player Controller or Character classes for damage functions

2. **Parry Events:**
   - Search for "Parry" or "Block" nodes
   - Look for "On Parry" or "On Block" events
   - Check Combat/Weapon classes

3. **Fall Damage:**
   - Search for "Land" or "Fall" nodes
   - Look for "On Landed" events
   - Check Character Movement Component

4. **File I/O:**
   - Search for "File" nodes
   - Look for "Save String to File" or "Append to File"
   - May need C++ plugin if Blueprint doesn't support it

## Testing

### Step 1: Test File Writing

1. Create a simple test that writes "TEST|TEST|TEST|TEST|0" on Begin Play
2. Check if file is created at: `%LOCALAPPDATA%\Mordhau\haptic_events.log`
3. Verify file permissions (game may need write access)

### Step 2: Test Damage Detection

1. Load mod in game
2. Take damage from different directions
3. Check log file for DAMAGE events
4. Verify direction and amount are correct

### Step 3: Test Parry Detection

1. Parry attacks
2. Check log file for PARRY events
3. Verify cooldown prevents duplicates

### Step 4: Test Fall Damage

1. Fall from height
2. Check log file for FALL_DAMAGE events
3. Verify damage amount is correct

## Packaging the Mod

Once working:

1. **Cook Content** - Package Blueprint for Windows
2. **Create .pak file** - Use UnrealPak or MORDHAU Editor's packaging
3. **Place in CustomPaks folder:**
   ```
   SteamLibrary\steamapps\common\Mordhau\Mordhau\Content\CustomPaks\
   ```
4. **Test in-game** - Load mod and verify it works

## Integration with Daemon

The Python daemon will watch the log file (see `mordhau_manager.py`). Make sure:
- ✅ Log file path matches daemon's expected path
- ✅ Log format matches parser expectations
- ✅ Events are written immediately (not buffered)
- ✅ File is created with proper permissions

## Troubleshooting

### File Not Created
- Check file path is correct
- Verify game has write permissions
- Try absolute path instead of environment variable

### Events Not Detected
- Check if MSDK nodes are available
- Verify event hooks are connected
- Add debug prints to verify events fire

### Wrong Direction/Amount
- Verify MSDK provides correct data
- Check calculation logic
- Test with known damage sources

### Performance Issues
- Reduce Tick frequency
- Add cooldowns to prevent spam
- Optimize file writes (batch if possible)

## Next Steps

1. ✅ Create Blueprint Actor Component
2. ✅ Implement damage detection
3. ✅ Implement parry detection
4. ✅ Implement fall damage detection
5. ✅ Test file writing
6. ✅ Package and test mod
7. ✅ Verify daemon integration

## Resources

- [MORDHAU Editor](https://store.epicgames.com/en-US/p/mordhau--editor)
- [UE4 Blueprint Documentation](https://docs.unrealengine.com/4.27/en-US/ProgrammingAndScripting/Blueprints/)
- [Mordhau Modding Community](https://mordhaucommunity.org/)
- [mod.io Mordhau](https://mod.io/g/mordhau)

