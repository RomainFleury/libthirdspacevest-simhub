# Kingdom Come: Deliverance Integration Research

## Game Overview

Kingdom Come: Deliverance is a realistic medieval RPG by Warhorse Studios, built on **CryEngine**.

## Key Differences from Other Games

**⚠️ Important:** KCD uses **CryEngine**, not Unity. This is fundamentally different from:
- SUPERHOT VR (Unity + MelonLoader)
- Pistol Whip (Unity + MelonLoader)
- HL:Alyx (Source 2 + Lua scripts)

## Modding Framework

### Official Tools

Warhorse Studios provides official modding tools:
- **CryEngine Sandbox Editor** - Modified version for KCD
- **SKALD** - Writing tool for quests, dialogues, events
- Additional tools (Storm, Swift, Shader Cache Generator)

### Community Tools

- **ModForge** - Desktop tool to read, edit, and export game data into .pak mods
- **KCD Mod Builder** - Converts mod project folders into compatible format

## Integration Approaches

### Approach 1: Telemetry Data Access ⭐ (EXPLORE, BUT LIKELY INSUFFICIENT)

**Key Discovery:** KCD 2 has telemetry metrics that are **stored locally on your device**. The Day One Patch added "additional telemetry metrics".

**⚠️ Note:** Telemetry is likely focused on **performance metrics** (FPS, memory, crashes) rather than gameplay events. Worth exploring, but may not contain damage/health/combat data.

**How it works:**
1. Find where KCD stores telemetry files locally
2. Analyze telemetry data structure
3. Verify if gameplay events are included (likely not)
4. If insufficient, focus on other approaches

**Research Needed:**
- [ ] Find telemetry file location (likely AppData or game directory)
- [ ] Document telemetry format (JSON, XML, binary?)
- [ ] **Verify if gameplay events are included** (likely only performance data)
- [ ] If insufficient, mark as not viable

**References:**
- [KCD Privacy Policy](https://legal.kingdomcomerpg.com/privacy) - Mentions telemetry stored locally
- [KCD 2 Patch Notes](https://www.gamewatcher.com/news/kingdom-come-deliverance-2-patch-notes-roadmap) - "Added additional telemetry metrics"

### Approach 2: Lua Scripting (via KCD API) ⭐⭐⭐ (PROMISING)

**There's an [unofficial KCD coding guide](https://github.com/benjaminfoo/kcd_coding_guide) for Lua scripting.**

1. Use KCD's Lua API to hook game events
2. Write events to file or send via TCP
3. Python integration watches file or receives TCP

**Research Needed:**
- [ ] Review [KCD Coding Guide](https://github.com/benjaminfoo/kcd_coding_guide)
- [ ] Learn KCD Lua API basics
- [ ] Test Lua script execution
- [ ] Test if damage/health/combat events can be accessed

### Approach 3: Log File Watching ⭐⭐ (RECOMMENDED)

**Similar to HL:Alyx integration**

1. Find where KCD writes log files
2. Watch log file for events
3. Parse events (damage, health, combat)
4. Map to haptic effects

**Research Needed:**
- [ ] Find log file location
- [ ] Document log format
- [ ] Identify available events

### Approach 2: CryEngine Mod

**Create a mod using CryEngine Sandbox Editor**

1. Learn CryEngine modding
2. Hook game events (combat, damage, health)
3. Write events to file or send via TCP
4. Python integration watches file or receives TCP

**Research Needed:**
- [ ] Review CryEngine documentation
- [ ] Review existing KCD mods
- [ ] Learn FlowGraph basics
- [ ] Test mod creation

## Game Events to Track

### Priority 1: Combat & Damage
- Player damage (amount, type, body part if available)
- Health changes
- Combat events (hit, block, parry)
- Death

### Priority 2: Status Effects
- Bleeding
- Injuries
- Exhaustion/Hunger

### Priority 3: Actions
- Weapon swings
- Blocks/Parries
- Archery
- Mounted combat

## Resources

- **Official Modding Tools**: [Warhorse Studios Press Release](https://press.kingdomcomerpg.com/press-release/warhorse-studios-releases-modding-tools/)
- **ModForge**: https://github.com/Destuur/ModForge
- **KCD Mod Builder**: https://github.com/Antstar609/KCD-Mod-Packer
- **CryEngine Documentation**: [CryEngine Wiki](https://docs.cryengine.com/)

## Next Steps

1. **Find Log Files** - Locate KCD log file location
2. **Review Existing Mods** - Understand how mods hook events
3. **Test Log Watching** - Create prototype if logs exist
4. **OR Learn CryEngine** - If logs insufficient, learn modding

See `docs-external-integrations-ideas/KINGDOM_COME_DELIVERANCE_INTEGRATION.md` for detailed strategy.

