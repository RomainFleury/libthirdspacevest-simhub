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

### Approach 1: Log File Watching (Recommended First)

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

