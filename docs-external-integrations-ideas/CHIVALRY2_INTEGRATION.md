# Chivalry 2 Haptic Integration

> **Status: 🔬 INVESTIGATION COMPLETE - READY FOR IMPLEMENTATION**
>
> **Game Engine:** Unreal Engine 4.25 (UE4) - Confirmed
>
> **RECOMMENDED APPROACH:**
> 1. ⭐⭐⭐ **Blueprint Mod** - Using ArgonSDK to hook into damage events
> 2. ⭐⭐ **Screen Capture** - Detect damage direction indicator (fallback)
>
> **SIMILARITY:** Very similar to Mordhau integration (both UE4 medieval combat games)

---

## Game Overview

| Property | Value |
|----------|-------|
| **Developer** | Torn Banner Studios |
| **Engine** | Unreal Engine 4.25 |
| **Genre** | Medieval multiplayer melee combat |
| **Platforms** | PC (Steam, Epic Games Store), PlayStation, Xbox |
| **Mod Support** | ✅ Unofficial SDK (ArgonSDK) + Community Loader |
| **Anti-Cheat** | EasyAntiCheat (need to verify mod compatibility) |

### Gameplay Events Relevant for Haptics

| Event | Description | Haptic Potential |
|-------|-------------|------------------|
| **Player Damage** | Melee weapons (swords, axes, maces, etc.) | ⭐⭐⭐ Primary feedback |
| **Damage Direction** | 360° combat - hits from any direction | ⭐⭐⭐ Directional cells |
| **Damage Type** | Slash, stab, blunt, projectile | ⭐⭐ Intensity variation |
| **Death** | Player killed | ⭐⭐⭐ Full body pulse |
| **Fall Damage** | Environmental damage | ⭐⭐ Lower body feedback |
| **Block/Parry** | Successful defense | ⭐ Light feedback (optional) |
| **Fire/Burning** | Environmental hazards | ⭐ Pulse pattern |

---

## Modding Ecosystem

### ArgonSDK (Community Modding SDK)

Chivalry 2 has an active modding community that has created **ArgonSDK**, an unofficial Unreal Engine 4.25 project that mimics the original development environment.

**Repository:** https://github.com/Chiv2-Community/ArgonSDK

