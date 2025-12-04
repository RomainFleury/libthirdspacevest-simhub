# Walking Dead: Saints and Sinners Integration

> **Status: 📋 PLANNED**
>
> Walking Dead: Saints and Sinners is an Unreal Engine VR zombie survival game.
> This integration uses memory reading approach (like the existing bHaptics mod).
>
> **Implementation:**
> - Python manager: `server/walkingdead_manager.py`
> - UI panel: `web/src/components/WalkingDeadIntegrationPanel.tsx`
> - Reference: [McFredward/twd_bhaptics](https://github.com/McFredward/twd_bhaptics)

## Overview

Walking Dead: Saints and Sinners is an Unreal Engine-based VR game featuring:
- Gunplay (pistols, shotguns, rifles - one-handed and two-handed)
- Melee combat (knives, axes, bats, etc.)
- Zombie attacks and grappling
- Health and stamina management
- Backpack and inventory interactions
- Crafting and survival mechanics

### Architecture

Since Walking Dead is an **Unreal Engine** game (not Unity), MelonLoader/BepInEx modding frameworks won't work. The existing bHaptics mod uses **memory reading** via PyMeow to detect game events.

```
┌─────────────────────────────────────────────────────────────────────┐
│              Walking Dead: Saints and Sinners (Unreal)              │
│                                                                     │
│           ┌──────────────────────────────────────────┐              │
│           │  Game Process Memory                     │              │
│           │  (TWD-Win64-Shipping.exe)               │              │
│           │                                          │              │
│           │  • health_addr     → player health       │              │
│           │  • ammo_addr       → current ammo        │              │
│           │  • zombie_attached → grab state          │              │
│           │  • shoot_indicator → weapon fired        │              │
│           │  • endurance_addr  → stamina             │              │
│           └────────────────────┬─────────────────────┘              │
└────────────────────────────────┼────────────────────────────────────┘
                                 │ Memory Read (PyMeow)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│           Python Memory Reader (Separate Process)                   │
│           ┌────────────────────────────────────────────────────┐    │
│           │  WalkingDeadManager                                │    │
│           │  • Polls memory addresses every ~20ms              │    │
│           │  • Detects state changes (health↓, ammo↓, etc.)    │    │
│           │  • Sends events to daemon via TCP                  │    │
│           └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                 │ TCP (port 5050)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python Daemon (TCP 5050)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐   │
│  │WalkingDeadMgr  │  │ VestController │  │ Event Broadcasting  │   │
│  │ (event mapper) │──│ (haptic output)│──│ (to Electron UI)    │   │
│  └────────────────┘  └────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Existing Resources

### bHaptics Mod (Reference)

The existing bHaptics mod by McFredward provides excellent reference:
- **Repository**: https://github.com/McFredward/twd_bhaptics (archived)
- **Status**: Only works with game version `2021.12.08 / build 218977-STAGE`
- **Approach**: Memory reading via PyMeow

### Events Captured (from bHaptics mod)

| Event | Detection Method | Details |
|-------|------------------|---------|
| **Gun Fire** | `shoot_indicator` + `ammo` change | Hand-specific (L/R), two-handed support |
| **Zombie Grab** | `zombie_attached_left/right` | Directional, looping while attached |
| **Damage** | `health` decrease | Generic damage (non-zombie) |
| **Healing** | `health` increase | Triggered when using bandages/medkits |
| **Low Health** | `health <= 0.25` | Heartbeat loop |
| **Low Stamina** | `endurance == 0` | Lung contraction loop |
| **Eating** | `is_eating` flag | Looping sensation |
| **Backpack** | `is_backpack_outside` | Grab/store haptics |
| **Shoulder Holster** | `is_shoulder_packed` | Grab/store haptics |
| **Lamp/Book** | `is_lamp/book_outside` | Special chest items |

### Haptic Patterns (from bHaptics mod)

The mod includes 21 `.tact` pattern files:
- `RecoilHands_L/R.tact` - Gun recoil on arms
- `RecoilPistolVest_L/R.tact` - Gun recoil on vest
- `ZombieGrabArm_L/R.tact` - Zombie initial grab
- `ZombieGrabVest_L/R.tact` - Zombie vest grab
- `ZombieHoldArm_L/R.tact` - Zombie holding (loop)
- `BulletHit.tact` - Getting shot
- `HeartBeat.tact` - Low health heartbeat
- `Healing.tact` - Health regeneration
- `LungContraction2.tact` - Low stamina
- `Eating.tact` - Eating food
- `BackpackRetrieve/Store_L/R.tact` - Backpack interactions

## Recommended Approach

### Strategy: Python Memory Reader

Unlike Unity games where we create MelonLoader mods, for Walking Dead we'll need:

1. **Python memory reader** that monitors the game process
2. **Event detection** logic ported from the bHaptics mod
3. **TCP client** that sends events to our daemon

| Approach | Pros | Cons |
|----------|------|------|
| Memory reading | Works with Unreal Engine, real-time | Version-specific, needs address updates |
| Log file parsing | Version-agnostic | No detailed events in Unreal logs |
| dll injection | Full access | Complex, risky |
| **Memory reading** ✅ | Best balance of capability vs complexity | Requires address maintenance |

### Limitations

⚠️ **Version Dependency**: Memory addresses change with game updates. The integration requires:
1. Finding correct memory addresses for each game version
2. Using Cheat Engine or similar to locate new addresses
3. Community effort to maintain address tables

## Event-to-Haptic Mapping

### Vest Cell Layout

```
  FRONT          BACK
┌───┬───┐    ┌───┬───┐
│ 2 │ 5 │    │ 1 │ 6 │  Upper (arms/shoulders)
├───┼───┤    ├───┼───┤
│ 3 │ 4 │    │ 0 │ 7 │  Lower (torso)
└───┴───┘    └───┴───┘
  L   R        L   R
```

### Mapping Table

| Event | Cells | Intensity | Duration | Notes |
|-------|-------|-----------|----------|-------|
| **Gun Fire (Right)** | 5, 6 | 6 | 100ms | Right arm + shoulder |
| **Gun Fire (Left)** | 2, 1 | 6 | 100ms | Left arm + shoulder |
| **Gun Fire (Two-Hand R)** | 5, 6, 2 | 7 | 150ms | Both arms, primary right |
| **Gun Fire (Two-Hand L)** | 2, 1, 5 | 7 | 150ms | Both arms, primary left |
| **Zombie Grab (Right)** | 5, 4 | 7 | 300ms | Right side impact |
| **Zombie Grab (Left)** | 2, 3 | 7 | 300ms | Left side impact |
| **Zombie Hold (Right)** | 5, 4 | 4 | Loop 1s | Continuous pressure |
| **Zombie Hold (Left)** | 2, 3 | 4 | Loop 1s | Continuous pressure |
| **Damage** | 2, 3, 4, 5 | 8 | 200ms | Front impact |
| **Healing** | 2, 3, 4, 5 | 3 | 500ms | Warmth spreading |
| **Low Health** | 2, 3, 4, 5 | 5 | Loop 1s | Heartbeat pulse |
| **Low Stamina** | 3, 4 | 4 | Loop ~1s | Random timing |
| **Eating** | 3, 4 | 2 | Loop 1.6s | Subtle feedback |
| **Backpack Out** | 1, 0 | 4 | 200ms | Back left (backpack position) |
| **Backpack In** | 1, 0 | 4 | 200ms | Back left |
| **Shoulder Out** | 6, 7 | 4 | 200ms | Back right |
| **Shoulder In** | 6, 7 | 4 | 200ms | Back right |

## Implementation Plan

### Phase 1: Core Manager (Python)

**File**: `modern-third-space/src/modern_third_space/server/walkingdead_manager.py`

```python
class WalkingDeadManager:
    """
    Manager for Walking Dead: Saints and Sinners events.
    
    Receives events from a separate memory reader process and
    maps them to haptic feedback.
    """
    
    EVENT_MAPPINGS = {
        "gun_fire": HapticMapping(cells=[], speed=6, duration_ms=100),  # Hand-specific
        "gun_fire_two_hand": HapticMapping(cells=[], speed=7, duration_ms=150),
        "zombie_grab": HapticMapping(cells=[], speed=7, duration_ms=300),  # Side-specific
        "zombie_hold": HapticMapping(cells=[], speed=4, duration_ms=1000),  # Looping
        "damage": HapticMapping(cells=FRONT_CELLS, speed=8, duration_ms=200),
        "healing": HapticMapping(cells=FRONT_CELLS, speed=3, duration_ms=500),
        "low_health": HapticMapping(cells=FRONT_CELLS, speed=5, duration_ms=500),  # Looping
        "low_stamina": HapticMapping(cells=LOWER_CELLS, speed=4, duration_ms=500),  # Random loop
        "eating": HapticMapping(cells=LOWER_CELLS, speed=2, duration_ms=400),  # Looping
        "backpack_out": HapticMapping(cells=[1, 0], speed=4, duration_ms=200),
        "backpack_in": HapticMapping(cells=[1, 0], speed=4, duration_ms=200),
        "shoulder_out": HapticMapping(cells=[6, 7], speed=4, duration_ms=200),
        "shoulder_in": HapticMapping(cells=[6, 7], speed=4, duration_ms=200),
    }
```

### Phase 2: Daemon Protocol

Add to `server/protocol.py`:
- Commands: `walkingdead_event`, `walkingdead_start`, `walkingdead_stop`, `walkingdead_status`
- Events: `walkingdead_started`, `walkingdead_stopped`, `walkingdead_game_event`

### Phase 3: Electron UI Panel

**File**: `web/src/components/WalkingDeadIntegrationPanel.tsx`

Features:
- Status display (enabled/disabled, events received)
- Enable/disable controls
- Real-time event log with icons
- Setup instructions (for memory reader)

### Phase 4: Memory Reader Tool (Optional)

The memory reader would be a separate Python script that:
1. Attaches to `TWD-Win64-Shipping.exe`
2. Reads memory addresses in a loop
3. Detects state changes
4. Sends events to daemon via TCP

This is optional for initial implementation - users can run the existing bHaptics mod's memory reader or we can port it.

## User Setup Requirements

### Prerequisites
1. **Walking Dead: Saints and Sinners** (Steam or Oculus)
2. **Python 3.9+** with PyMeow (for memory reader)
3. **Third Space Vest daemon** running on port 5050

### Installation Steps

1. Start the Python daemon:
   ```bash
   python -m modern_third_space.cli daemon start
   ```

2. Start the memory reader (separate terminal):
   ```bash
   python walkingdead_reader.py
   ```

3. Start Walking Dead: Saints and Sinners

4. Enable integration in Electron UI

### Game Version Compatibility

⚠️ **Important**: The memory reader only works with specific game versions.

| Version | Status | Notes |
|---------|--------|-------|
| 2021.12.08 (build 218977) | ✅ Known working | bHaptics mod addresses |
| Current version | ❓ Unknown | Needs address discovery |

To use with newer versions, memory addresses must be updated using Cheat Engine.

## Technical Notes

### Memory Reading with PyMeow

```python
import pymeow

# Attach to game process
process = pymeow.process_by_name("TWD-Win64-Shipping.exe")
base_addr = process["modules"]["TWD-Win64-Shipping.exe"]["baseaddr"]

# Read health (example)
health = pymeow.read_float(process, health_addr)
```

### Event Detection Logic

The memory reader polls addresses and detects changes:

```python
# Detect gunshot
if shoot_indicator and ammo < ammo_old:
    if is_right_gun:
        send_event("gun_fire", hand="right")
    elif is_left_gun:
        send_event("gun_fire", hand="left")

# Detect zombie grab
if zombie_attached_right and not was_zombie_attached_right:
    send_event("zombie_grab", side="right")
```

### Looping Effects

Some events (heartbeat, zombie hold) need continuous feedback:

```python
class WalkingDeadManager:
    async def _start_heartbeat_loop(self):
        while self._low_health_active:
            self._trigger_callback(cells=FRONT_CELLS, speed=5)
            await asyncio.sleep(1.0)
```

## Comparison with bHaptics Mod

| Aspect | bHaptics Mod | Our Approach |
|--------|--------------|--------------|
| Output | bHaptics Player (WiFi) | TCP to daemon (USB) |
| Motor count | 40 motors (TactSuit) | 8 cells |
| Setup | Standalone exe | Daemon + memory reader |
| Maintenance | Archived, abandoned | Community maintained |
| UI | None | Electron panel |

## Related Documents

- `SUPERHOTVR_INTEGRATION.md` - Similar VR game integration (Unity)
- `DAEMON_ARCHITECTURE.md` - Daemon protocol
- `CELL_MAPPING_AUDIT.md` - Cell layout reference

## Implementation Status

- [ ] **Phase 1**: Python manager (`walkingdead_manager.py`)
- [ ] **Phase 2**: Daemon protocol updates
- [ ] **Phase 3**: Electron UI panel
- [ ] **Phase 4**: Memory reader tool (optional)
- [ ] **Phase 5**: Test with actual game

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1 (Manager) | 0.5 day | Low |
| Phase 2 (Protocol) | 0.5 day | Low |
| Phase 3 (UI) | 0.5 day | Low |
| Phase 4 (Memory Reader) | 1-2 days | Medium |
| **Total** | **2-3 days** | |

---

**Document Status:** Planning complete  
**Based on:** bHaptics twd_bhaptics mod analysis  
**Reference**: https://github.com/McFredward/twd_bhaptics  
**Next Action:** Implement Phase 1 (Python manager)
