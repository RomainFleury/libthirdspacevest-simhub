# Pistol Whip Integration Plan

> **Status: 📋 PLANNED**
>
> Integration strategy for Pistol Whip using MelonLoader mod framework.
> Very similar to SuperHot VR - same engine, same mod framework.

## Overview

Pistol Whip is a rhythm-based VR shooter by Cloudhead Games. Players shoot enemies in sync with music while dodging bullets. The game features:
- Dual-wielding pistols and shotguns
- Melee attacks
- Armor system with healing
- Rhythm-based gameplay

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       PISTOL WHIP (Unity/Il2Cpp)                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      MelonLoader                             │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │     ThirdSpace_PistolWhip Mod (Harmony patches)       │  │   │
│  │  │                                                        │  │   │
│  │  │  Gun.Fire() ──────────────┐                           │  │   │
│  │  │  Gun.Reload() ────────────┤                           │  │   │
│  │  │  MeleeWeapon.ProcessHit()─┼──► Event Logger ──────────┼──┼───┼──► TCP
│  │  │  Projectile.ShowPlayerHit()│                           │  │   │   Port 5050
│  │  │  Player.ProcessKillerHit()─┤                           │  │   │
│  │  │  PlayerHUD.OnArmorLost() ──┘                           │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python Daemon (TCP 5050)                         │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │ PistolWhipMgr   │  │ VestController │  │ Event Broadcasting │   │
│  │ (event parser)  │──│ (haptic output)│──│ (to Electron UI)   │   │
│  └─────────────────┘  └────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Source Code Analysis

Both bHaptics and OWO mods are open source:
- **bHaptics**: https://github.com/floh-bhaptics/PistolWhip_bhaptics
- **OWO**: https://github.com/floh-bhaptics/PistolWhip_OWO

### Harmony Patches (Game Hooks)

| Class | Method | Event | Notes |
|-------|--------|-------|-------|
| `Gun` | `Fire()` | Gun fired | Hand-specific, checks ammo |
| `Gun` | `Reload()` | Gun reloaded | Hip/shoulder/trigger variants |
| `MeleeWeapon` | `ProcessHit()` | Melee hit | Hand-specific |
| `Projectile` | `ShowPlayerHitEffects()` | Player hit | Getting shot |
| `Player` | `ProcessKillerHit()` | Death | Fatal hit |
| `PlayerHUD` | `OnArmorLost()` | Armor lost | Low health |
| `PlayerHUD` | `playArmorGainedEffect()` | Healing | Armor pickup |
| `PlayerHUD` | `OnPlayerDeath()` | Death screen | Confirmation |
| `GunAmmoDisplay` | `Update()` | Ammo check | Track empty guns |
| `Reloader` | `SetReloadMethod()` | Reload type | Gesture vs trigger |

### Gun Types

```csharp
// From source code
if (__instance.gunType == 3) { /* Shotgun */ }
else { /* Regular pistol */ }
```

### Reload Types

```csharp
// ESettings_ReloadType enum
DOWN     // Hip reload
UP       // Shoulder reload  
BOTH     // Position-based
```

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
| **Gun Fire (Right)** | 1, 5 | 5 | 80ms | Quick recoil pulse |
| **Gun Fire (Left)** | 0, 4 | 5 | 80ms | Quick recoil pulse |
| **Shotgun Fire (Right)** | 1, 3, 5, 7 | 8 | 150ms | Heavy recoil |
| **Shotgun Fire (Left)** | 0, 2, 4, 6 | 8 | 150ms | Heavy recoil |
| **Melee Hit (Right)** | 1, 5 | 6 | 100ms | Impact feedback |
| **Melee Hit (Left)** | 0, 4 | 6 | 100ms | Impact feedback |
| **Reload Hip (Right)** | 3 | 4 | 200ms | Lower right |
| **Reload Hip (Left)** | 2 | 4 | 200ms | Lower left |
| **Reload Shoulder (Right)** | 5 | 4 | 200ms | Upper back right |
| **Reload Shoulder (Left)** | 4 | 4 | 200ms | Upper back left |
| **Player Hit** | 0, 1 | 7 | 150ms | Front chest impact |
| **Death** | All (0-7) | 10 | 1000ms | Full body |
| **Low Health** | 2, 3 | 3 | Loop | Heartbeat pulse |
| **Healing** | 2, 3, 6, 7 | 4 | 300ms | Warmth spread |

## Implementation Plan

### Phase 1: Create C# MelonLoader Mod

**Files to create:**
```
pistolwhip-mod/
├── ThirdSpace_PistolWhip.sln
├── ThirdSpace_PistolWhip/
│   ├── ThirdSpace_PistolWhip.cs    # Main mod (Harmony patches)
│   ├── DaemonClient.cs              # TCP client (reuse from SuperHot)
│   ├── HapticEvents.cs              # Event definitions
│   └── Properties/
│       └── AssemblyInfo.cs
└── README.md
```

