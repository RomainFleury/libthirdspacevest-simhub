# GTA V (Grand Theft Auto V) Integration Strategy

## Overview

This document outlines the strategy for adding haptic feedback support to Grand Theft Auto V using the Third Space Vest. GTA V is a massive open-world game with driving, shooting, and various action sequences that would benefit greatly from haptic feedback.

## Research Findings

### Existing Haptic Support

- **PS5 Version**: Native DualSense haptic feedback (adaptive triggers, haptic rumble)
- **PC Version**: No native haptic support (rumble is basic on/off)
- **Third-Party**: No existing bHaptics or OWO mods found (we'll be pioneering this)

### Existing Telemetry Infrastructure

**GTA5Telemetry Mod** ([GitHub: TGDSimware/GTA5Telemetry](https://github.com/TGDSimware/GTA5Telemetry)):
- Sends telemetry data in Codemasters F1 format
- Uses Script Hook V .NET
- Outputs UDP packets for sim racing dashboards
- **Potential**: We could either:
  1. **Option A**: Create our own Script Hook V mod (recommended)
  2. **Option B**: Parse GTA5Telemetry UDP output (less flexible)

### GTA V Modding Framework

**Script Hook V**:
- C++ library (`ScriptHookV.dll`) - core modding framework
- **Script Hook V .NET** - C# wrapper for easier scripting
- Native functions available via [Native Database](https://www.gta-modding.com/gtav/tutorials)
- Mods go in `GTA V/scripts/` folder

**Tools Required**:
- OpenIV (for file access)
- Script Hook V (C++ core)
- Script Hook V .NET (C# wrapper)

## Integration Method: Script Hook V .NET Mod

### Why This Approach?

| Method | Pros | Cons | Decision |
|--------|------|------|----------|
| **Script Hook V .NET Mod** | Full control, real-time events, can hook any game function | Requires modding knowledge, needs SHV.NET | ✅ **Chosen** |
| Parse GTA5Telemetry UDP | Reuse existing mod | Limited to telemetry data, less flexible | ❌ Not chosen |
| Log file watching | Simple | No real-time, limited events | ❌ Not chosen |

### Architecture

```
┌─────────────────────┐
│   GTA V Game        │
│   (Script Hook V)   │
└──────────┬──────────┘
           │
           │ Hooks game events
           ▼
┌─────────────────────┐
│  ThirdSpaceGTAV.dll │
│  (C# Script Hook)   │
│                     │
│  • Hooks:           │
│    - Player damage  │
│    - Vehicle crash  │
│    - Weapon fire    │
│    - Explosions     │
│    - Driving events │
└──────────┬──────────┘
           │
           │ TCP JSON (localhost:5050)
           ▼
┌─────────────────────┐
│  Python Daemon      │
│  (server/daemon.py) │
└──────────┬──────────┘
           │
           │ USB
           ▼
┌─────────────────────┐
│  Third Space Vest   │
└─────────────────────┘
```

## Event-to-Haptic Mapping

### Key Game Events to Hook

Based on GTA V gameplay, we should capture:

| Event Category | Events | Haptic Mapping Strategy |
|----------------|--------|------------------------|
| **Combat** | Player damage, death, weapon fire, reload | Directional damage (angle-based), recoil on front cells |
| **Vehicles** | Crash, acceleration, braking, cornering, speed | Similar to SimHub racing (G-forces, impacts) |
| **Explosions** | Explosion nearby, explosion damage | All cells, intensity based on distance |
| **Environment** | Falling, landing, water entry | Directional (front/back based on impact) |
| **Health** | Low health heartbeat, healing | Subtle pulse on front left (heart) |

### Detailed Event Mappings (Phase 1 Focus)

```python
# Phase 1: Core combat haptics
GTAV_EVENT_MAPPINGS_PHASE1 = {
    # Player Damage - PRIMARY FOCUS
    "player_damage": {
        "cells": "directional",  # Based on damage angle from attacker
        "intensity": "scaled",   # Based on damage amount (1-100)
        "duration_ms": 200,
        "mapping": {
            # Damage angle → cells
            # 0-45° (front-right): Front right cells
            # 45-135° (right): Right side cells
            # 135-225° (back): Back cells
            # 225-315° (left): Left side cells
            # 315-360° (front-left): Front left cells
        }
    },
    
    # Player Death - PRIMARY FOCUS
    "player_death": {
        "cells": [0, 1, 2, 3, 4, 5, 6, 7],  # All cells
        "intensity": 10,  # Maximum
        "duration_ms": 1000,  # 1 second pulse
    },
    
    # Weapon Fire - OPTIONAL for Phase 1
    "weapon_fire": {
        "cells": [2, 5],  # Front upper (recoil)
        "intensity": 4,   # Moderate (varies by weapon type later)
        "duration_ms": 100
    }
}

# Phase 2: Vehicle events (deferred)
GTAV_EVENT_MAPPINGS_PHASE2 = {
    "vehicle_crash": {...},
    "vehicle_acceleration": {...},
    "vehicle_braking": {...},
    "vehicle_cornering": {...}
}

# Phase 3: Advanced events (deferred)
GTAV_EVENT_MAPPINGS_PHASE3 = {
    "explosion_nearby": {...},
    "player_fall": {...},
    "player_land": {...},
    "low_health": {...}
}
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

**Cell Constants** (from `vest/cell_layout.py`):
- `Cell.FRONT_UPPER_LEFT` = 2
- `Cell.FRONT_UPPER_RIGHT` = 5
- `Cell.FRONT_LOWER_LEFT` = 3
- `Cell.FRONT_LOWER_RIGHT` = 4
- `Cell.BACK_UPPER_LEFT` = 1
- `Cell.BACK_UPPER_RIGHT` = 6
- `Cell.BACK_LOWER_LEFT` = 0
- `Cell.BACK_LOWER_RIGHT` = 7

## Implementation Plan

### Phase 1: Player Damage & Combat (MVP) 🎯

**Focus**: Core combat haptics - player damage, death, and weapon feedback.

**Location**: `gta5-mod/ThirdSpaceGTAV/`

**Files to Create**:
```
gta5-mod/
├── ThirdSpaceGTAV/
│   ├── ThirdSpaceGTAV.csproj      # C# project file
│   ├── ThirdSpaceGTAV.cs          # Main mod entry point
│   ├── DaemonClient.cs            # TCP client to Python daemon
│   ├── EventHooks.cs              # Script Hook V event hooks
│   ├── HapticMapper.cs            # Event → haptic mapping
│   └── Properties/
│       └── AssemblyInfo.cs
├── README.md
└── build.ps1                       # Build script
```

**Key Hooks to Implement (Phase 1)**:

1. **Player Damage**:
   - `OnPlayerDamage` - Monitor `ENTITY::GET_ENTITY_HEALTH` delta
   - Calculate damage angle from last attacker position
   - Map to directional haptic cells

2. **Player Death**:
   - `OnPlayerDeath` - Hook `PED::IS_PED_DEAD_OR_DYING`
   - Full vest pulse on all cells

3. **Weapon Fire** (Optional for Phase 1):
   - `OnPlayerShoot` - Hook weapon fire natives
   - Recoil feedback on front upper cells

**Phase 1 Success Criteria**:
- [ ] Mod loads in GTA V
- [ ] Mod connects to Python daemon
- [ ] Player taking damage triggers directional haptics
- [ ] Player death triggers full vest pulse
- [ ] Basic UI shows connection status

### Phase 2: Vehicle Events (Future) 🚗

**Deferred Features**:
- Vehicle crashes
- Acceleration/braking G-forces
- Cornering lateral forces
- Speed-based feedback

**Will be added after Phase 1 is stable and tested.**

### Phase 3: Advanced Events (Future) 💥

**Deferred Features**:
- Explosion detection
- Falling/landing
- Low health heartbeat
- Environment interactions

### Phase 1 Implementation Details

#### 1.1: Python Daemon Integration

**Location**: `modern-third-space/src/modern_third_space/server/gtav_manager.py`

**Responsibilities**:
- Receive TCP events from Script Hook mod
- Parse JSON commands
- Map events to haptic triggers (focus on damage/death)
- Send commands to vest via daemon

**Protocol Commands (Phase 1)**:
```json
// From mod to daemon
{"event": "player_damage", "angle": 45.0, "damage": 25, "health_remaining": 75}
{"event": "player_death", "cause": "gunshot"}
{"event": "weapon_fire", "weapon_type": "pistol"}  // Optional
```

#### 1.2: Electron UI Integration (Minimal)

**Files to Create**:
```
web/src/components/
├── GTAVIntegrationPanel.tsx       # React UI component

web/src/hooks/
├── useGTAVIntegration.ts          # React state hook

web/electron/ipc/
├── gtavHandlers.cjs               # IPC handlers
```

**UI Features (Phase 1)**:
- Connection status (mod → daemon)
- Enable/disable damage feedback
- Enable/disable death feedback
- Damage intensity slider
- Test haptics button

#### 1.3: Documentation & Testing

- User setup guide (Script Hook V installation)
- Troubleshooting section
- Test with combat scenarios (shooting, melee, explosions)

### Phase 2: Vehicle Events (Future)

**Will be implemented after Phase 1 is complete and stable.**

**Planned Features**:
- Vehicle crash detection
- Acceleration/braking G-forces
- Cornering lateral forces
- Speed-based feedback

### Phase 3: Advanced Events (Future)

**Planned Features**:
- Explosion detection
- Falling/landing
- Low health heartbeat
- Environment interactions

## Setup Requirements for Users

### Prerequisites

1. **GTA V** (Steam/Epic/Rockstar Launcher)
2. **Script Hook V** (C++ core)
   - Download from: [dev-c.com](http://www.dev-c.com/gtav/scripthookv/)
   - Extract `ScriptHookV.dll` to `GTA V/` folder
3. **Script Hook V .NET**
   - Download from: [GitHub: crosire/scripthookvdotnet](https://github.com/crosire/scripthookvdotnet)
   - Extract `ScriptHookVDotNet.dll` and `ScriptHookVDotNet.asi` to `GTA V/` folder
4. **Third Space Vest Daemon** (running on port 5050)

### Installation Steps

1. Build the mod (or download pre-built DLL)
2. Copy `ThirdSpaceGTAV.dll` to `GTA V/scripts/` folder
3. Start Python daemon: `python3 -m modern_third_space.cli daemon start`
4. Launch GTA V
5. Mod auto-connects to daemon on startup
6. Configure in Electron UI

## Technical Challenges & Solutions

### Challenge 1: Real-Time Event Detection

**Problem**: Script Hook V runs in a tick loop, need to detect state changes.

**Solution**: 
- Store previous frame state (health, position, vehicle state)
- Compare current vs previous to detect events
- Use delta thresholds to avoid false positives

### Challenge 2: Directional Damage

**Problem**: GTA V doesn't directly provide damage angle.

**Solution**:
- Track last damage source position
- Calculate angle from player to damage source
- Map angle to directional cells (similar to CS2/Alyx)

### Challenge 3: Vehicle Physics

**Problem**: Need to calculate G-forces from vehicle state.

**Solution**:
- Use `VEHICLE::GET_ENTITY_SPEED_VECTOR` for velocity
- Calculate acceleration from velocity delta
- Map to haptic cells based on direction

### Challenge 4: Mod Compatibility

**Problem**: Other mods might conflict.

**Solution**:
- Use unique namespace/prefix for all hooks
- Minimal invasive hooks (read-only where possible)
- Document known conflicts

## What We Learned from bHaptics/OWO Mods

**Note**: No existing bHaptics/OWO mods found for GTA V, but we can learn from similar games:

- **CS2**: HTTP GSI approach (we'll use TCP instead for lower latency)
- **Alyx**: Log file watching (we'll use real-time hooks instead)
- **SimHub**: Telemetry-based (we'll hook game state directly)

**Key Patterns to Apply**:
- Directional damage mapping (angle-based)
- Intensity scaling (damage amount, distance)
- Continuous effects (driving G-forces)
- Event throttling (avoid spam)

## Success Criteria

### Phase 1: Player Damage & Combat (MVP)

- [ ] Mod builds and loads in GTA V
- [ ] Mod connects to Python daemon successfully
- [ ] Player taking damage triggers directional haptics (based on attacker angle)
- [ ] Player death triggers full vest pulse (all cells, max intensity)
- [ ] Damage intensity scales with damage amount
- [ ] UI shows connection status
- [ ] Basic configuration (enable/disable damage, intensity slider)
- [ ] Documentation complete with setup guide

### Phase 2: Vehicle Events (Future)

- [ ] Vehicle crashes trigger impact haptics
- [ ] Driving G-forces work (acceleration, braking, cornering)
- [ ] Vehicle events properly mapped to haptic cells

### Phase 3: Advanced Events (Future)

- [ ] Weapon fire triggers recoil haptics
- [ ] Explosions trigger distance-based haptics
- [ ] Environment events (falling, landing, low health)

## Next Steps (Phase 1 Focus)

1. **Set up development environment**:
   - Install Script Hook V and SHV.NET
   - Create C# project structure
   - Test basic mod loading

2. **Implement Phase 1 core hooks**:
   - Player damage detection (health delta monitoring)
   - Damage angle calculation (from attacker position)
   - Player death detection
   - Basic TCP client to daemon

3. **Integrate with daemon**:
   - Add `gtav_manager.py` to daemon
   - Implement damage/death event handlers
   - Test event flow end-to-end

4. **UI integration (minimal)**:
   - Add React components for connection status
   - Basic enable/disable toggles
   - Damage intensity slider

5. **Testing & refinement**:
   - Test with various damage sources (guns, melee, explosions)
   - Fine-tune directional mapping
   - Adjust intensity scaling

**After Phase 1 is stable**, proceed to Phase 2 (vehicle events).

## References

- [Script Hook V Documentation](http://www.dev-c.com/gtav/scripthookv/)
- [Script Hook V .NET GitHub](https://github.com/crosire/scripthookvdotnet)
- [GTA V Native Database](https://www.gta-modding.com/gtav/tutorials)
- [GTA5Telemetry Mod](https://github.com/TGDSimware/GTA5Telemetry) - Reference for telemetry approach
- [OpenIV Modding Tool](https://openiv.co/)

