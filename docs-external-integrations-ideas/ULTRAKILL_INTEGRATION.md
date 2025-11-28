# ULTRAKILL Integration

This document describes how to integrate ULTRAKILL with the Third Space Vest using a BepInEx mod.

## Overview

```
┌─────────────────────────────────────┐
│          ULTRAKILL                  │
│     (Unity game + BepInEx)          │
└─────────────┬───────────────────────┘
              │ Game Events (Harmony patches)
              ▼
┌─────────────────────────────────────┐
│   ThirdSpace_ULTRAKILL Mod          │
│   (BepInEx plugin)                  │
│                                     │
│   • Hooks game classes via Harmony  │
│   • Detects damage, weapons, etc.   │
│   • Sends events to daemon via TCP  │
└─────────────┬───────────────────────┘
              │ TCP client (port 5050)
              ▼
┌─────────────────────────────────────┐
│   Vest Daemon                       │
│   (UltrakillManager)                │
│                                     │
│   • Receives events from mod        │
│   • Maps events to haptic effects   │
│   • Triggers vest cells             │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   Third Space Vest Hardware         │
│   (8 actuator cells)                │
└─────────────────────────────────────┘
```

## Research Sources

This integration is based on analysis of:
- **OWO_ULTRAKILL**: https://github.com/OWODevelopers/OWO_ULTRAKILL
- **Bhaptics_Ultrakill**: https://github.com/Evelyn3440/Bhaptics_Ultrakill

## Quick Start

### 1. Install BepInEx

Download and install BepInEx 5.4.23.3:
- Download: https://github.com/BepInEx/BepInEx/releases/tag/v5.4.23.3
- Extract to ULTRAKILL game folder
- Run game once to generate BepInEx folders

### 2. Install Third Space Mod

Copy `ThirdSpace_ULTRAKILL.dll` to:
```
ULTRAKILL/BepInEx/plugins/
```

### 3. Start the Vest Daemon

```bash
python -m modern_third_space.cli daemon start
```

Or use the GUI app (`start-all.bat`)

### 4. Launch ULTRAKILL

The mod will automatically connect to the daemon and start sending haptic events.

## Event-to-Haptic Mapping

### Combat Events

| Event | Detection Method | Haptic Effect |
|-------|------------------|---------------|
| **Damage Taken** | `NewMovement.GetHurt` | Directional based on hit angle |
| **Death** | `hp <= 0` in GetHurt | Full vest pulse (all cells, max intensity) |
| **Explosion** | `Explosion.Collide` | Full vest, high intensity |

### Damage Direction

The mod calculates damage direction using:
```csharp
float angle = Vector3.SignedAngle(-hitForward, player.forward, Vector3.up) + 180;
```

Mapping to vest cells:
- **Front (135° - 225°)**: Cells 2, 3, 4, 5
- **Back (0° - 45° or 315° - 360°)**: Cells 0, 1, 6, 7
- **Left (225° - 315°)**: Cells 2, 3, 1, 0
- **Right (45° - 135°)**: Cells 5, 4, 6, 7

### Weapon Events

| Event | Detection Method | Haptic Effect |
|-------|------------------|---------------|
| **Revolver** | `Revolver.Shoot` | Upper front cells, medium |
| **Shotgun** | `Shotgun.Shoot` | Upper front cells, strong |
| **Nailgun** | `Nailgun.Shoot` | Upper front cells, rapid pulse |
| **Railcannon** | `Railcannon.Shoot` | All front cells, very strong |
| **Rocket Launcher** | `RocketLauncher.Shoot` | Upper front cells, strong |
| **Punch/Parry** | `Punch.PunchSuccess/Parry` | Front cells, medium |

### Movement Events

| Event | Detection Method | Haptic Effect |
|-------|------------------|---------------|
| **Jump** | `NewMovement.Jump` | Lower cells, light |
| **Landing** | `GroundCheck.OnTriggerEnter` | Lower cells, based on fall speed |
| **Stomp** | High fall speed landing | Lower cells, strong |
| **Dash** | `NewMovement.Dodge` | Directional, medium |

### Power-Up Events

| Event | Detection Method | Haptic Effect |
|-------|------------------|---------------|
| **Dual Wield Pickup** | `DualWieldPickup.PickedUp` | Full vest, light pulse |
| **Super Charge** | `NewMovement.SuperCharge` | Full vest, healing pattern |
| **Respawn** | `NewMovement.Respawn` | Full vest, startup pattern |

## Vest Cell Layout

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

## Technical Details

### Harmony Patches

Key classes hooked:
- `NewMovement` - Player state, health, movement
- `GroundCheck` - Landing detection
- `Revolver`, `Shotgun`, `Nailgun`, etc. - Weapon firing
- `Punch` - Melee attacks
- `Explosion` - Explosion damage
- Various projectile classes for directional damage

### Protocol

The mod sends JSON commands to the daemon:

```json
{"cmd": "ultrakill_event", "event": "damage", "direction": "front", "intensity": 50}
{"cmd": "ultrakill_event", "event": "death"}
{"cmd": "ultrakill_event", "event": "revolver_fire"}
{"cmd": "ultrakill_event", "event": "jump"}
```

## Configuration

Create `ThirdSpace_Config.txt` in ULTRAKILL/BepInEx/plugins/ to override daemon address:

```
# Custom daemon address (default: 127.0.0.1:5050)
192.168.1.100:5050
```

## Troubleshooting

### Mod not loading
- Verify BepInEx 5.x is installed (not 6.x)
- Check `BepInEx/LogOutput.log` for errors

### No haptic feedback
- Ensure daemon is running (`python -m modern_third_space.cli daemon start`)
- Check vest is connected in daemon UI
- Look for `[ThirdSpace]` messages in BepInEx console

### Connection issues
- Verify firewall allows localhost connections on port 5050
- Try manual IP configuration

## Building from Source

Requirements:
- Visual Studio 2022 or later
- .NET Framework 4.7.2
- BepInEx libraries (in `libs/` folder)

Build:
```powershell
cd ultrakill-mod
dotnet build -c Release
```

Output: `bin/Release/ThirdSpace_ULTRAKILL.dll`