**Key code structure:**
```csharp
[assembly: MelonInfo(typeof(ThirdSpace_PistolWhip), "ThirdSpace_PistolWhip", "1.0.0", "ThirdSpace")]
[assembly: MelonGame("Cloudhead Games, Ltd.", "Pistol Whip")]

namespace ThirdSpace_PistolWhip
{
    public class ThirdSpace_PistolWhip : MelonMod
    {
        public static DaemonClient daemon;
        
        // Track state
        public static bool rightGunHasAmmo = true;
        public static bool leftGunHasAmmo = true;
        public static bool lowHealth = false;
        
        [HarmonyPatch(typeof(Gun), "Fire")]
        public class Patch_GunFire
        {
            [HarmonyPostfix]
            public static void Postfix(Gun __instance)
            {
                bool isRight = __instance.hand.name.Contains("Right");
                bool isShotgun = __instance.gunType == 3;
                
                string eventName = isShotgun ? "shotgun_fire" : "gun_fire";
                daemon.SendEvent(eventName, isRight ? "right" : "left");
            }
        }
        // ... more patches
    }
}
```

### Phase 2: Add Python Daemon Support

**Files to create/modify:**
```
modern-third-space/src/modern_third_space/server/
└── pistolwhip_manager.py    # Event processor and haptic mapper
```

**Protocol events:**
```json
{"cmd": "pistolwhip_event", "event": "gun_fire", "hand": "right"}
{"cmd": "pistolwhip_event", "event": "shotgun_fire", "hand": "left"}
{"cmd": "pistolwhip_event", "event": "melee_hit", "hand": "right"}
{"cmd": "pistolwhip_event", "event": "reload_hip", "hand": "left"}
{"cmd": "pistolwhip_event", "event": "reload_shoulder", "hand": "right"}
{"cmd": "pistolwhip_event", "event": "player_hit"}
{"cmd": "pistolwhip_event", "event": "death"}
{"cmd": "pistolwhip_event", "event": "low_health"}
{"cmd": "pistolwhip_event", "event": "healing"}
```

### Phase 3: Electron UI Panel

**Files to create:**
```
web/src/components/PistolWhipIntegrationPanel.tsx
web/src/hooks/usePistolWhipIntegration.ts
web/electron/ipc/pistolwhipHandlers.cjs
```

### Phase 4: Testing & Polish

1. Test each event fires correctly
2. Tune timing for rhythm game feel
3. Ensure heartbeat syncs well with gameplay
4. Package for distribution

## Comparison with SuperHot VR

| Aspect | SuperHot VR | Pistol Whip |
|--------|-------------|-------------|
| Engine | Unity (Mono) | Unity (Il2Cpp) |
| MelonLoader | Yes | Yes |
| Harmony | Yes | Yes |
| Hand tracking | Yes | Yes |
| Events | 12 | ~10 |
| Rhythm element | No | Yes |
| Reload types | 1 | 3 (hip/shoulder/trigger) |

**Key difference**: Pistol Whip uses Il2Cpp (ahead-of-time compilation), so class names are accessed via `Il2Cpp` namespace. This doesn't significantly change the Harmony patching approach.

## User Setup

### Prerequisites
1. **Pistol Whip** (Steam/Oculus version)
2. **MelonLoader 0.6.x** (for Il2Cpp games)
3. **Third Space Vest daemon** running on port 5050

### Installation
1. Install MelonLoader into Pistol Whip
2. Download `ThirdSpace_PistolWhip.dll`
3. Copy to `Pistol Whip/Mods/`
4. Start daemon and launch game

### Configuration
Create `Pistol Whip/Mods/ThirdSpace_Config.txt` for custom IP:
```
192.168.1.100:5050
```

## Technical Notes

### Il2Cpp Considerations

Pistol Whip uses Il2Cpp which requires:
- `Il2Cpp` assembly reference for game types
- Slightly different type access patterns
- Compatible with MelonLoader 0.6.x+

### Rhythm Game Timing

Since Pistol Whip is rhythm-based:
- Haptic events should be crisp and immediate
- No lingering effects that could desync with music
- Recoil timing should feel snappy (50-100ms)

### Dual Wield Support

The game supports dual wielding, so:
- Track ammo state for both hands separately
- Fire events are hand-specific
- Reload can happen independently

## Files Reference

### In Repository
- `misc-documentations/bhaptics-svg-24-nov/pistol-whip/` - OWO mod files
- `misc-documentations/bhaptics-svg-24-nov/pistol-whip/PistolWhip_bhaptics.dll` - bHaptics DLL

### External
- [bHaptics source](https://github.com/floh-bhaptics/PistolWhip_bhaptics)
- [OWO source](https://github.com/floh-bhaptics/PistolWhip_OWO)
- [NexusMods page](https://www.nexusmods.com/pistolwhip/mods/1)

## Next Steps

1. [ ] **Phase 1**: Create C# mod (fork SuperHot mod structure)
2. [ ] **Phase 2**: Add `pistolwhip_manager.py` to daemon
3. [ ] **Phase 3**: Create Electron UI panel
4. [ ] **Phase 4**: Test and tune for rhythm gameplay
5. [ ] **Phase 5**: Package and document

## Estimated Effort

| Phase | Time | Notes |
|-------|------|-------|
| Phase 1 (C# mod) | 1-2 days | Similar to SuperHot |
| Phase 2 (Python) | 0.5 day | Copy SuperHot pattern |
| Phase 3 (UI) | 0.5 day | Copy SuperHot pattern |
| Phase 4 (Testing) | 1 day | Rhythm timing critical |
| **Total** | **3-4 days** | |

---

**Document Status:** Planning complete  
**Based on:** bHaptics v1.5.0 and OWO v3.0.2 source analysis  
**Next Action:** Implement Phase 1 (C# MelonLoader mod)

