# Arma Reforger Third Space Vest Integration

## Overview

Integration of the Third Space Vest with Arma Reforger for immersive haptic feedback during gameplay. Arma Reforger uses the Enfusion engine with Enforce Script modding support.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Arma Reforger                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Third Space Vest Mod (Enforce Script)            │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│  │
│  │  │ SCR_Player  │  │ SCR_Weapon  │  │  SCR_Vehicle Events     ││  │
│  │  │ DamageHooks │  │ FireHooks   │  │  (Crashes, Impacts)     ││  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘│  │
│  │         │                │                      │              │  │
│  │         └────────────────┼──────────────────────┘              │  │
│  │                          ▼                                     │  │
│  │               ┌─────────────────────┐                         │  │
│  │               │   TCP Client        │                         │  │
│  │               │   (localhost:5050)  │                         │  │
│  │               └──────────┬──────────┘                         │  │
│  └──────────────────────────┼────────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ TCP/JSON
                               ▼
              ┌────────────────────────────────────┐
              │         Python Daemon               │
              │         (localhost:5050)            │
              │                                     │
              │  ┌─────────────────────────────┐   │
              │  │  ArmaReforgerManager       │   │
              │  │  - Parse events             │   │
              │  │  - Map to haptics           │   │
              │  │  - Trigger effects          │   │
              │  └─────────────────────────────┘   │
              │                │                    │
              │                ▼                    │
              │         ┌──────────────┐           │
              │         │    Vest      │           │
              │         │   Hardware   │           │
              │         └──────────────┘           │
              └────────────────────────────────────┘
```

## Integration Method: TCP Client Mod

Arma Reforger uses the Enfusion engine with Enforce Script modding. The integration follows the **TCP client mod** pattern (similar to SUPERHOT VR):

1. An Enforce Script mod hooks into game events
2. Events are sent as JSON over TCP to the Python daemon (port 5050)
3. The daemon maps events to haptic effects
4. Vest feedback is triggered in real-time

### Why TCP instead of Log Watching?

- **Real-time**: No polling delay, instant feedback
- **Reliable**: Direct connection, no file I/O issues
- **Bidirectional**: Future support for daemon-to-game messages
- **Consistent**: Same pattern as SUPERHOT VR and Pistol Whip mods

## Game Events to Capture

### Player Events

| Event | Description | Haptic Mapping |
|-------|-------------|----------------|
| `player_damage` | Player takes damage | Directional cells based on damage angle |
| `player_death` | Player dies | Full vest pulse, max intensity |
| `player_heal` | Health restored | Gentle front cells pulse |
| `player_suppressed` | Under heavy fire | Subtle full body rumble |

### Weapon Events

| Event | Description | Haptic Mapping |
|-------|-------------|----------------|
| `weapon_fire_rifle` | Rifle fired | Upper front cells, medium intensity |
| `weapon_fire_mg` | Machine gun fired | Upper front cells, sustained |
| `weapon_fire_pistol` | Pistol fired | Upper front cells, light |
| `weapon_fire_launcher` | Launcher fired | Full upper body, strong |
| `weapon_reload` | Weapon reloaded | Brief front lower pulse |
| `grenade_throw` | Grenade thrown | Arm-side cells pulse |

### Vehicle Events

| Event | Description | Haptic Mapping |
|-------|-------------|----------------|
| `vehicle_collision` | Vehicle crash/impact | Full vest based on severity |
| `vehicle_damage` | Vehicle takes damage | Directional based on hit location |
| `vehicle_explosion` | Vehicle explodes | Full vest, max intensity |
| `helicopter_rotor` | Helicopter rotor feedback | Sustained back cells vibration |

### Environment Events

| Event | Description | Haptic Mapping |
|-------|-------------|----------------|
| `explosion_nearby` | Explosion within range | Intensity scales with distance |
| `bullet_impact_near` | Bullet lands nearby | Quick directional pulse |

## Vest Cell Layout Reference

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

## Event-to-Haptic Mapping

### Damage Direction Mapping

```python
# Angle interpretation (player-relative):
# 0°   = Front
# 90°  = Left
# 180° = Back  
# 270° = Right

def angle_to_cells(angle: float) -> List[int]:
    angle = angle % 360
    
    if angle < 45 or angle >= 315:
        return FRONT_CELLS  # 0° ± 45° = Front
    elif 45 <= angle < 135:
        return LEFT_SIDE    # 90° ± 45° = Left
    elif 135 <= angle < 225:
        return BACK_CELLS   # 180° ± 45° = Back
    else:  # 225 <= angle < 315
        return RIGHT_SIDE   # 270° ± 45° = Right
