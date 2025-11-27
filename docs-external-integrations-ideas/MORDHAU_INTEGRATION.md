# Mordhau Haptic Integration

> **Status: 🔬 RESEARCH / HIGH COMPLEXITY**
>
> Mordhau uses Unreal Engine 4, which is fundamentally different from Unity games we've integrated before. This integration requires specialized knowledge of Unreal Engine Blueprint modding.

## ⚠️ Key Differences from Other Integrations

| Aspect | Unity Games (Superhot, Pistol Whip) | Mordhau (UE4) |
|--------|-------------------------------------|---------------|
| **Engine** | Unity | Unreal Engine 4 |
| **Mod Framework** | MelonLoader / BepInEx | MSDK (Mordhau SDK) |
| **Mod Language** | C# with Harmony patches | Blueprints (visual scripting) |
| **Mod Format** | .dll files | .pak files |
| **Injection** | Runtime C# injection | Packaged asset loading |
| **Learning Curve** | Moderate (C#) | High (UE4 editor + Blueprints) |

## What are .pak Files?

`.pak` files are **Unreal Engine package files** - compressed binary archives containing:
- Blueprint assets (visual scripts)
- Textures, meshes, materials
- Configuration data

They are **NOT** text files and cannot be edited directly. They must be:
1. Created using Unreal Engine 4 editor with MSDK
2. Packaged ("cooked") for the target platform
3. Placed in the game's `CustomPaks` folder

## Mordhau Modding Ecosystem

### MORDHAU Editor (Official SDK)

Triternion provides an **official Unreal Engine 4 Editor** tailored for Mordhau mod creation:

**Download:** [Epic Games Store - MORDHAU Editor](https://store.epicgames.com/en-US/p/mordhau--editor)

This is the proper development environment for creating Mordhau mods, containing:
- Mordhau's game classes and structures
- Blueprint nodes for game events
- Tools for packaging mods into .pak files

### Community Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **mod.io Mordhau** | [mod.io/g/mordhau](https://mod.io/g/mordhau) | Official mod repository |
| **Mordhau Community** | [mordhaucommunity.org](https://mordhaucommunity.org/docs/en/about-mordhau/) | Community documentation |
| **MordhauBuddy** | [shmew.github.io/MordhauBuddy](https://shmew.github.io/MordhauBuddy/index.html) | Mod management tool |
| **MSDK DictionaryLib** | [GitHub](https://github.com/thePeacey/MSDK-DictionaryLib-Kit) | Example mod kit |

### Mod Installation

Mods are placed in:
```
SteamLibrary\steamapps\common\Mordhau\Mordhau\Content\CustomPaks\
```

### Types of Mods

| Type | Description | Use Case |
|------|-------------|----------|
| **Client-side** | Runs on player's machine only | UI, visual effects, **haptics** |
| **Server-side** | Runs on server | Game rules, spawning |
| **Mutators** | Server gameplay modifiers | Custom game modes |

For haptics, we need a **client-side mod** that can detect player damage events.

---

## Integration Approaches

### Approach 1: Blueprint Mod with TCP/File Output (Recommended)

**Complexity: HIGH** | **Feasibility: MEDIUM**

Create a Blueprint mod using MSDK that:
1. Hooks into player damage events via Blueprint event binding
2. Writes event data to a local file OR sends via TCP
3. Our Python daemon monitors the file/receives TCP

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mordhau Game       │     │  Blueprint Mod   │     │  Python Daemon  │
│  (Player damaged)   │────▶│  (Detects event) │────▶│  (Reads output) │
└─────────────────────┘     │  Writes to file  │     │  Triggers vest  │
                            └──────────────────┘     └─────────────────┘
```

**Challenges:**
- Requires learning Unreal Engine + Blueprints
- MSDK may have limited documentation
- Blueprint TCP/file I/O is limited

**What we'd need:**
1. Install Unreal Engine 4 (matching Mordhau's version)
2. Install MSDK
3. Create a Blueprint Actor that:
   - Binds to player damage events
   - Writes to a text file (simpler) or sends TCP (harder)
4. Package as .pak file

### Approach 2: Log File Watching

**Complexity: LOW** | **Feasibility: ❌ NOT VIABLE**

Checked Mordhau logs at `%LOCALAPPDATA%\Mordhau\Saved\Logs\`:
- Only contains engine startup information
- No gameplay events (damage, health, hits)
- Cannot use log-watching approach like HL:Alyx

**Possible extension:** A Blueprint mod could be created that WRITES to a log file when damage occurs, then we watch that custom log. This is essentially Approach 1 with file output.

### Approach 3: Memory Reading (Not Recommended)

**Complexity: EXTREME** | **Feasibility: LOW**

Read player health values directly from game memory using tools like Cheat Engine.

**Problems:**
- Breaks with every game update
- May trigger anti-cheat (EAC)
- Extremely fragile
- Ethical concerns

---

## Research Needed

### 1. Check for Log Output

```powershell
# Check Mordhau log files
Get-ChildItem "$env:LOCALAPPDATA\Mordhau\Saved\Logs\" -Recurse
Get-ChildItem "C:\Program Files (x86)\Steam\steamapps\common\Mordhau\Mordhau\Saved\Logs\" -Recurse

# Try running with debug flags and check logs
# Add to Steam launch options: -log -verbose
```

### 2. Investigate Existing Mods

The "Heartbeat Mod" example we have might provide clues:
- Does it read player health?
- How does it detect health changes?
- Can we decompile/inspect the Blueprint?

**Tools for inspecting .pak files:**
- [UE4 Pak Unpacker](https://github.com/AcidDeathTV/UE4PakUnpacker)
- [UnrealPak](https://docs.unrealengine.com/4.27/en-US/SharingAndReleasing/Patching/GeneralPatching/UnrealPak/)
- [FModel](https://github.com/4sval/FModel) - Asset viewer

### 3. MSDK Documentation

- Find MSDK tutorials/documentation
- Understand available Blueprint nodes
- Check Discord servers for modding help

---

## Event Mapping (If Integration Possible)

If we can detect events, here's the proposed mapping:

| Game Event | Vest Response | Cells | Intensity |
|------------|---------------|-------|-----------|
| **Slash damage (front)** | Front impact | 2, 3, 4, 5 | Based on damage |
| **Slash damage (back)** | Back impact | 0, 1, 6, 7 | Based on damage |
| **Stab damage** | Point impact | Directional | High |
| **Blunt damage** | Wide impact | All on side | Medium |
| **Archer hit** | Quick point | Directional | Medium |
| **Death** | Full body | All 8 | Maximum |
| **Kill (optional)** | Satisfaction pulse | All | Low |
| **Block/Parry (optional)** | Light feedback | Arms? | Low |

### Directional Mapping

Mordhau has 360° combat - ideal for directional feedback:

```
Damage from Front-Left  → Cells 2, 3 (Front-Left)
Damage from Front-Right → Cells 4, 5 (Front-Right)
Damage from Back-Left   → Cells 0, 1 (Back-Left)
Damage from Back-Right  → Cells 6, 7 (Back-Right)
```

---

## Existing Haptic Mods Research

### bHaptics

**Status: No known mod found**

Searched:
- GitHub: No results for "mordhau bhaptics"
- mod.io: No haptic mods
- bHaptics Notion: Mordhau not listed

### OWO

**Status: No known mod found**

Searched:
- OWO Games page: Mordhau not listed
- GitHub OWODevelopers: No Mordhau repo

### Conclusion

**No existing haptic mods exist for Mordhau.** This would be a first-of-its-kind integration.

---

## Implementation Plan

### Phase 0: Feasibility Study (Current)

1. **Check log files** - Look for damage events in Mordhau logs
2. **Inspect HeartbeatMod** - Understand how it detects health
3. **Research MSDK** - Evaluate learning curve
4. **Find community help** - Mordhau modding Discord

### Phase 1: Prototype (If Feasible)

1. Set up UE4 + MSDK environment
2. Create minimal Blueprint that logs to file on damage
3. Test Python daemon file watcher
4. Validate end-to-end flow

### Phase 2: Full Implementation

1. Implement directional damage detection
2. Add intensity scaling based on damage amount
3. Package and test .pak mod
4. Create installation instructions

---

## Resources

### Mordhau Modding

- [mod.io Mordhau](https://mod.io/g/mordhau)
- [MSDK DictionaryLib](https://github.com/thePeacey/MSDK-DictionaryLib-Kit)
- [Where to Place Mods](https://mod.io/g/mordhau/r/where-to-place-mods)

### Unreal Engine

- [UE4 Documentation](https://docs.unrealengine.com/4.27/en-US/)
- [Blueprint Basics](https://docs.unrealengine.com/4.27/en-US/ProgrammingAndScripting/Blueprints/)

### Tools

- [FModel](https://github.com/4sval/FModel) - View UE4 assets
- [UE4 Pak Tools](https://github.com/AcidDeathTV/UE4PakUnpacker)

---

## Local Resources

We have the following in the repository:

```
misc-documentations/bhaptics-svg-24-nov/mordhau/
├── README.md                              # Research notes
├── exampleMod/heartbeatmod/
│   └── HeartbeatModWindowsClient.pak      # Packaged client-side mod
├── modManager/autoloaderwindowsclient/
│   └── AutoLoaderWindowsClient.pak        # Mod loader
└── Mods/DictionaryLib/                    # ⭐ UNPACKED MOD SOURCE!
    ├── DictionaryLib.uplugin              # Plugin descriptor (JSON)
    ├── Content/
    │   ├── BP_DLib_Core.uasset            # Main Blueprint
    │   ├── BFL_DLib_Library.uasset        # Blueprint Function Library
    │   ├── DLib_Actor.uasset              # Actor class
    │   ├── ICON_DLib.uasset               # Icon
    │   └── NewBlueprint.uasset            # Another Blueprint
    └── Resources/
        └── Icon128.png                    # Plugin icon
```

### Key Discovery: DictionaryLib Source Structure

The `DictionaryLib` folder contains an **unpacked Unreal Engine plugin** - this is the actual mod source BEFORE it's cooked into a .pak file. This is exactly the structure we'd need to create for a haptic mod!

**Plugin descriptor (`.uplugin`):**
```json
{
  "FileVersion": 3,
  "Version": 1,
  "VersionName": "1.0",
  "FriendlyName": "DictionaryLib",
  "CreatedBy": "the_Peacey",
  "CanContainContent": true
}
```

**Asset types:**
- `BP_*.uasset` - Blueprints (visual scripts)
- `BFL_*.uasset` - Blueprint Function Libraries
- `*_Actor.uasset` - Actor classes (spawnable in-game)

---

## Log File Analysis

**Result: ❌ No gameplay events logged by default**

Checked `C:\Users\...\AppData\Local\Mordhau\Saved\Logs\Mordhau.log`:
- Contains only engine initialization (GPU, memory, drivers)
- No damage, health, hit, or combat events
- Not useful for log-watching approach

This confirms that a **Blueprint mod is required** - we cannot use the simpler log-watching method like HL:Alyx.

---

## Verdict

| Factor | Assessment |
|--------|------------|
| **Technical Feasibility** | UNCERTAIN - needs more research |
| **Learning Curve** | HIGH - UE4 + Blueprints required |
| **Development Time** | HIGH - 20-40+ hours estimated |
| **Existing Resources** | LOW - no haptic mods to learn from |
| **Community Support** | MEDIUM - active modding community |

### Recommendation

Before investing significant time:

1. **Check Mordhau logs** for damage events (easy, quick)
2. **Inspect HeartbeatMod** to understand how it reads health
3. **Ask Mordhau modding community** if damage event hooks exist

If log-based approach is possible, implementation becomes much simpler (similar to HL:Alyx). If Blueprint mod is required, this is a significant undertaking that requires UE4 expertise.

---

## Next Steps

- [x] Check Mordhau log files for damage events → **No gameplay events logged**
- [x] Analyze DictionaryLib mod structure → **Got unpacked mod source!**
- [ ] Install FModel and inspect HeartbeatMod.pak to see how it reads health
- [ ] Find Mordhau modding Discord/community for help
- [ ] Download and set up MSDK (Mordhau SDK)
- [ ] Determine if MSDK has damage event Blueprint nodes
- [ ] Create prototype Blueprint that writes damage events to file
- [ ] Test Python daemon watching the output file

## Mod Development Approach

Based on the DictionaryLib example, here's how we'd create a haptic mod:

### 1. Set Up Development Environment
```
1. Download MORDHAU Editor from Epic Games Store (free with game ownership)
   https://store.epicgames.com/en-US/p/mordhau--editor
2. Install and launch the editor
3. Create new project using Mordhau template
4. Set up project structure like DictionaryLib example
```

### 2. Create Haptic Mod Structure
```
ThirdSpaceHaptics/
├── ThirdSpaceHaptics.uplugin          # Plugin descriptor
├── Content/
│   ├── BP_HapticCore.uasset           # Main Blueprint
│   ├── BP_DamageListener.uasset       # Listens for damage events
│   └── BFL_HapticLib.uasset           # Helper functions
└── Resources/
    └── Icon128.png
```

### 3. Blueprint Logic (Conceptual)
```
On Player Damage Event:
  → Get damage amount
  → Get damage direction (angle)
  → Get damage type (slash/stab/blunt)
  → Write to file: "DAMAGE|45|front_left|slash|25"

On Player Death:
  → Write to file: "DEATH|0|all|none|100"
```

### 4. Python Daemon Watches File
```python
# Similar to Alyx integration
async def watch_mordhau_output():
    path = Path(os.environ["LOCALAPPDATA"]) / "Mordhau" / "haptic_events.log"
    async for line in tail_file(path):
        event_type, angle, zone, damage_type, amount = line.split("|")
        await process_haptic_event(event_type, angle, zone, damage_type, amount)
```

