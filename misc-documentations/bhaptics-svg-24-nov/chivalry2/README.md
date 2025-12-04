# Chivalry 2 Haptic Integration Research

## Game Information

| Property | Value |
|----------|-------|
| **Developer** | Torn Banner Studios |
| **Publisher** | Tripwire Interactive |
| **Engine** | Unreal Engine 4.25 |
| **Release** | June 8, 2021 |
| **Genre** | Medieval multiplayer melee combat |
| **Similar To** | Mordhau, For Honor, Mount & Blade |
| **Platforms** | PC (Steam, Epic), PlayStation 4/5, Xbox One/Series X|S |

## Modding Ecosystem

### ArgonSDK (Community Modding SDK)

Chivalry 2 has an unofficial but well-supported modding SDK maintained by the community.

**Key Links:**
- **ArgonSDK Repository:** https://github.com/Chiv2-Community/ArgonSDK
- **Field Guide (Tutorials):** https://knutschbert.github.io/ArgonSDK-FieldGuide/
- **Class Documentation:** https://knutschbert.github.io/ArgonSDK-FieldGuide/ClassDocsGenerated/index_classes.html
- **Mod Registry:** https://github.com/Chiv2-Community/C2ModRegistry
- **Discord:** https://discord.gg/chiv2unchained (Chivalry 2 Unchained)

### Mod Structure

Mods are UE4 Blueprint actors packaged as `.pak` files:

```
MyMod/
├── MyMod.uasset           # Blueprint extending ArgonSDKModBase
├── ModMarker.uasset       # DA_ModMarker data asset
└── Resources/
    └── Icon128.png
```

### Key Classes for Haptics

From the ArgonSDK class documentation:

**Damage Events:**
- `FDamageTakenEvent` - Primary damage event structure
- `FDamageTakenEventCompressed` - Network-compressed version
- `FDeathDamageTakenEvent` - Death-related damage
- `FFallDamageTakenEvent` - Fall damage events
- `FLocationBasedDamageModifiers` - Directional damage data!

**Player Classes:**
- `ATBLPlayerController` - Main player controller
- `ATBLPlayerState` - Player state (health, stats)
- `ATBLCharacter` - Player character

## Existing Haptic Mods

### bHaptics

**Status:** ❌ No known mod exists

Searched:
- GitHub: No "chivalry 2 bhaptics" results
- floh-bhaptics repos: No Chivalry 2
- bHaptics Notion database: Not listed

### OWO

**Status:** ❌ No known mod exists

Searched:
- OWODevelopers GitHub: No Chivalry 2 repo
- owogame.com: Not listed

**Conclusion:** First-of-its-kind opportunity!

## Integration Approaches

### 1. Blueprint Mod (Recommended ⭐⭐⭐)

Create a Blueprint mod that hooks into damage events:

```
Chivalry 2 Game
    │
    ▼
Blueprint Mod (ThirdSpaceChivalry2)
    │ Hooks FDamageTakenEvent
    │ Gets damage direction
    │ Writes to log file
    ▼
haptic_events.log
    │
    ▼
Python Daemon (chivalry2_manager.py)
    │ Watches log file
    │ Parses events
    ▼
Third Space Vest (8-cell haptics)
```

**Advantages:**
- Direct access to game events
- Accurate damage direction
- Low CPU overhead

### 2. Screen Capture (Fallback ⭐⭐)

Detect damage direction indicator on screen:

```
Chivalry 2 Game (damage indicator visible)
    │
    ▼
Screen Capture Script
    │ Captures screen edges
    │ Detects red vignette
    ▼
Python Daemon
    │
    ▼
Third Space Vest
```

**Advantages:**
- No game modification
- Works with any version
- No anti-cheat concerns

## Similarity to Mordhau

Both games are extremely similar:

| Aspect | Mordhau | Chivalry 2 |
|--------|---------|------------|
| Engine | UE4 | UE4.25 |
| Genre | Medieval melee | Medieval melee |
| Mod Format | .pak | .pak |
| SDK | MSDK (official) | ArgonSDK (community) |
| Mod Language | Blueprints | Blueprints |
| Combat | 360° directional | 360° directional |

We can heavily reuse the Mordhau integration approach!

## Community Mods to Reference

Existing mods from C2ModRegistry that might have useful patterns:

| Mod | Description | Relevance |
|-----|-------------|-----------|
| **healthCharger** | Health charger asset | Shows how to access player health |
| **Sharingan** | Debug tool for invisible objects | Debug visualization |
| **GiantSlayers** | Gameplay modifier | Player state manipulation |
| **FlashBlades** | Visual effects | UI/visual feedback |

## Anti-Cheat Notes

Chivalry 2 uses **EasyAntiCheat (EAC)**. 

**Status:** Need to verify with community
- The active modding scene suggests some mod support exists
- "Chivalry 2 Unchained" has its own mod loader
- Need to confirm if file I/O is allowed from mods

**Action Item:** Ask in Discord about EAC compatibility.

## Next Steps

1. **Join Discord** - Connect with Chivalry 2 Unchained community
2. **Ask about EAC** - Verify mod capabilities with anti-cheat
3. **Set up ArgonSDK** - Install UE4.25, clone SDK
4. **Find example mods** - Look at mods that access damage events
5. **Create prototype** - Simple mod that logs damage events
6. **Test screen capture** - As fallback approach

## Related Documentation

- Main integration doc: `docs-external-integrations-ideas/CHIVALRY2_INTEGRATION.md`
- Mordhau research: `misc-documentations/bhaptics-svg-24-nov/mordhau/`
- Screen capture prototype: `misc-documentations/bhaptics-svg-24-nov/star-wars-battlefront-2-2017/screen_capture_prototype.py`