```

### Intensity Scaling

| Source | Intensity Calculation |
|--------|----------------------|
| Player Damage | `min(10, max(1, damage // 10))` |
| Weapon Recoil | Based on weapon type (3-8) |
| Explosions | `10 - min(9, int(distance / 5))` |
| Vehicle Impacts | Based on collision severity |

## Daemon Protocol

### Commands

```json
// Enable Arma Reforger integration
{"cmd": "armareforger_start"}

// Disable integration
{"cmd": "armareforger_stop"}

// Get integration status
{"cmd": "armareforger_status"}

// Process game event (from mod)
{"cmd": "armareforger_event", "event": "player_damage", "angle": 45.0, "damage": 25}
```

### Events (broadcast to all clients)

```json
// Integration started
{"event": "armareforger_started"}

// Integration stopped  
{"event": "armareforger_stopped"}

// Game event detected
{"event": "armareforger_game_event", "event_type": "player_damage", "params": {"angle": 45.0, "damage": 25}}
```

## Enforce Script Mod Structure

```
ArmaReforger/
└── Mods/
    └── ThirdSpaceVest/
        ├── mod.json
        └── Scripts/
            └── Game/
                ├── ThirdSpaceVestMod.c
                ├── ThirdSpaceTcpClient.c
                ├── ThirdSpacePlayerDamageHandler.c
                ├── ThirdSpaceWeaponHandler.c
                └── ThirdSpaceVehicleHandler.c
```

### Example Enforce Script (Conceptual)

```cpp
// ThirdSpaceVestMod.c
modded class SCR_CharacterDamageManagerComponent
{
    override void OnDamage(
        BaseDamageContext damageContext,
        int damage, 
        EDamageType type,
        vector hitPosition
    )
    {
        super.OnDamage(damageContext, damage, type, hitPosition);
        
        // Get damage direction relative to player
        float angle = CalculateDamageAngle(hitPosition);
        
        // Send to daemon
        ThirdSpaceTcpClient.SendEvent("player_damage", angle, damage);
    }
}

// ThirdSpaceTcpClient.c  
class ThirdSpaceTcpClient
{
    static const string DAEMON_HOST = "127.0.0.1";
    static const int DAEMON_PORT = 5050;
    
    static void SendEvent(string eventType, float angle, int damage)
    {
        string json = string.Format(
            "{\"cmd\":\"armareforger_event\",\"event\":\"%1\",\"angle\":%2,\"damage\":%3}\n",
            eventType, angle.ToString(), damage.ToString()
        );
        // Send via TCP socket...
    }
}
```

## Setup Instructions

### For Users

1. **Install the Third Space Vest mod** from Arma Reforger Workshop
2. **Start the Python daemon**: `python -m modern_third_space.cli daemon start`
3. **Launch Arma Reforger** with the mod enabled
4. **Enable integration** in Third Space UI or via command:
   ```bash
   echo '{"cmd": "armareforger_start"}' | nc localhost 5050
   ```

### For Mod Developers

1. **Clone the mod repository** (future)
2. **Open in Arma Reforger Workbench**
3. **Configure daemon address** in mod settings (default: localhost:5050)
4. **Build and test** using Workbench

## Implementation Status

- [x] Strategy document
- [x] Python manager (`armareforger_manager.py`)
- [x] Daemon protocol additions
- [x] Electron UI integration panel
- [ ] Enforce Script mod (requires Arma Reforger Workbench)

## Research Notes

### Arma Reforger Modding Resources

- **Workbench**: Official modding tool bundled with the game
- **Enforce Script**: C-like scripting language for game logic
- **Wiki**: [Arma Reforger Modding Wiki](https://community.bistudio.com/wiki/Category:Arma_Reforger)
- **Discord**: Arma Platform Discord has modding channels

### Similar Games with Haptic Mods

- **Arma 3**: bHaptics mod exists (uses SQF scripting)
- **DayZ**: Community haptic mods (Enfusion predecessor)

### Key Classes to Hook

Based on Enfusion engine patterns:

- `SCR_CharacterDamageManagerComponent` - Player damage
- `SCR_WeaponComponent` - Weapon firing
- `SCR_VehicleDamageManagerComponent` - Vehicle damage
- `SCR_CharacterControllerComponent` - Player state

## Future Enhancements

1. **Vehicle-specific effects**: Different feedback for tanks, helicopters, boats
2. **Stamina/fatigue feedback**: Subtle pulses when exhausted
3. **Environmental effects**: Swimming, climbing, parachuting
4. **Multiplayer sync**: Ensure haptics only trigger for local player
5. **Configurable intensity**: In-game settings for effect strength
