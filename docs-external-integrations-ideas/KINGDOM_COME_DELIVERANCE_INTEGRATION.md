# Kingdom Come: Deliverance Integration

## Status: 🔍 RESEARCH PHASE

## Overview

Kingdom Come: Deliverance (KCD) is a realistic medieval RPG developed by Warhorse Studios. The game features:
- Realistic combat system (melee, archery, mounted combat)
- Health and stamina system
- Status effects (bleeding, injuries, exhaustion)
- First-person perspective
- Historical setting (medieval Bohemia)

**Key Game Features:**
- Realistic damage system (body parts, bleeding, injuries)
- Health and stamina tracking
- Combat events (hits, blocks, parries)
- Status effects (bleeding, injuries, exhaustion, hunger)
- Mounted combat
- Archery

## Engine & Modding Framework

### CryEngine (Not Unity!)

**⚠️ Important:** Kingdom Come: Deliverance uses **CryEngine**, not Unity. This is fundamentally different from games like SUPERHOT VR and Pistol Whip.

| Aspect | Unity Games | Kingdom Come: Deliverance |
|--------|-------------|---------------------------|
| **Engine** | Unity | CryEngine |
| **Mod Framework** | MelonLoader / BepInEx | Official CryEngine Sandbox Editor |
| **Mod Language** | C# with Harmony | C++ / Lua / FlowGraph |
| **Mod Format** | .dll files | .pak files |
| **Injection** | Runtime C# injection | Asset/mod loading |

### Official Modding Tools

Warhorse Studios provides official modding tools:

1. **CryEngine Sandbox Editor** - Modified version for KCD
2. **SKALD** - Writing tool for quests, dialogues, events
3. **Additional Tools** - Storm, Swift, Shader Cache Generator

**Download:** Available for free on PC

### Community Tools

- **ModForge** - Desktop tool to read, edit, and export game data into .pak mods
- **KCD Mod Builder** - Converts mod project folders into compatible format
- **KCD2 Mod Manager** - Mod manager for Kingdom Come: Deliverance 2

## Integration Approaches

### Approach 1: Log File Watching ⭐⭐⭐

**Complexity: MEDIUM** | **Feasibility: HIGH**

Monitor game log files for events (similar to HL:Alyx integration).

**How it works:**
1. **KCD writes logs** - Game writes events to log files
2. **File watcher** - Python watches log file for changes
3. **Event parsing** - Parse log lines for damage, health, combat events
4. **Haptic mapping** - Map events to vest cells

```
┌─────────────────────────────────────────────────────────┐
│  Kingdom Come: Deliverance                              │
│  • Writes events to log file                            │
│  • Location: TBD (need to find)                        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file writes
┌─────────────────────────────────────────────────────────┐
│  Log File                                               │
│  • Combat events                                        │
│  • Damage events                                        │
│  • Health changes                                      │
│  • Status effects                                       │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file watcher
┌─────────────────────────────────────────────────────────┐
│  Python Integration                                     │
│  • Watches log file (like HL:Alyx)                      │
│  • Parses events                                        │
│  • Maps body parts → vest cells                        │
│  • TCP to daemon                                       │
└─────────────────────────────────────────────────────────┘
```

**Advantages:**
- ✅ **No mod required** - Works with vanilla game
- ✅ **Real-time** - File watcher detects changes instantly
- ✅ **Simple** - Similar to HL:Alyx integration
- ✅ **No API calls** - Pure local file access

**Challenges:**
- ❓ Need to find where KCD writes logs
- ❓ May not contain all needed data (body parts, etc.)
- ❓ Log format may change with updates
- ❓ Need to parse log format

**Research Needed:**
- [ ] Find KCD log file location
- [ ] Document log file format
- [ ] Identify what events are logged
- [ ] Test if body part damage is in logs

### Approach 2: CryEngine Mod - Event Hooks ⭐⭐

**Complexity: HIGH** | **Feasibility: MEDIUM**

Create a CryEngine mod that hooks game events and writes to file/TCP.

**How it works:**
1. **Create KCD mod** - Use CryEngine Sandbox Editor
2. **Hook game events** - Use FlowGraph or C++ to hook combat/damage events
3. **Write to file** - Output events to log file (like HL:Alyx)
4. **OR TCP client** - Send events directly to daemon (like SUPERHOT/Pistol Whip)
5. **Python integration** - File watcher or TCP server

**Advantages:**
- ✅ **Full control** - Can track exactly what we need
- ✅ **Real-time** - Direct event hooks
- ✅ **Body part data** - Can access detailed damage info

**Challenges:**
- ❌ Requires CryEngine modding knowledge
- ❌ Need to learn CryEngine Sandbox Editor
- ❌ Needs to be updated with game patches
- ❌ More complex than Unity modding

