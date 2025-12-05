# Among Us Integration

> **Status: ✅ IMPLEMENTED**
>
> Among Us integration using BepInEx mod framework.
>
> **Implementation:**
> - C# mod: `amongus-mod/`
> - Python manager: `server/amongus_manager.py`
> - UI panel: `web/src/components/AmongUsIntegrationPanel.tsx`

## Overview

Among Us is a social deduction Unity game where players work together on a spaceship while impostors try to sabotage and kill the crew. The game features:
- Crew tasks and sabotages
- Impostor kills and venting
- Emergency meetings and voting
- Ejection (voted out into space)
- Body reporting

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Among Us (Unity)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        BepInEx                              │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │     ThirdSpace_AmongUs Mod (Harmony patches)          │  │   │
│  │  │                                                        │  │   │
│  │  │  PlayerControl.MurderPlayer() ────┐                   │  │   │
│  │  │  MeetingHud.Start() ──────────────┤                   │  │   │
│  │  │  ExileController.Animate() ───────┼──► Event Logger ──┼──┼───┼──► TCP
│  │  │  Vent.Use() ──────────────────────┤                   │  │   │   Port 5050
│  │  │  PlayerTask.Complete() ───────────┘                   │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python Daemon (TCP 5050)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐   │
│  │ AmongUsManager │  │ VestController │  │ Event Broadcasting  │   │
│  │ (event parser) │──│ (haptic output)│──│ (to Electron UI)    │   │
│  └────────────────┘  └────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Modding Approach

Among Us uses **BepInEx** (not MelonLoader) as its modding framework. The game is built with Unity IL2CPP, so we use BepInEx 6.x with IL2CPP support.

### Key Differences from MelonLoader

| Aspect | MelonLoader | BepInEx |
|--------|-------------|---------|
| Target | Unity Mono games | Unity (Mono & IL2CPP) |
| Used for | VR games (SUPERHOT, Pistol Whip) | Desktop games (Among Us) |
| Plugin base | `MelonMod` | `BasePlugin` |
| Logging | `MelonLogger` | `Log` (BepInEx.Logging) |

## Event Mapping

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

### Event-to-Haptic Mapping

| Event | Cells | Intensity | Duration | Description |
|-------|-------|-----------|----------|-------------|
| **player_killed** | All (0-7) | 10 | 1000ms | Dramatic full-body when impostor kills you |
| **ejected** | Back lower (0, 7) → All | 8 | 1500ms | Falling into space, starts at back |
| **execute_kill** | Front upper (2, 5) | 7 | 200ms | Visceral stab when you kill as impostor |
| **emergency_meeting** | All | 5 | 300ms | Alert pulse when meeting starts |
| **vote_cast** | Front lower (3, 4) | 3 | 100ms | Confirmation click when voting |
| **body_reported** | Front upper (2, 5) | 6 | 250ms | Shock/alarm when body found |
| **task_complete** | Front (2, 3, 4, 5) | 2 | 150ms | Subtle positive feedback |
| **vent_enter** | Back (0, 1, 6, 7) | 4 | 200ms | Whoosh entering vent |
| **vent_exit** | Front (2, 3, 4, 5) | 4 | 200ms | Whoosh exiting vent |
| **sabotage_reactor** | All | 6 | Loop | Pulsing alarm (reactor meltdown) |
| **sabotage_oxygen** | Upper (1, 2, 5, 6) | 5 | Loop | Breathing difficulty |
| **sabotage_lights** | Front upper (2, 5) | 2 | 100ms | Flash when lights go out |
| **sabotage_comms** | Upper (1, 2, 5, 6) | 3 | 150ms | Static effect |
| **game_start** | All | 4 | 300ms | Match beginning |
| **game_end_win** | All | 5 | 500ms | Victory pulse |
| **game_end_lose** | Lower (0, 3, 4, 7) | 6 | 500ms | Defeat sink |

## Implementation

### Daemon Protocol