**Key Resources:**
| Resource | URL | Description |
|----------|-----|-------------|
| **ArgonSDK** | [GitHub](https://github.com/Chiv2-Community/ArgonSDK) | Main modding SDK |
| **Field Guide** | [Docs](https://knutschbert.github.io/ArgonSDK-FieldGuide/) | Tutorials & class reference |
| **Class Docs** | [Reference](https://knutschbert.github.io/ArgonSDK-FieldGuide/ClassDocsGenerated/index_classes.html) | C++/Blueprint class documentation |
| **Mod Registry** | [C2ModRegistry](https://github.com/Chiv2-Community/C2ModRegistry) | Community mod repository |
| **Discord** | [Chivalry 2 Unchained](https://discord.gg/chiv2unchained) | Modding community |

### Mod Structure

Mods are created using UE4 Blueprints and packaged as `.pak` files:

```
MyMod/
├── MyMod.uasset           # Main Blueprint Actor (extends ArgonSDKModBase)
├── ModMarker.uasset       # DA_ModMarker data asset for mod detection
└── Resources/
    └── Icon128.png        # Mod icon
```

### Mod Types

| Type | Description | Installation |
|------|-------------|--------------|
| **Client** | Runs on player's machine | `Chivalry2/Content/Paks/mods/` |
| **Server** | Runs on server only | Server-side installation |
| **Shared** | Both client and server | Both locations |

For haptics, we need a **client-side mod**.

---

## Key Game Classes for Haptics

From the ArgonSDK class documentation, these are the most relevant classes:

### Damage Events

| Class | Description | Use Case |
|-------|-------------|----------|
| `FDamageTakenEvent` | **Primary damage event structure** | Main haptic trigger |
| `FDamageTakenEventCompressed` | Compressed version for networking | Network events |
| `FDeathDamageTakenEvent` | Death event with damage info | Death haptic |
| `FFallDamageTakenEvent` | Fall damage specific event | Fall damage |
| `FBroadcastDamageParams` | Damage broadcast parameters | Event details |
| `FLocationBasedDamageModifiers` | Location-based damage | **Directional feedback!** |
| `FAnimDamageParams` | Animation-linked damage | Timing info |

### Player Classes

| Class | Description | Use Case |
|-------|-------------|----------|
| `ATBLPlayerController` | Main player controller | Hook damage events |
| `ATBLPlayerState` | Player state (health, status) | Monitor health changes |
| `ATBLCharacter` | Player character class | Character events |

### Key Finding: Location-Based Damage

The presence of `FLocationBasedDamageModifiers` suggests the game has built-in support for damage direction, which is perfect for our 8-cell directional haptic mapping!

---

## Integration Approaches

### Approach 1: Blueprint Mod with Log Output (RECOMMENDED ⭐⭐⭐)

**Complexity: MEDIUM** | **Feasibility: HIGH**

Create a Blueprint mod using ArgonSDK that hooks into damage events and writes to a log file for the Python daemon to process.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHIVALRY 2 GAME                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌────────────────────────────────────────┐                            │
│   │  ArgonSDK Blueprint Mod                 │                            │
│   │  (ThirdSpaceChivalry2)                  │                            │
│   │                                         │                            │
│   │  On Damage Event:                       │                            │
│   │    → Get damage amount                  │                            │
│   │    → Get damage direction (angle)       │                            │
│   │    → Get damage type                    │                            │
│   │    → Write to haptic_events.log         │                            │
│   └──────────────────┬─────────────────────┘                            │
│                      │                                                   │
└──────────────────────┼───────────────────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  haptic_events.log   │
            │  (Local file)        │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Python Daemon       │
            │  (chivalry2_manager) │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Third Space Vest    │
            │  (8-cell haptics)    │
            └──────────────────────┘
```

**Advantages:**
- ✅ Direct access to damage events from game
- ✅ Accurate damage direction and type
- ✅ Low CPU overhead (no screen capture)
- ✅ Works offline
- ✅ Precise event timing

**Challenges:**
- ⚠️ Requires ArgonSDK setup (UE4.25)
- ⚠️ Need to learn Blueprint basics
- ⚠️ Must package as .pak file
- ⚠️ EasyAntiCheat compatibility (verify with community)

**Log Format (v1):**
```
{timestamp}|{event_type}|{angle}|{zone}|{damage_type}|{intensity}
```

Example:
```
1699123456789|DAMAGE|45.5|front-right|slash|65
1699123456890|DAMAGE|180.0|back|stab|80
1699123457000|DEATH|0|all|death|100
```

**Implementation Steps:**
1. Set up ArgonSDK development environment (UE4.25)
2. Create new Blueprint mod based on `ArgonSDKModBase`
3. Hook into player damage events (via character or controller)
4. Calculate damage direction from attack angle
5. Write events to log file in `%LOCALAPPDATA%/Chivalry2/ThirdSpaceHaptics/`
6. Package as `.pak` file
7. Create Python manager to watch log file

### Approach 2: Screen Capture (Alternative ⭐⭐)

**Complexity: LOW-MEDIUM** | **Feasibility: HIGH**

Detect the visual damage direction indicator that appears on screen when taking damage. Similar to our Mordhau and EA Battlefront 2 prototypes.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHIVALRY 2 GAME                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│      ┌─────────────────────────────────────────────────┐                │
│      │  Damage Direction Indicator (on screen)          │                │
│      │  (Red vignette / directional marker)             │                │
│      └─────────────────────────────────────────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                       │
                       │ Screen Capture
                       ▼
            ┌──────────────────────┐
            │  Python Script       │
            │  (screen_capture.py) │
            │                      │
            │  - Capture edges     │
            │  - Detect red tint   │
            │  - Determine dir     │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Python Daemon       │
            │  (chivalry2_manager) │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Third Space Vest    │
            └──────────────────────┘
```

**Advantages:**
- ✅ No game modification needed
- ✅ Works with any game version
- ✅ Quick to implement (reuse existing prototype)
- ✅ No anti-cheat concerns

**Disadvantages:**
- ❌ Higher CPU overhead (continuous screen capture)
- ❌ Less accurate direction detection
- ❌ Cannot detect damage type
- ❌ May have false positives
- ❌ Depends on visual indicator being visible

**Implementation:**
1. Adapt EA Battlefront 2 screen capture prototype
2. Calibrate for Chivalry 2's damage indicator colors/position
3. Detect red vignette or directional markers
4. Map screen edge detection to vest cells
5. Integrate with daemon

**Reference:**
- `misc-documentations/bhaptics-svg-24-nov/star-wars-battlefront-2-2017/screen_capture_prototype.py`

### Approach 3: Hybrid (Custom Indicator + Screen Capture)

**Complexity: LOW-MEDIUM** | **Feasibility: VERY HIGH**

Create a simple Blueprint mod that displays a custom, easy-to-detect visual indicator when damage occurs, then use screen capture to detect it.

**Advantages:**
- ✅ Simpler Blueprint mod (just visual indicator, no file I/O)
- ✅ Reliable detection (indicator designed for detection)
- ✅ Can encode direction in indicator position/color

**Indicator Design:**
- Small colored square in corner (e.g., cyan #00FFFF)
- Different positions for different damage directions
- Brief flash (0.2-0.3 seconds)

---

## Comparison with Mordhau

Chivalry 2 and Mordhau are very similar games, making much of our Mordhau research applicable:

| Aspect | Mordhau | Chivalry 2 |
|--------|---------|------------|
| **Engine** | UE4 | UE4.25 |
| **Genre** | Medieval melee | Medieval melee |
| **Mod Format** | .pak files | .pak files |
| **Mod SDK** | MSDK (official) | ArgonSDK (community) |
| **Mod Type** | Blueprints | Blueprints |
| **Base Class** | ActorComponent | ArgonSDKModBase |
| **Damage Events** | Available | Available (FDamageTakenEvent) |
| **Direction** | 360° combat | 360° combat |
| **Community** | Active | Active |

**Key Difference:** ArgonSDK is a community-created SDK that mimics the official development environment, while Mordhau's MSDK is officially provided. Both use similar concepts.

---

## Existing Haptic Mods Research

### bHaptics Mods

**Status: ❌ No known mod found**

Searched:
- GitHub: No results for "chivalry 2 bhaptics"
- bHaptics Notion: Chivalry 2 not listed
- floh-bhaptics repos: No Chivalry 2 mod

### OWO Mods

**Status: ❌ No known mod found**

Searched:
- GitHub OWODevelopers: No Chivalry 2 repo
- OWO Games page: Chivalry 2 not listed

### Conclusion

**No existing haptic mods exist for Chivalry 2.** This would be a first-of-its-kind integration, which is exciting but means we have no reference implementations to learn from.

However, we can apply learnings from similar games:
- **Mordhau** - Same genre, same engine, similar damage system
- **Blade and Sorcery** - VR melee combat with OWO/bHaptics mods

---

## Event Mapping

### Damage Direction → Vest Cells

Using the same 8-zone mapping as Mordhau:

```python
# Angle → Vest cells (precise mapping)
def angle_to_cells(angle: float) -> List[int]:
    """
    Map damage angle to vest cells.
    0° = front, 90° = right, 180° = back, 270° = left
    """
    angle = angle % 360
    
    if 337.5 <= angle or angle < 22.5:    return [2, 3, 4, 5]  # front
    elif 22.5 <= angle < 67.5:            return [4, 5]        # front-right
    elif 67.5 <= angle < 112.5:           return [4, 5, 6, 7]  # right
    elif 112.5 <= angle < 157.5:          return [6, 7]        # back-right
    elif 157.5 <= angle < 202.5:          return [0, 1, 6, 7]  # back
    elif 202.5 <= angle < 247.5:          return [0, 1]        # back-left
    elif 247.5 <= angle < 292.5:          return [0, 1, 2, 3]  # left
    else:                                  return [2, 3]        # front-left
```

### Vest Cell Layout Reference

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  │ UL  │ UR  │          │ UL  │ UR  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  │ LL  │ LR  │          │ LL  │ LR  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R
```

### Zone Summary

| Zone | Angle Range | Vest Cells | Description |
|------|-------------|------------|-------------|
| front | 337.5° - 22.5° | 2, 3, 4, 5 | All front cells |
| front-right | 22.5° - 67.5° | 4, 5 | Front right |
| right | 67.5° - 112.5° | 4, 5, 6, 7 | Full right side |
| back-right | 112.5° - 157.5° | 6, 7 | Back right |
| back | 157.5° - 202.5° | 0, 1, 6, 7 | All back cells |
| back-left | 202.5° - 247.5° | 0, 1 | Back left |
| left | 247.5° - 292.5° | 0, 1, 2, 3 | Full left side |
| front-left | 292.5° - 337.5° | 2, 3 | Front left |

### Event Mapping Table

| Game Event | Vest Response | Cells | Intensity | Duration |
|------------|---------------|-------|-----------|----------|
| **Slash damage** | Directional impact | Based on angle | Based on damage | 200ms |
| **Stab damage** | Point impact | Based on angle | High | 150ms |
| **Blunt damage** | Wide impact | Adjacent cells too | Medium | 250ms |
| **Arrow/projectile** | Quick point | Based on angle | Medium | 100ms |
| **Fall damage** | Lower body | 0, 3, 4, 7 | Based on height | 300ms |
| **Fire/burning** | Pulse pattern | All | Low | Pulsing |
| **Death** | Full body | All 8 | Maximum | 500ms |
| **Block/parry** | Light feedback | Arms | Low | 100ms |

### Intensity Mapping

```python
def damage_to_intensity(damage: int, max_health: int = 100) -> int:
    """
    Convert damage amount to haptic intensity (1-10).
    """
    damage_percent = (damage / max_health) * 100
    
    if damage_percent >= 50:  return 10  # Heavy hit
    if damage_percent >= 30:  return 8   # Medium-heavy
    if damage_percent >= 20:  return 6   # Medium
    if damage_percent >= 10:  return 4   # Light-medium
    return 3                              # Light tap
```

---

## Implementation Plan

### Phase 0: Environment Setup

1. **Install UE4.25** - Required for ArgonSDK
2. **Clone ArgonSDK** - `git clone --recursive https://github.com/Chiv2-Community/ArgonSDK`
3. **Set up development environment** - Follow ArgonSDK setup guide
4. **Join Discord** - Connect with Chivalry 2 Unchained community

### Phase 1: Prototype Blueprint Mod

1. Create new Blueprint based on `ArgonSDKModBase`
2. Find damage event hooks in player controller/character
3. Test event detection in editor
4. Implement log file writing
5. Package test .pak file

### Phase 2: Python Daemon Integration

1. Create `chivalry2_manager.py` based on Mordhau manager
2. Implement log file watcher
3. Parse damage events
4. Map to haptic triggers
5. Test end-to-end

### Phase 3: UI Integration

1. Create `Chivalry2IntegrationPage.tsx`
2. Add IPC handlers
3. Add daemon protocol commands
4. Test full integration

### Phase 4: Polish & Documentation

1. Package final .pak mod
2. Create installation instructions
3. Test with community
4. Submit to mod registry

---

## Files to Create

### Blueprint Mod
```
ThirdSpaceChivalry2/
├── ThirdSpaceChivalry2.uasset        # Main mod Blueprint
├── ModMarker.uasset                   # DA_ModMarker for detection
├── README.md                          # Installation instructions
├── BLUEPRINT_IMPLEMENTATION.md        # Step-by-step guide
└── Resources/
    └── Icon128.png                    # Mod icon
```

### Python Daemon
```
modern-third-space/src/modern_third_space/
└── server/chivalry2_manager.py        # Log watcher + haptic mapper
```

### Electron UI
```
web/src/pages/integrations/
└── Chivalry2IntegrationPage.tsx       # React UI component

web/electron/ipc/
└── chivalry2Handlers.cjs              # IPC handlers
```

### Documentation
```
docs-external-integrations-ideas/
├── CHIVALRY2_INTEGRATION.md           # This file
└── misc-documentations/bhaptics-svg-24-nov/chivalry2/
    ├── README.md                      # Research notes
    └── screen_capture_prototype.py    # Screen capture fallback
```

---

## Daemon Protocol Updates

Add to `server/protocol.py`:

```python
# Commands
"chivalry2_start"   # Start Chivalry 2 integration
"chivalry2_stop"    # Stop integration
"chivalry2_status"  # Get integration status

# Events
"chivalry2_started" # Integration started
"chivalry2_stopped" # Integration stopped
"chivalry2_event"   # Game event occurred
```

---

## Anti-Cheat Considerations

Chivalry 2 uses **EasyAntiCheat (EAC)**. Need to verify:

1. Does EAC allow Blueprint mods via Chivalry 2 Unchained?
2. Are there restrictions on file I/O from mods?
3. Does screen capture work alongside EAC?

**Action:** Ask in Chivalry 2 Unchained Discord about mod compatibility with EAC.

**Note:** The community mod loader and existing mods suggest some level of mod support exists, but specific capabilities need verification.

---

## Resources

### ArgonSDK & Modding
- [ArgonSDK Repository](https://github.com/Chiv2-Community/ArgonSDK)
- [ArgonSDK Field Guide](https://knutschbert.github.io/ArgonSDK-FieldGuide/)
- [Class Documentation](https://knutschbert.github.io/ArgonSDK-FieldGuide/ClassDocsGenerated/index_classes.html)
- [Mod Registry](https://github.com/Chiv2-Community/C2ModRegistry)

### Community
- [Chivalry 2 Unchained Discord](https://discord.gg/chiv2unchained)
- [Chiv2-Community GitHub](https://github.com/Chiv2-Community)

### Unreal Engine
- [UE4 Documentation](https://docs.unrealengine.com/4.27/en-US/)
- [Blueprint Basics](https://docs.unrealengine.com/4.27/en-US/ProgrammingAndScripting/Blueprints/)

### Related Integrations (In This Repo)
- `MORDHAU_INTEGRATION.md` - Most similar game
- `SUPERHOTVR_INTEGRATION.md` - MelonLoader approach
- `ALYX_INTEGRATION.md` - Log file watching approach

---

## Next Steps

### Immediate (Investigation)
- [ ] **Ask in Discord** about EAC compatibility with Blueprint mods
- [ ] **Find example mod** that accesses player/damage events
- [ ] **Test screen capture** on Chivalry 2 damage indicator

### Short-term (Prototype)
- [ ] Set up ArgonSDK development environment
- [ ] Create minimal Blueprint mod that logs damage
- [ ] Test Python log file watcher
- [ ] Verify end-to-end flow

### Medium-term (Implementation)
- [ ] Implement full Blueprint mod with direction detection
- [ ] Create Python manager for daemon
- [ ] Build UI integration page
- [ ] Package and test with real gameplay

---

## Summary

Chivalry 2 is an excellent candidate for haptic integration:

| Factor | Assessment |
|--------|------------|
| **Technical Feasibility** | ✅ HIGH - UE4 with active mod SDK |
| **Event Availability** | ✅ HIGH - FDamageTakenEvent, direction data |
| **Mod Ecosystem** | ✅ GOOD - Active community, clear documentation |
| **Similarity to Existing** | ✅ VERY HIGH - Nearly identical to Mordhau |
| **Learning Curve** | ⚠️ MEDIUM - Need to learn ArgonSDK/Blueprints |
| **Existing Haptic Mods** | ❌ NONE - First-of-its-kind opportunity |

**Recommendation:** Proceed with Blueprint mod approach, using Mordhau integration as a template. The ArgonSDK and community support make this highly feasible.
