# Deep Rock Galactic Integration

> **Status: 📋 RESEARCH & PLANNING**
>
> This document outlines the research and integration strategy for adding haptic feedback support to Deep Rock Galactic using the Third Space Vest.

## Game Overview

**Deep Rock Galactic** (DRG) is a 1-4 player co-op first-person shooter/mining game developed by Ghost Ship Games.

| Attribute | Details |
|-----------|---------|
| **Developer** | Ghost Ship Games |
| **Engine** | Unreal Engine 4 |
| **Platforms** | PC (Steam, Xbox Game Pass), PlayStation, Xbox |
| **Release** | May 2020 (v1.0) |
| **Mod Support** | ✅ Official mod.io integration |
| **Genre** | Co-op FPS / Mining / Survival |

### Core Gameplay

- **4 Character Classes**: Scout, Driller, Engineer, Gunner (each with unique weapons and tools)
- **Mining**: Extract minerals, dig tunnels, traverse caves
- **Combat**: Fight alien creatures ("Glyphids", "Mactera", etc.)
- **Objectives**: Complete various mission types (Mining, Egg Hunt, Salvage, etc.)
- **Traversal**: Ziplines, platforms, drills, grappling hooks

### Key Events for Haptic Feedback

| Category | Events | Haptic Potential |
|----------|--------|------------------|
| **Combat** | Player damage, weapon fire, reload, melee | High - directional damage, recoil |
| **Mining** | Pickaxe swings, drilling, breaking terrain | Medium - rhythmic feedback |
| **Traversal** | Fall damage, zipline use, grappling hook | Medium - impact and motion |
| **Environment** | Explosions, cave-ins, hazards (leeches, goo) | High - immersive effects |
| **Objectives** | Resupply pod landing, extraction pod, mission events | Medium - notification feedback |

## Research Findings

### Existing Haptic Mods

#### bHaptics

**Status**: ✅ **FOUND** - Official bHaptics mod exists!