**Commands from mod:**
```json
{"cmd": "amongus_event", "event": "player_killed"}
{"cmd": "amongus_event", "event": "execute_kill"}
{"cmd": "amongus_event", "event": "ejected"}
{"cmd": "amongus_event", "event": "emergency_meeting"}
{"cmd": "amongus_event", "event": "vote_cast"}
{"cmd": "amongus_event", "event": "body_reported"}
{"cmd": "amongus_event", "event": "task_complete"}
{"cmd": "amongus_event", "event": "vent_enter"}
{"cmd": "amongus_event", "event": "vent_exit"}
{"cmd": "amongus_event", "event": "sabotage_reactor"}
{"cmd": "amongus_event", "event": "sabotage_oxygen"}
{"cmd": "amongus_event", "event": "sabotage_lights"}
{"cmd": "amongus_event", "event": "sabotage_comms"}
{"cmd": "amongus_event", "event": "sabotage_fixed"}
{"cmd": "amongus_event", "event": "game_start"}
{"cmd": "amongus_event", "event": "game_end_win"}
{"cmd": "amongus_event", "event": "game_end_lose"}
```

**Control commands:**
- `amongus_start` - Enable event processing
- `amongus_stop` - Disable event processing
- `amongus_status` - Get integration status

### Game Classes to Patch

Based on Among Us IL2CPP decompilation:

| Event | Class/Method | Notes |
|-------|--------------|-------|
| Kill received | `PlayerControl.MurderPlayer()` | Check if victim is local player |
| Execute kill | `PlayerControl.MurderPlayer()` | Check if killer is local player |
| Ejection | `ExileController.Animate()` | Local player ejected |
| Meeting start | `MeetingHud.Start()` | Emergency or report |
| Vote cast | `MeetingHud.CastVote()` | When local player votes |
| Body reported | `PlayerControl.ReportBody()` | When you find body |
| Task complete | `PlayerTask.Complete()` | When you finish a task |
| Vent use | `Vent.Use()` | Enter/exit vents |
| Sabotage | `ShipStatus.RepairSystem()` | Sabotage events |
| Game start | `ShipStatus.Begin()` | Match starts |
| Game end | `EndGameManager.SetEverythingUp()` | Win/lose |

## User Setup

### Prerequisites
1. **Among Us** (Steam or Epic Games)
2. **BepInEx 6.x** for IL2CPP
3. **Third Space Vest daemon** running on port 5050

### Installation Steps

1. Install BepInEx:
   ```
   Download BepInEx_Unity_IL2CPP from https://builds.bepinex.dev/projects/bepinex_be
   Extract to Among Us game folder
   Run game once to generate folders
   ```

2. Install mod:
   ```
   Copy ThirdSpace_AmongUs.dll to Among Us/BepInEx/plugins/
   ```

3. Start daemon:
   ```bash
   python -m modern_third_space.cli daemon start
   ```

4. Launch Among Us

### Manual IP Configuration

If daemon runs on different machine, create `BepInEx/config/ThirdSpace.cfg`:
```ini
[Network]
Host = 192.168.1.100
Port = 5050
```

## File Structure

```
amongus-mod/
├── ThirdSpace_AmongUs.sln
├── ThirdSpace_AmongUs/
│   ├── ThirdSpace_AmongUs.cs       # Main plugin (BepInEx)
│   ├── DaemonClient.cs             # TCP client for daemon
│   ├── Patches/
│   │   ├── KillPatches.cs          # Kill-related patches
│   │   ├── MeetingPatches.cs       # Meeting/voting patches
│   │   ├── TaskPatches.cs          # Task completion patches
│   │   └── GamePatches.cs          # Game start/end patches
│   ├── Properties/
│   │   └── AssemblyInfo.cs
│   └── ThirdSpace_AmongUs.csproj
├── build.ps1                       # Build script
└── README.md                       # Installation instructions

modern-third-space/src/modern_third_space/server/
└── amongus_manager.py              # Event handling and haptic mapping

web/src/components/
└── AmongUsIntegrationPanel.tsx     # React UI component

web/electron/ipc/
└── amongusHandlers.cjs             # IPC handlers
```

## Implementation Status

- [x] Phase 1: Strategy document
- [x] Phase 2: Python manager (`server/amongus_manager.py`)
- [x] Phase 3: Daemon protocol updates (`server/protocol.py`)
- [x] Phase 4: BepInEx mod (`amongus-mod/`)
- [x] Phase 5: Electron UI panel
- [ ] Phase 6: Test with actual game
- [ ] Phase 7: Package for distribution

## References

- BepInEx Documentation: https://docs.bepinex.dev/
- Among Us Reactor (modding framework): https://github.com/NuclearPowered/Reactor
- Among Us IL2CPP dumps for class references

---

**Document Status:** Implementation complete
**Mod Framework:** BepInEx 6.x (IL2CPP)
**Next Action:** Test with actual game
