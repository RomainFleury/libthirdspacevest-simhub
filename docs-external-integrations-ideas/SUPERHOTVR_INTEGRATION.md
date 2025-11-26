# SuperHot VR Integration Plan

> **Status: 📋 PLANNED**
>
> Integration strategy for SUPERHOT VR using MelonLoader mod framework.

## Overview

SUPERHOT VR is a Unity-based VR game where time moves only when you move. The game features:
- Gunplay (pistols, shotguns, uzis)
- Melee combat (punching, throwing objects)
- Bullet dodging and parrying
- Special "mind wave" abilities
- Instant death mechanics

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPERHOT VR (Unity)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      MelonLoader                             │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │     ThirdSpace_SuperhotVR Mod (Harmony patches)       │  │   │
│  │  │                                                        │  │   │
│  │  │  PlayerActionsVR.Kill() ─────┐                        │  │   │
│  │  │  Gun.Fire() ─────────────────┤                        │  │   │
│  │  │  VrPickingSystem.PickupItem()┼──► Event Logger ───────┼──┼───┼──► TCP
│  │  │  VrHapticSystem.SetVibration()│                        │  │   │   Port 5050
│  │  │  VrHandController.ApplyHit()──┘                        │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python Daemon (TCP 5050)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐   │
│  │ SuperHotManager │  │ VestController │  │ Event Broadcasting  │   │
│  │ (event parser)  │──│ (haptic output)│──│ (to Electron UI)    │   │
│  └────────────────┘  └────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Existing Resources

We have the complete **OWO_SuperhotVR mod** source code:
- `misc-documentations/bhaptics-svg-24-nov/SuperhotVR/OWO_SuperhotVR-1.0.0/`

### Captured Events (from OWO mod)

| Event | Game Method Patched | Hand-Specific |
|-------|---------------------|---------------|
| Death | `PlayerActionsVR.Kill()` | No |
| Grab Object | `VrPickingSystem.PickupItem()` | Yes |
| Grab Pyramid | `VrPickingSystem.PickupItem()` | Yes |
| Punch Hit | `VrHapticSystem.SetVibration()` | Yes |
| Pistol Recoil | `Gun.Fire()` | Yes |
| Shotgun Recoil | `ShotGun.Fire()` | Yes |
| Uzi Recoil | `UziGun.ShootUziBullets()` | Yes |
| No Ammo | `Gun.FireNoAmmo()` | Yes |
| Bullet Parry | `VrHandController.ApplyHit()` | Yes |
| Throw | `VrPickupDroppingSystem.DropItem()` | Yes |
| Mindwave Charge | `MindDeathWaveSystem.DualModeDeathWaveOnTarget()` | No |
| Mindwave Release | `ScoreManager.scorePoints()` | No |

## Recommended Approach

### Strategy: Modified MelonLoader Mod + TCP Client

Based on our architecture and the MelonLoader strategy doc, the recommended approach is:

1. **Fork the OWO mod** → Replace OWO SDK calls with TCP sends to our daemon
2. **Mod sends JSON events** → `{"event": "death"}` or `{"event": "pistol_recoil", "hand": "right"}`
3. **Python daemon receives** → Maps events to vest haptics
4. **No OWO dependency** → Works standalone with just our daemon

### Why This Approach?

| Alternative | Pros | Cons |
|-------------|------|------|
| **Log file watching** | No mod changes | High latency, unreliable parsing |
| **MelonLoader console parsing** | Works with any mod | Format changes break it |
| **WebSocket server in mod** | Real-time | More complex in C# |
| **TCP client in mod** ✅ | Simple, real-time, lightweight | Requires mod fork |

## Event-to-Haptic Mapping

### Vest Cell Layout

```
  FRONT          BACK
┌───┬───┐    ┌───┬───┐
│ 0 │ 1 │    │ 4 │ 5 │  Upper (arms/shoulders)
├───┼───┤    ├───┼───┤
│ 2 │ 3 │    │ 6 │ 7 │  Lower (torso)
└───┴───┘    └───┴───┘
  L   R        L   R
```

### Mapping Table

| Event | Cells | Intensity | Duration | Notes |
|-------|-------|-----------|----------|-------|
| **Death** | All (0-7) | 10 | 1500ms | Full body, dramatic |
| **Punch Hit (Right)** | 1, 3 | 7 | 150ms | Right side impact |
| **Punch Hit (Left)** | 0, 2 | 7 | 150ms | Left side impact |
| **Pistol Recoil (Right)** | 1, 5 | 5 | 100ms | Right arm + shoulder |
| **Pistol Recoil (Left)** | 0, 4 | 5 | 100ms | Left arm + shoulder |
| **Shotgun Recoil (Right)** | 1, 3, 5, 7 | 8 | 200ms | Full right side |
| **Shotgun Recoil (Left)** | 0, 2, 4, 6 | 8 | 200ms | Full left side |
| **Uzi Recoil (Right)** | 1, 5 | 3 | 50ms | Rapid, light |
| **Uzi Recoil (Left)** | 0, 4 | 3 | 50ms | Rapid, light |
| **Bullet Parry (Right)** | 1 | 6 | 100ms | Arm deflection |
| **Bullet Parry (Left)** | 0 | 6 | 100ms | Arm deflection |
| **Throw (Right)** | 1, 5 | 4 | 150ms | Throwing motion |
| **Throw (Left)** | 0, 4 | 4 | 150ms | Throwing motion |
| **Grab Object** | 2 or 3 | 2 | 100ms | Subtle hand feedback |
| **Mindwave Charge** | 2, 3, 6, 7 | 3→8 | Loop | Building intensity |
| **Mindwave Release** | All (0-7) | 10 | 300ms | Explosive release |
| **No Ammo** | 1 or 0 | 2 | 50ms | Click feedback |

