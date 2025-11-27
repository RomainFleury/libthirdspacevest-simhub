# Star Wars Battlefront 2 (2005) Haptic Integration

> **Status: 🔬 RESEARCH / MEDIUM COMPLEXITY**
>
> SWBF2 (2005) uses Lua mission scripting with event callbacks. This is similar to HL:Alyx but requires mission script modification.

## ⚠️ Important Clarification

**This document is for Star Wars Battlefront 2 (2005)** - the Pandemic engine game with Lua scripting.

**For EA Battlefront 2 (2017)** - see `EA_BATTLEFRONT2_2017_INTEGRATION.md` instead.

**Star Wars Battlefront 2 (2005)** uses the **Pandemic engine** with Lua scripting, NOT Frostbite.

**Frosty Mod** is for the newer EA Battlefront games (2015/2017) which use Frostbite engine. That tool is not relevant for the 2005 game.

## Game Engine & Modding

| Aspect | SWBF2 (2005) | EA Battlefront (2015/2017) |
|--------|--------------|----------------------------|
| **Engine** | Pandemic Engine | Frostbite Engine |
| **Scripting** | Lua (mission scripts) | Frostbite (different system) |
| **Mod Tool** | ZeroEditor | Frosty Mod |
| **Mod Format** | `.lua` mission scripts | `.fbmod` archives |

This document is for **SWBF2 (2005)** only.

---

## SWBF2 Scripting System