**Research Needed:**
- [ ] Learn CryEngine modding basics
- [ ] Review existing KCD mods for event hooking examples
- [ ] Test mod creation workflow
- [ ] Document event hooking methods

### Approach 3: Memory Reading (Not Recommended)

**Complexity: EXTREME** | **Feasibility: LOW**

Read game data directly from memory.

**Problems:**
- Breaks with every game update
- May trigger anti-cheat
- Requires reverse engineering
- High risk of issues

## Game Events to Track

### Priority 1: Core Combat Events

1. **Player Damage**
   - Body part hit (if available)
   - Damage amount
   - Damage type (melee, arrow, fall)
   - Direction (if available)

2. **Health Status**
   - Health value
   - Health changes
   - Critical health

3. **Combat Events**
   - Hit landed
   - Block successful
   - Parry successful
   - Hit received

4. **Death**
   - Player death event
   - Cause of death

### Priority 2: Status Effects

5. **Bleeding**
   - Bleeding started/stopped
   - Bleeding intensity

6. **Injuries**
   - Injury on body part
   - Injury severity

7. **Exhaustion/Hunger**
   - Status effect active
   - Intensity

### Priority 3: Combat Actions

8. **Weapon Swing**
   - Swing started
   - Weapon type

9. **Block/Parry**
   - Block/parry successful
   - Direction

10. **Archery**
    - Arrow fired
    - Arrow hit

### Priority 4: Environmental

11. **Falls**
    - Fall damage
    - Height

12. **Mounted Combat**
    - Mount hit
    - Mount damage

## Haptic Mapping Strategy

### Body Part → Vest Cell Mapping

If body part data is available:

```
KCD Body Part          → Vest Cell(s)
─────────────────────────────────────────
Head                  → Upper front (cells 0, 1)
Torso                 → Front upper (cells 0, 1)
Stomach               → Front lower (cells 2, 3)
Left Arm              → Front left (cells 0, 2)
Right Arm             → Front right (cells 1, 3)
Left Leg              → Back left (cells 4, 6)
Right Leg             → Back right (cells 5, 7)
```

### Damage Intensity Scaling

- **Light damage** (< 20 HP): Single cell, low intensity (3-5)
- **Medium damage** (20-40 HP): Multiple cells, medium intensity (5-7)
- **Heavy damage** (> 40 HP): All affected cells, high intensity (7-9)
- **Critical damage** (health < 20%): Maximum intensity (9-10)

### Combat Events

- **Hit landed**: Quick pulse on front cells
- **Block/Parry**: Sharp pulse on front cells
- **Hit received**: Damage-based intensity on affected cells
- **Death**: Full vest pulse, all cells, max intensity

## Research Tasks

### Immediate (Phase 1)

1. **Log File Research**
   - [ ] Find KCD log file location
   - [ ] Document log file format
   - [ ] Identify what events are logged
   - [ ] Test if body part damage is in logs
   - [ ] Create log parser prototype

2. **CryEngine Modding Research**
   - [ ] Review CryEngine Sandbox Editor documentation
   - [ ] Review existing KCD mods for event hooking examples
   - [ ] Learn FlowGraph basics
   - [ ] Test mod creation workflow

3. **Event Mapping**
   - [ ] Map available events to haptic effects
   - [ ] Design body part → cell mapping (if data available)
   - [ ] Design intensity scaling

### Future (Phase 2) - Implementation

4. **Python Integration**
   - [ ] Create log file watcher (if using Approach 1)
   - [ ] OR create CryEngine mod (if using Approach 2)
   - [ ] Implement event detection
   - [ ] Integrate with daemon

5. **Testing**
   - [ ] Test in-game with various scenarios
   - [ ] Calibrate intensity levels
   - [ ] Test body part mapping accuracy (if available)

## Resources

- **Official Modding Tools**: [Warhorse Studios Press Release](https://press.kingdomcomerpg.com/press-release/warhorse-studios-releases-modding-tools/)
- **ModForge**: https://github.com/Destuur/ModForge
- **KCD Mod Builder**: https://github.com/Antstar609/KCD-Mod-Packer
- **CryEngine Documentation**: [CryEngine Wiki](https://docs.cryengine.com/)

## Notes

- **⚠️ CryEngine, Not Unity**: This is a different engine from Unity games. Modding approach will be different.
- **Official Tools**: Warhorse provides official modding tools, which is helpful.
- **Log Files**: If KCD writes logs, this is the simplest approach (like HL:Alyx).
- **Body Part Tracking**: Need to verify if body part damage data is available in logs or via modding.

## Next Steps

1. **Find Log Files** - Locate KCD log file location and format
2. **Review Existing Mods** - Look at community mods to understand event hooking
3. **Test Log Watching** - Create prototype log file watcher
4. **OR Learn CryEngine** - If logs don't have enough data, learn CryEngine modding