| Resource | Link |
|----------|------|
| **mod.io Page** | [Deep Rock Galactic bHaptics](https://mod.io/g/drg/m/bhaptics-support) |
| **GitHub** | [Juniper-X/DRG_bHaptics](https://github.com/Juniper-X/DRG_bHaptics) |
| **Author** | Juniper-X |

**Key Findings from the bHaptics mod:**

The mod provides comprehensive haptic feedback for:
1. **Weapon Fire** - Different patterns per weapon type
2. **Damage Taken** - Directional damage based on attacker position
3. **Fall Damage** - Impact on landing
4. **Mining/Drilling** - Rhythmic feedback during pickaxe and drill use
5. **Shield/Armor** - Feedback when shield is active or depleted
6. **Resupply** - Notification when using resupply pod
7. **Environmental Hazards** - Leech grabs, goo damage, etc.

#### OWO

**Status**: ❌ **Not Found** - No OWO mod exists for Deep Rock Galactic as of research date.

This means:
- We can use the bHaptics mod as primary reference
- We could be the first to create an OWO-style integration for DRG

### Modding Ecosystem

Deep Rock Galactic has **official mod support** through mod.io:

| Feature | Details |
|---------|---------|
| **Mod Platform** | mod.io (integrated in-game) |
| **Mod Types** | Blueprint mods, Asset replacements, Audio mods |
| **Verified Mods** | Yes - "Verified" status for tested mods |
| **Multiplayer** | Mods must be compatible (host's mods apply to clients) |
| **Mod Framework** | UE4 Blueprint-based |

#### DRG Modding Tools

| Tool | Purpose |
|------|---------|
| **DRG Mod Kit** | Official Unreal Engine 4 modding kit |
| **BP Modding** | Blueprint-based mods (no C++ required) |
| **JSON Configs** | Some mods use JSON for configuration |
| **mod.io API** | For mod distribution |

### How the bHaptics Mod Works

Based on the GitHub source code analysis, the bHaptics mod uses:

1. **Blueprint Hooks**: Hooks into UE4 Blueprint events for game state changes
2. **Event Detection**: Listens for player damage, weapon fire, mining events
3. **bHaptics SDK**: Sends patterns to bHaptics Player application
4. **Pattern Files**: Uses `.tact` pattern files for haptic effects

**Key Classes/Events Hooked (from bHaptics mod):**

```
PlayerCharacter -> TakeDamage() - Player receives damage
WeaponBase -> Fire() - Weapon firing event
PickaxeItem -> StartMining() - Mining begins
PlayerMovement -> OnLanded() - Fall damage detection
Shield -> OnShieldDepleted() - Shield breaks
Resupply -> OnResupplyUsed() - Using resupply pod
```

## Integration Strategy

### Recommended Approach: Log-Based or UDP Event Bridge

Since DRG uses Unreal Engine 4 and has mod support, we have several options:

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Fork bHaptics mod** | Proven code, comprehensive events | Requires BP modding knowledge | ✅ **Option A** |
| **Create new BP mod** | Full control, optimized for our vest | More development time | ✅ **Option B** |
| **Memory reading** | No mod required | Complex, fragile, anti-cheat concerns | ❌ Not recommended |
| **Screen/audio analysis** | No mod required | Unreliable, high latency | ❌ Not recommended |

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Deep Rock Galactic (UE4)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   ThirdSpace DRG Mod                         │   │
│  │  (Blueprint mod - hooks game events)                         │   │
│  │                                                              │   │
│  │  PlayerCharacter.TakeDamage() ─────┐                        │   │
│  │  WeaponBase.Fire() ────────────────┤                        │   │
│  │  PickaxeItem.Mining() ─────────────┼──► Event Logger ───────┼───┼──► TCP/UDP
│  │  PlayerMovement.OnLanded() ────────┤    (JSON events)       │   │   Port 5050
│  │  Shield.OnDepleted() ──────────────┘                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python Daemon (TCP 5050)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐   │
│  │ DRGManager     │  │ VestController │  │ Event Broadcasting  │   │
│  │ (event parser) │──│ (haptic output)│──│ (to Electron UI)    │   │
│  └────────────────┘  └────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Option A: Fork/Adapt bHaptics Mod

**Strategy**: Modify the existing bHaptics mod to send events to our daemon instead of bHaptics Player.

**Pros:**
- Comprehensive event coverage already implemented
- Proven to work with current DRG version
- Less development time

**Cons:**
- Need to understand Blueprint modding
- May need to update for future DRG versions
- Dependent on original mod structure

### Option B: Create New Blueprint Mod

**Strategy**: Create a fresh mod that hooks game events and sends them to our daemon.

**Pros:**
- Full control over implementation
- Optimized for our 8-cell vest
- Can implement exactly what we need

**Cons:**
- More development time
- Need Blueprint modding knowledge
- Need to maintain compatibility

## Event-to-Haptic Mapping

### Vest Cell Layout

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

**Cell Constants** (from `vest/cell_layout.py`):
- `Cell.FRONT_UPPER_LEFT` = 2
- `Cell.FRONT_UPPER_RIGHT` = 5
- `Cell.FRONT_LOWER_LEFT` = 3
- `Cell.FRONT_LOWER_RIGHT` = 4
- `Cell.BACK_UPPER_LEFT` = 1
- `Cell.BACK_UPPER_RIGHT` = 6
- `Cell.BACK_LOWER_LEFT` = 0
- `Cell.BACK_LOWER_RIGHT` = 7

### Phase 1: Combat Events (MVP)

| Event | Detection | Cells | Intensity | Duration | Notes |
|-------|-----------|-------|-----------|----------|-------|
| **Damage Taken** | TakeDamage() | Directional | Scaled (damage %) | 200ms | Use attacker angle |
| **Player Death** | Health = 0 | All (0-7) | 10 (max) | 1000ms | Full vest pulse |
| **Weapon Fire** | Fire() | Front upper (2, 5) | 3-6 | 100ms | Varies by weapon |
| **Shotgun Fire** | Fire() | Front all (2, 3, 4, 5) | 7 | 150ms | Stronger recoil |
| **Minigun Fire** | Fire() | Front upper (2, 5) | 2 | 50ms | Rapid, light |
| **Reload** | Reload() | Front upper (2 or 5) | 2 | 200ms | Based on hand |

### Phase 2: Mining Events

| Event | Detection | Cells | Intensity | Duration | Notes |
|-------|-----------|-------|-----------|----------|-------|
| **Pickaxe Swing** | Mining() | Front lower (3, 4) | 4 | 150ms | Rhythmic feedback |
| **Pickaxe Hit Mineral** | OnMineralHit() | Front (2, 3, 4, 5) | 5 | 100ms | Solid impact |
| **Drill Active** | Drilling() | Front (2, 3, 4, 5) | 3 | Continuous | Vibration pattern |
| **C4 Explosion** | OnExplosion() | All (0-7) | 8 | 300ms | Nearby only |

### Phase 3: Traversal & Environment

| Event | Detection | Cells | Intensity | Duration | Notes |
|-------|-----------|-------|-----------|----------|-------|
| **Fall Damage** | OnLanded() | Lower (0, 3, 4, 7) | Scaled | 200ms | Based on fall height |
| **Zipline Use** | OnZipline() | Upper (1, 2, 5, 6) | 2 | Continuous | Light vibration |
| **Grapple Launch** | OnGrapple() | Front upper (2, 5) | 5 | 150ms | Pull sensation |
| **Shield Active** | OnShieldActive() | All (0-7) | 2 | Continuous | Low pulse |
| **Shield Break** | OnShieldDepleted() | All (0-7) | 7 | 300ms | Strong pulse |
| **Leech Grab** | OnLeechGrab() | Back upper (1, 6) | 6 | 400ms | Being grabbed |
| **Revive** | OnRevive() | Front (2, 3, 4, 5) | 4 | 500ms | Healing wave |

### Phase 4: Class-Specific Events

#### Scout
| Event | Cells | Intensity | Notes |
|-------|-------|-----------|-------|
| Flare Gun | Front (2, 5) | 3 | Light recoil |
| Grappling Hook | Front upper (2, 5) | 5 | Pull |

#### Driller
| Event | Cells | Intensity | Notes |
|-------|-------|-----------|-------|
| Flamethrower | Front (2, 3, 4, 5) | 4 | Continuous |
| Cryo Cannon | Front (2, 3, 4, 5) | 3 | Cold pulse |
| Drills | Front (2, 3, 4, 5) | 5 | Heavy vibration |
| C4 Throw | Front upper (2, 5) | 3 | Throw motion |

#### Engineer
| Event | Cells | Intensity | Notes |
|-------|-------|-----------|-------|
| Platform Gun | Front (2, 5) | 2 | Soft recoil |
| Turret Deploy | Front lower (3, 4) | 4 | Placement |
| Grenade Launcher | Front all (2, 3, 4, 5) | 6 | Strong recoil |

#### Gunner
| Event | Cells | Intensity | Notes |
|-------|-------|-----------|-------|
| Minigun | Front upper (2, 5) | 2-4 | Ramps up |
| Autocannon | Front all (2, 3, 4, 5) | 5 | Heavy recoil |
| Shield Deploy | All (0-7) | 4 | Bubble effect |
| Zipline Deploy | Front (2, 5) | 3 | Launch |

### Directional Damage Mapping

Calculate damage direction from attacker position relative to player:

```python
def angle_to_cells(angle: float) -> List[int]:
    """Convert damage angle (0-360°) to vest cells.
    
    Angle Reference:
    - 0° = Front
    - 90° = Right
    - 180° = Back
    - 270° = Left
    """
    # Front (315-360, 0-45)
    if angle >= 315 or angle < 45:
        return [2, 3, 4, 5]  # Front cells
    # Right (45-135)
    elif 45 <= angle < 135:
        return [4, 5, 6, 7]  # Right cells
    # Back (135-225)
    elif 135 <= angle < 225:
        return [0, 1, 6, 7]  # Back cells
    # Left (225-315)
    else:
        return [0, 1, 2, 3]  # Left cells
```

## Implementation Plan

### Phase 1: Research & Blueprint Mod (2-3 days)

**Goal**: Create a working Blueprint mod that sends events to our daemon.

**Files to Create**:
```
drg-mod/
├── ThirdSpaceDRG/
│   ├── ThirdSpaceDRG.uplugin       # UE4 plugin descriptor
│   ├── Source/
│   │   └── ThirdSpaceDRG/
│   │       ├── ThirdSpaceDRG.Build.cs
│   │       ├── DaemonClient.cpp      # TCP client
│   │       ├── DaemonClient.h
│   │       ├── EventLogger.cpp       # Event capture
│   │       └── EventLogger.h
│   └── Content/
│       └── Blueprints/
│           └── BP_EventHooks.uasset  # Blueprint hooks
├── README.md
└── mod.io-description.md
```

**Alternative (Simpler)**: Pure Blueprint mod with UDP output.

### Phase 2: Python Daemon Support (0.5 day)

**Files to Create/Modify**:
```
modern-third-space/src/modern_third_space/
└── server/
    └── drg_manager.py    # Event receiver and haptic mapper
```

**Protocol (mod → daemon)**:
```json
{"event": "damage", "amount": 25, "angle": 90.0, "type": "melee"}
{"event": "weapon_fire", "weapon": "minigun", "hand": "right"}
{"event": "death", "cause": "glyphid"}
{"event": "mining", "tool": "pickaxe"}
{"event": "fall_damage", "amount": 15}
{"event": "shield_depleted"}
```

**Daemon Commands**:
- `drg_start` - Enable DRG event processing
- `drg_stop` - Disable processing
- `drg_status` - Get connection state

### Phase 3: Electron UI (0.5 day)

**Files to Create**:
```
web/src/components/
├── DRGIntegrationPanel.tsx       # React UI component

web/src/hooks/
├── useDRGIntegration.ts          # React state hook

web/electron/ipc/
├── drgHandlers.cjs               # IPC handlers
```

**UI Features**:
- Connection status
- Event log
- Per-class weapon settings
- Intensity sliders
- Enable/disable individual effects

### Phase 4: Testing & Polish (1 day)

1. Test each event type
2. Tune intensities for immersion
3. Test multiplayer compatibility
4. Document installation steps
5. Create mod.io page (if distributing)

## User Setup Requirements

### Prerequisites

1. **Deep Rock Galactic** (Steam or Xbox Game Pass PC)
2. **Mods Enabled** in DRG settings (Options → Gameplay → Enable Mods)
3. **Third Space Vest Daemon** running on port 5050

### Installation Steps

1. Subscribe to mod on mod.io (when published)
   - Or manually install: Copy mod folder to `%LOCALAPPDATA%\Deep Rock Galactic\Mods\`
2. Start Python daemon: `python3 -m modern_third_space.cli daemon start`
3. Launch Deep Rock Galactic
4. Ensure mod is enabled in Mod Manager
5. Start a mission - haptics should activate automatically

### Manual Configuration

If daemon runs on different port or IP, create config file:
```
%LOCALAPPDATA%\Deep Rock Galactic\ThirdSpace_Config.json
```

```json
{
  "daemon_host": "127.0.0.1",
  "daemon_port": 5050
}
```

## Technical Challenges & Solutions

### Challenge 1: UE4 Blueprint TCP/UDP

**Problem**: Sending TCP/UDP from Blueprint is not straightforward.

**Solutions**:
1. **VaRest Plugin**: Free UE4 plugin for HTTP/REST calls
2. **Socket.io Plugin**: Community plugin for socket communication
3. **C++ Module**: Create a small C++ module for networking
4. **Log File Approach**: Write to log file, have Python daemon watch it (like HL:Alyx)

### Challenge 2: Mod Verification

**Problem**: DRG has "Verified" mod system for quality/safety.

**Solution**: 
- Test thoroughly before submission
- Follow mod.io guidelines
- May initially release as unverified mod

### Challenge 3: Multiplayer Sync

**Problem**: In multiplayer, mods must be compatible.

**Solution**:
- Our mod only reads game state (passive)
- Only needs to run on the player who has the vest
- Clients can have the mod without affecting host

### Challenge 4: Game Updates

**Problem**: DRG updates may break mod hooks.

**Solution**:
- Use stable Blueprint events where possible
- Monitor DRG update notes
- Maintain mod compatibility

## What We Learned from bHaptics Mod

**Key Insights from analyzing the bHaptics mod:**

1. **Event Coverage**: The mod hooks 15+ game events - we should aim for similar coverage
2. **Weapon Variety**: Different patterns for each weapon class (Scout, Driller, etc.)
3. **Directional Damage**: Uses player rotation and attacker position for direction
4. **Class-Specific**: Some events only apply to certain classes
5. **Multiplayer Works**: The mod works in both solo and multiplayer

**Pattern File Structure (from .tact files)**:
```json
{
  "project": {
    "tracks": [
      {
        "effects": [
          {
            "startTimeMillis": 0,
            "endTimeMillis": 200,
            "rotationOption": "...",
            "dotMode": {
              "dotConnected": true,
              "feedback": [
                {"index": 0, "intensity": 100}
              ]
            }
          }
        ]
      }
    ]
  }
}
```

We can translate these patterns to our 8-cell vest format.

## Comparison with Other Integrations

| Aspect | CS2 (GSI) | HL:Alyx (Lua) | DRG (Blueprint) |
|--------|-----------|---------------|-----------------|
| **Official API** | ✅ Yes | ❌ No | ❌ No |
| **Mod Required** | No | ✅ Yes (Lua scripts) | ✅ Yes (BP mod) |
| **Data Format** | JSON (HTTP) | Text (file) | JSON (TCP/UDP) |
| **Communication** | HTTP push | File polling | TCP/UDP push |
| **Setup Complexity** | Low | Medium | Medium |
| **Directional Data** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Engine** | Source 2 | Source 2 | Unreal Engine 4 |

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1 (Blueprint mod) | 2-3 days | Medium-High |
| Phase 2 (Python daemon) | 0.5 day | Low |
| Phase 3 (Electron UI) | 0.5 day | Low |
| Phase 4 (Testing) | 1 day | Medium |
| **Total** | **4-5 days** | |

## Success Criteria

### Phase 1: Combat Haptics (MVP)

- [ ] Mod loads in DRG without errors
- [ ] Mod connects to Python daemon
- [ ] Player damage triggers directional haptics
- [ ] Player death triggers full vest pulse
- [ ] Basic weapon fire feedback works
- [ ] UI shows connection status

### Phase 2: Full Feature Set

- [ ] All 4 classes have appropriate weapon feedback
- [ ] Mining/drilling feedback works
- [ ] Environmental hazards trigger feedback
- [ ] Shield effects work
- [ ] Resupply notification works
- [ ] Fall damage works

### Phase 3: Polish

- [ ] Multiplayer tested and working
- [ ] Configuration UI complete
- [ ] Documentation complete
- [ ] mod.io listing created (optional)

## Resources & References

### Deep Rock Galactic Modding

- [DRG Modding Wiki](https://drg.mod.io/guides/getting-started)
- [DRG Mod Discord](https://discord.gg/drg) - #modding channel
- [mod.io DRG Page](https://mod.io/g/drg)
- [DRG Mod Kit](https://drg.mod.io/guides/modding-tools)

### Existing Mods

- [bHaptics Support Mod](https://mod.io/g/drg/m/bhaptics-support)
- [GitHub: DRG_bHaptics](https://github.com/Juniper-X/DRG_bHaptics)

### Unreal Engine 4

- [UE4 Blueprint Basics](https://docs.unrealengine.com/4.27/en-US/ProgrammingAndScripting/Blueprints/)
- [UE4 Networking](https://docs.unrealengine.com/4.27/en-US/InteractiveExperiences/Networking/)
- [VaRest Plugin](https://github.com/ufna/VaRest) - HTTP/REST for Blueprint

### Project References

- [DAEMON_ARCHITECTURE.md](./DAEMON_ARCHITECTURE.md) - Daemon protocol documentation
- [SUPERHOTVR_INTEGRATION.md](./SUPERHOTVR_INTEGRATION.md) - Similar modding approach
- [GTAV_INTEGRATION.md](./GTAV_INTEGRATION.md) - Reference for non-Unity game

---

**Document Status:** Research & Planning Complete  
**Based on:** bHaptics DRG mod analysis, DRG modding documentation  
**Next Action:** Decide between Option A (fork bHaptics) or Option B (new mod), then begin Phase 1 implementation