Based on the [official documentation](https://sites.google.com/site/swbf2modtoolsdocumentation/battlefront2_scripting_system), SWBF2 uses:

### Event-Driven Architecture

- **ScriptPreInit, ScriptInit, ScriptPostLoad** - Called automatically during mission load
- **Events** - Triggered by game actions (damage, death, spawn, etc.)
- **Callbacks** - Functions registered to respond to events
- **No Update Loop** - The game does NOT call a function every frame

### Key Events for Haptics

From the documentation, these events are perfect for haptic feedback:

| Event | Signature | Description |
|-------|-----------|-------------|
| **CharacterDeath** | `function (player, killer)` | Player or AI dies |
| **CharacterSpawn** | `function (player)` | Player or AI spawns |
| **HealthChange** | `function (object, health)` | Object's health changes |
| **ShieldChange** | `function (object, shield)` | Object's shield changes |
| **CharacterEnterVehicle** | `function (player, vehicle)` | Player enters vehicle |
| **CharacterLandedFlyer** | `function (player, flyer)` | Player lands flyer |

### Event Registration

Events are registered using functions like:

```lua
-- Register callback for character death
OnCharacterDeath(function(player, killer)
    -- This function is called when any character dies
    print("Character died!")
end)

-- Register with filter (team-specific)
OnCharacterDeathTeam(function(player, killer)
    -- Only called for team 1 deaths
end, 1)
```

---

## Integration Approach

### Approach: Mission Script Modification + File Output

**Complexity: MEDIUM** | **Feasibility: HIGH**

This follows the same pattern as HL:Alyx:

```
┌─────────────────────────────────────────────────────────┐
│  Star Wars Battlefront 2 (2005)                         │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Mission Script (haptic_events.lua)               │   │
│  │  - Registers OnCharacterDeath, OnHealthChange    │   │
│  │  - Writes events to file                          │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ writes events
┌─────────────────────────────────────────────────────────┐
│  haptic_events.log                                       │
│  (in game directory or user data folder)                 │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file watcher
┌─────────────────────────────────────────────────────────┐
│  Python Integration (integrations/swbf2/)                │
│  • File watcher (polling)                                │
│  • Event parser                                          │
│  • Event-to-haptic mapper                                │
│  • TCP connection to vest daemon                        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ TCP commands
┌─────────────────────────────────────────────────────────┐
│  Vest Daemon (port 5050)                                 │
│  └── Third Space Vest                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create Lua Mission Script

**File:** `haptic_events.lua` (mission script)

This script will:
1. Register event callbacks for damage, death, spawn, etc.
2. Write formatted events to a log file
3. Be loaded by the game's mission system

**Example Structure:**

```lua
-- haptic_events.lua
-- Third Space Vest Haptic Integration for SWBF2

-- File to write events to
local log_file = "haptic_events.log"
local log_path = nil

-- Initialize logging
function ScriptInit()
    -- Determine log file path
    -- Could be in game directory or user data folder
    log_path = GetGameDirectory() .. "\\" .. log_file
    -- Or use a custom path
end

-- Register character death event
OnCharacterDeath(function(player, killer)
    local event = string.format("DEATH|%s|%s\n", 
        GetEntityName(player) or "unknown",
        GetEntityName(killer) or "unknown")
    WriteToFile(log_path, event)
end)

-- Register health change event (for damage)
OnHealthChange(function(object, health)
    -- Check if it's a player character
    if IsCharacter(object) then
        local player = GetCharacterPlayer(object)
        if player then
            local event = string.format("DAMAGE|%s|%d\n",
                GetEntityName(object) or "unknown",
                health)
            WriteToFile(log_path, event)
        end
    end
end)

-- Register spawn event
OnCharacterSpawn(function(player)
    local event = string.format("SPAWN|%s\n",
        GetEntityName(player) or "unknown")
    WriteToFile(log_path, event)
end)

-- Register vehicle entry
OnCharacterEnterVehicle(function(player, vehicle)
    local event = string.format("VEHICLE_ENTER|%s|%s\n",
        GetEntityName(player) or "unknown",
        GetEntityName(vehicle) or "unknown")
    WriteToFile(log_path, event)
end)

-- Helper function to write to file
function WriteToFile(path, content)
    local file = io.open(path, "a")
    if file then
        file:write(content)
        file:close()
    end
end
```

**Challenges:**
- Need to verify Lua file I/O functions available in SWBF2
- May need to use different logging method (console output?)
- Need to determine correct file path

### Phase 2: File Location & Loading

**Research Needed:**
1. Where are mission scripts located?
   - Likely: `GameData\Addon\*\Scripts\*.lua`
   - Or: `GameData\Common\Scripts\*.lua`
2. How are scripts loaded?
   - ZeroEditor may have script assignment
   - Or scripts auto-load from specific folders
3. Can we write to files?
   - Lua `io.open()` may be restricted
   - Alternative: Write to console, capture with `-log` flag

### Phase 3: Python File Watcher

**File:** `modern-third-space/src/modern_third_space/integrations/swbf2.py`

Similar to HL:Alyx integration:

```python
async def watch_swbf2_events(log_path: Path, callback):
    """Watch haptic_events.log for new events."""
    last_pos = 0
    while True:
        try:
            with open(log_path, 'r') as f:
                f.seek(last_pos)
                for line in f:
                    event = parse_swbf2_event(line)
                    await callback(event)
                last_pos = f.tell()
        except (IOError, FileNotFoundError):
            pass
        await asyncio.sleep(0.05)  # 50ms poll
```

### Phase 4: Event Parser & Mapper

**Event Format:**
```
DEATH|player_name|killer_name
DAMAGE|player_name|health_remaining
SPAWN|player_name
VEHICLE_ENTER|player_name|vehicle_name
```

Map to haptic feedback:
- **DEATH** → Full vest pulse (all cells, high intensity)
- **DAMAGE** → Directional impact (need to calculate angle)
- **SPAWN** → Light pulse (respawn feedback)
- **VEHICLE_ENTER** → Medium pulse (contextual feedback)

---

## Event-to-Haptic Mapping

### Priority Events (Phase 1)

| Game Event | Vest Response | Cells | Intensity | Notes |
|------------|---------------|-------|-----------|-------|
| **CharacterDeath** | Full body pulse | All 8 | 10 (max) | Death feedback |
| **HealthChange** (damage) | Directional impact | Based on angle | Scaled by damage | Need damage direction |
| **CharacterSpawn** | Light pulse | All 8 | 2 | Respawn feedback |
| **ShieldChange** (hit) | Quick pulse | Front cells | 3 | Shield hit |

### Advanced Events (Phase 2)

| Game Event | Vest Response | Notes |
|------------|---------------|-------|
| **CharacterEnterVehicle** | Medium pulse | Entering vehicle |
| **CharacterLandedFlyer** | Impact pulse | Landing impact |
| **Weapon Fire** | Recoil pulse | Front cells, light |

### Directional Damage

SWBF2 doesn't provide damage angle in events. Options:
1. **Calculate from player position** - Compare player and attacker positions
2. **Use generic zones** - Front/back/left/right based on health change pattern
3. **Skip direction** - Use all cells for damage events

---

## Research Needed

### 1. Lua File I/O Availability

**Question:** Can SWBF2 Lua scripts write to files?

**Test:**
```lua
-- Test script
local file = io.open("test.txt", "w")
if file then
    file:write("test")
    file:close()
    print("File I/O works!")
else
    print("File I/O restricted")
end
```

**Alternative:** If file I/O is restricted, use console output and capture with log file.

### 2. Mission Script Location

**Locations to check:**
```
SteamLibrary\steamapps\common\Star Wars Battlefront II\GameData\Addon\
SteamLibrary\steamapps\common\Star Wars Battlefront II\GameData\Common\Scripts\
```

### 3. ZeroEditor Script Assignment

- How to assign scripts to missions?
- Can scripts be loaded globally (all missions)?
- Or must be per-mission?

### 4. Console Log Capture

If file I/O doesn't work:
- Use `print()` or `dprint()` in Lua
- Capture console output with `-log` launch option
- Parse log file similar to HL:Alyx

---

## Resources

### Official Documentation

- [SWBF2 Scripting System](https://sites.google.com/site/swbf2modtoolsdocumentation/battlefront2_scripting_system) - Event reference
- [SWBF2 Mod Tools Documentation](https://sites.google.com/site/swbf2modtoolsdocumentation/) - Full modding docs

### Tools

- **ZeroEditor** - Mission editor (included with game or mod tools)
- **Lua** - Scripting language (5.0 or 5.1 likely)

### Community

- SWBF2 modding forums/communities
- Check for existing haptic mods (likely none)

---

## Comparison with HL:Alyx

| Aspect | HL:Alyx | SWBF2 |
|--------|---------|-------|
| **Scripting** | Lua (VScript) | Lua (Mission Scripts) |
| **Event System** | `ListenToGameEvent()` | `OnCharacterDeath()` callbacks |
| **Output Method** | Console log (`-condebug`) | File write OR console log |
| **Script Location** | `game/hlvr/scripts/vscripts/` | `GameData/Addon/*/Scripts/` |
| **Loading** | Auto-loaded | Mission-specific or global |
| **Complexity** | Medium | Medium |

**Key Difference:** HL:Alyx scripts are always loaded. SWBF2 scripts may be mission-specific.

---

## Next Steps

- [ ] **Research Lua file I/O** - Test if `io.open()` works in SWBF2
- [ ] **Find script location** - Determine where mission scripts go
- [ ] **Test event registration** - Create minimal script that registers events
- [ ] **Test output method** - Verify file write or console log works
- [ ] **Create prototype script** - Basic death/damage event logging
- [ ] **Build Python watcher** - File watcher similar to HL:Alyx
- [ ] **Test end-to-end** - Verify events flow from game → file → Python → vest

---

## Verdict

| Factor | Assessment |
|--------|------------|
| **Technical Feasibility** | HIGH - Lua scripting is well-documented |
| **Learning Curve** | MEDIUM - Lua is straightforward, but need to understand SWBF2 API |
| **Development Time** | 10-20 hours estimated |
| **Existing Resources** | GOOD - Official documentation available |
| **Community Support** | MEDIUM - Active modding community |

### Recommendation

This is **highly feasible** and similar to HL:Alyx. The main unknowns are:
1. Whether Lua file I/O works (if not, use console log)
2. Where scripts are loaded from
3. How to make scripts load globally vs per-mission

Start with a simple test script to verify event registration and output method, then build from there.