## Implementation Plan

### Phase 1: Create Modified Mod (C#)

**Files to create:**
```
superhot-mod/
├── ThirdSpace_SuperhotVR.sln
├── ThirdSpace_SuperhotVR/
│   ├── ThirdSpace_SuperhotVR.cs    # Main mod (Harmony patches)
│   ├── DaemonClient.cs              # TCP client for daemon
│   ├── EventSender.cs               # Event formatting/sending
│   └── Properties/
│       └── AssemblyInfo.cs
└── README.md                        # Installation instructions
```

**Key modifications from OWO mod:**
```csharp
// Instead of:
OWO.Send(toSend.WithPriority(Priority));

// Do:
_daemonClient.SendEvent("death", priority: 4);
// or
_daemonClient.SendEvent("pistol_recoil", hand: "right", priority: 2);
```

### Phase 2: Add Daemon Support (Python)

**Files to create/modify:**
```
modern-third-space/src/modern_third_space/
└── server/
    └── superhot_manager.py    # Event receiver and haptic mapper
```

**Protocol (from mod to daemon):**
```json
{"cmd": "superhot_event", "event": "death"}
{"cmd": "superhot_event", "event": "pistol_recoil", "hand": "right"}
{"cmd": "superhot_event", "event": "punch_hit", "hand": "left"}
{"cmd": "superhot_event", "event": "mindwave_charge"}
{"cmd": "superhot_event", "event": "mindwave_release"}
```

**Daemon commands:**
- `superhot_start` - Enable SuperHot event processing
- `superhot_stop` - Disable processing
- `superhot_status` - Get connection state

### Phase 3: Electron UI Panel

**Files to create:**
```
web/src/components/SuperHotIntegrationPanel.tsx
web/src/hooks/useSuperHotIntegration.ts
web/electron/ipc/superhotHandlers.cjs
```

**UI features:**
- Connection status (mod → daemon)
- Live event log
- Per-effect intensity sliders
- Enable/disable individual effects

### Phase 4: Testing & Polish

1. Test each event triggers correct cells
2. Tune intensities for immersion
3. Add visual feedback in UI when events fire
4. Document installation steps

## User Setup Requirements

### Prerequisites
1. **SUPERHOT VR** (Steam)
2. **MelonLoader 0.7.0+** installed in SUPERHOT VR
3. **Third Space Vest daemon** running on port 5050

### Installation Steps
1. Download `ThirdSpace_SuperhotVR.zip`
2. Extract to `SUPERHOT VR/Mods/`
3. Start the Python daemon: `python -m modern_third_space.cli daemon start`
4. Start SUPERHOT VR
5. Mod auto-connects to daemon on localhost:5050

### Manual IP Configuration
If daemon runs on different machine, create `SUPERHOT VR/Mods/ThirdSpace_Manual_IP.txt`:
```
192.168.1.100
```

## Technical Notes

### MelonLoader Mod Structure
```csharp
[assembly: MelonInfo(typeof(ThirdSpace_SuperhotVR), "ThirdSpace_SuperhotVR", "1.0.0", "ThirdSpace")]
[assembly: MelonGame("SUPERHOT_Team", "SUPERHOT_VR")]

public class ThirdSpace_SuperhotVR : MelonMod
{
    private static DaemonClient _daemon;
    
    public override void OnInitializeMelon()
    {
        _daemon = new DaemonClient();
        _daemon.Connect("127.0.0.1", 5050);
    }
    
    // Harmony patches...
}
```

### Harmony Patching Pattern
```csharp
[HarmonyPatch(typeof(PlayerActionsVR), "Kill", ...)]
public class Patch_Death
{
    [HarmonyPostfix]
    public static void Postfix(...)
    {
        _daemon.SendEvent("death");
    }
}
```

### Event Throttling

Some events (like Uzi fire) can happen very rapidly. The daemon should throttle:
- Minimum 50ms between same-event triggers
- Queue events and process in order
- Drop duplicates within cooldown window

## Comparison with OWO Mod

| Aspect | OWO Mod | Our Approach |
|--------|---------|--------------|
| Output | OWO SDK (WiFi) | TCP to daemon (USB) |
| Latency | ~20-50ms | ~10-20ms |
| Setup | OWO app required | Just daemon |
| Motor count | 10 muscles | 8 cells |
| Customization | Via OWO app | Via Electron UI |

## Files Reference

### Existing Resources
- `misc-documentations/bhaptics-svg-24-nov/SuperhotVR/OWO_SuperhotVR-1.0.0/` - OWO mod source
- `docs-external-integrations-ideas/MELONLOADER_INTEGRATION_STRATEGY.md` - General MelonLoader strategy

### Related Integrations
- **HL:Alyx** - Similar log-based approach (but we'll use TCP here)
- **CS2** - Similar daemon-centric architecture
- **SimHub** - Similar C# plugin pattern

## Next Steps

1. [ ] **Phase 1**: Fork OWO mod and replace SDK with TCP client
2. [ ] **Phase 2**: Add `superhot_manager.py` to daemon
3. [ ] **Phase 3**: Create Electron UI panel
4. [ ] **Phase 4**: Test and tune haptic mappings
5. [ ] **Phase 5**: Package for distribution

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1 (C# mod) | 1-2 days | Medium |
| Phase 2 (Python) | 0.5 day | Low |
| Phase 3 (UI) | 0.5 day | Low |
| Phase 4 (Testing) | 1 day | Medium |
| **Total** | **3-4 days** | |

---

**Document Status:** Planning complete  
**Based on:** OWO_SuperhotVR v1.0.0 analysis  
**Next Action:** Implement Phase 1 (C# MelonLoader mod)

