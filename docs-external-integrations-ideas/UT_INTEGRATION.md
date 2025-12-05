# Unreal Tournament Integration

This document describes the strategy and implementation for integrating haptic feedback with Unreal Tournament games using the Third Space Vest.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Unreal Tournament                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  ThirdSpaceVest Mutator (UnrealScript)                  │    │
│  │  - Hooks into game events via event handlers            │    │
│  │  - Writes formatted lines to game log                   │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ writes [ThirdSpace] {...}
┌─────────────────────────────────────────────────────────────────┐
│  Game Log File (UnrealTournament/Logs/UnrealTournament.log)     │
│  Created when game launched                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ tails/watches file
┌─────────────────────────────────────────────────────────────────┐
│       Python Integration (server/ut_manager.py)                 │
│  • File watcher (polling)                                       │
│  • Line parser for [ThirdSpace] {EventType|params} format       │
│  • Event-to-haptic mapper with directional support              │
│  • Integrated with vest daemon                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Triggers haptics
┌─────────────────────────────────────────────────────────────────┐
│                    Vest Daemon (port 5050)                      │
│                    └── Third Space Vest                         │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Games

This integration is designed to work with multiple Unreal Tournament versions:

| Game | Engine | Log Path | Status |
|------|--------|----------|--------|
| **Unreal Tournament (2014/Alpha)** | UE4 | `%LOCALAPPDATA%\UnrealTournament\Saved\Logs\` | Primary Target |
| **Unreal Tournament 3** | UE3 | `Documents\My Games\Unreal Tournament 3\UTGame\Logs\` | Supported |
| **Unreal Tournament 2004** | UE2.5 | `UT2004\Logs\` | Planned |
| **Unreal Tournament 99** | UE1 | `UnrealTournament\Logs\` | Planned |

## Integration Method

**Log File Watching** - Similar to Half-Life: Alyx integration:
- Unreal Engine games write extensive logs including game events
- A mutator/mod can output haptic events to the log in a parseable format
- Python integration watches the log file and triggers haptics

This approach is chosen because:
1. ✅ Works across all UT versions with minimal changes
2. ✅ No game source code modification required
3. ✅ Mutators are easy to install (just copy to folder)
4. ✅ Proven pattern from HL:Alyx integration

## Game Event Sources

### Built-in Log Events (No Mutator Required)

Unreal Tournament games log many events natively that can be parsed:

```log
ScriptLog: PlayerName took 25 damage from EnemyName
ScriptLog: PlayerName was killed by EnemyName
ScriptLog: PlayerName fired Enforcer
```

### Enhanced Events (With Mutator)

The ThirdSpaceVest mutator provides structured events with additional data:

```log
[ThirdSpace] {PlayerDamage|health|damage|attacker|direction|weapon}
[ThirdSpace] {PlayerDeath|killer|weapon|headshot}
[ThirdSpace] {WeaponFire|weapon|hand}
[ThirdSpace] {FlagGrab|team}
[ThirdSpace] {FlagCapture|team}
[ThirdSpace] {Dodge|direction}
[ThirdSpace] {JumpBoots}
[ThirdSpace] {ShieldBelt}
[ThirdSpace] {HealthPack|amount}
[ThirdSpace] {ArmorPickup|type}
[ThirdSpace] {KillingSpree|count}
```

## Event-to-Haptic Mapping

### Core Events (Priority 1)

| Event | Detection | Haptic Effect |
|-------|-----------|---------------|
| **Player Damage** | `PlayerDamage\|health\|damage\|...\|direction` | Directional pulse based on damage angle |
| **Player Death** | `PlayerDeath\|killer\|weapon` | Full vest intense pulse |
| **Weapon Fire** | `WeaponFire\|weapon` | Recoil feedback (front upper cells) |
| **Headshot Received** | `PlayerDamage` with headshot flag | Upper cells intense pulse |

### Arena Events (Priority 2)

| Event | Detection | Haptic Effect |
|-------|-----------|---------------|
| **Dodge** | `Dodge\|direction` | Quick pulse in movement direction |
| **Jump Boots** | `JumpBoots` | Lower cells pulse (feet/legs) |
| **Shield Belt** | `ShieldBelt` | Full vest gentle pulse |
| **Killing Spree** | `KillingSpree\|count` | Front upper celebratory pulse |

### CTF/Team Events (Priority 3)

| Event | Detection | Haptic Effect |
|-------|-----------|---------------|
| **Flag Grab** | `FlagGrab\|team` | All cells brief pulse |
| **Flag Capture** | `FlagCapture\|team` | All cells medium pulse |
| **Flag Return** | `FlagReturn` | Front cells brief pulse |

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

### Directional Damage Mapping

Damage direction (0-360°) maps to vest cells:

| Angle Range | Direction | Cells |
|-------------|-----------|-------|
| 315-45° | Front | 2, 5 (front upper) |
| 45-135° | Right | 5, 4, 6, 7 (right side) |
| 135-225° | Back | 1, 6, 0, 7 (all back) |
| 225-315° | Left | 2, 3, 1, 0 (left side) |

### Weapon-Specific Effects

| Weapon | Cells | Speed | Duration |
|--------|-------|-------|----------|
| **Enforcer** | 2, 5 (front upper) | 4 | 100ms |
| **Bio Rifle** | 2, 5, 3, 4 (all front) | 3 | 150ms |
| **Shock Rifle** | 2, 5 (front upper) | 5 | 100ms |
| **Link Gun** | 2, 5 (front upper) | 3 | 50ms (rapid) |
| **Minigun** | 2, 5 (front upper) | 4 | 50ms (rapid) |
| **Flak Cannon** | All front | 7 | 150ms |
| **Rocket Launcher** | All front | 8 | 200ms |
| **Sniper Rifle** | 2, 5, 1, 6 (upper) | 6 | 150ms |
| **Redeemer** | All cells | 10 | 300ms |

## Implementation

### Files Created

| File | Description |
|------|-------------|
| `server/ut_manager.py` | Log file watcher, event parser, haptic mapper |
| `web/src/components/UTIntegrationPanel.tsx` | React UI component |
| `web/src/hooks/useUTIntegration.ts` | React hook for state management |
| `web/electron/ipc/utHandlers.cjs` | Electron IPC handlers |

### Daemon Commands

| Command | Description |
|---------|-------------|
| `ut_start` | Start watching game log (optional `log_path` param) |
| `ut_stop` | Stop watching |
| `ut_status` | Get running state, events received, last event time |

### Daemon Events

| Event | Description |
|-------|-------------|
| `ut_started` | Integration started (includes log_path) |
| `ut_stopped` | Integration stopped |
| `ut_game_event` | Game event detected (includes event_type and params) |

## User Setup

### 1. Install the Mutator (Optional but Recommended)

Copy the `ThirdSpaceVest` mutator files to:

**UT Alpha (UE4):**
```
%LOCALAPPDATA%\UnrealTournament\Saved\Paks\DownloadedPaks\ThirdSpaceVest\
```

**UT2004:**
```
UT2004\System\ThirdSpaceVest.u
UT2004\System\ThirdSpaceVest.int
```

### 2. Configure Game Logging

**UT Alpha (UE4):**
- Logging is enabled by default
- Log location: `%LOCALAPPDATA%\UnrealTournament\Saved\Logs\UnrealTournament.log`

**UT2004:**
- Add to `UT2004.ini` under `[Engine.Engine]`:
  ```ini
  bEnableLogging=True
  ```

### 3. Start the Integration

```bash
# Via daemon command
echo '{"cmd":"ut_start"}' | nc localhost 5050

# With custom log path
echo '{"cmd":"ut_start","log_path":"C:/Games/UT/Logs/UnrealTournament.log"}' | nc localhost 5050
```

Or use the Electron UI's Unreal Tournament panel.

## Log Path Auto-Detection

The integration attempts to find the game log automatically:

### Windows Paths (in order of preference)

1. **UT Alpha:** `%LOCALAPPDATA%\UnrealTournament\Saved\Logs\UnrealTournament.log`
2. **UT3:** `Documents\My Games\Unreal Tournament 3\UTGame\Logs\UTGame.log`
3. **UT2004:** `C:\UT2004\Logs\UT2004.log`
4. **UT99:** `C:\UnrealTournament\Logs\UnrealTournament.log`

### Linux Paths (via Wine/Proton)

1. **UT Alpha (Epic):** `~/.config/Epic/UnrealTournament/Saved/Logs/`
2. **UT2004 (Steam):** `~/.steam/steam/steamapps/common/Unreal Tournament 2004/Logs/`

## Research: Existing Haptic Mods

### bHaptics/OWO Status

No existing bHaptics or OWO mods were found for Unreal Tournament games in:
- GitHub searches
- NexusMods
- ModDB
- Local `misc-documentations/` folder

This integration is designed from scratch based on UT's native event system.

### UnrealScript References

Useful UT modding resources:
- [Unreal Wiki](https://wiki.beyondunreal.com/) - UnrealScript documentation
- [UT2004 Mod DB](https://www.moddb.com/games/unreal-tournament-2004) - Community mods
- [UT99 UnrealScript](https://unreal.fandom.com/wiki/UnrealScript) - Original docs

## Testing Without Game

You can test the integration by simulating log events:

```bash
# Start daemon and UT integration
python3 -m modern_third_space.cli daemon start &
echo '{"cmd":"ut_start","log_path":"/tmp/ut_test.log"}' | nc localhost 5050

# Simulate damage event
echo "[ThirdSpace] {PlayerDamage|75|25|Enemy|45|Enforcer}" >> /tmp/ut_test.log

# Simulate death event
echo "[ThirdSpace] {PlayerDeath|Enemy|RocketLauncher|false}" >> /tmp/ut_test.log

# Simulate weapon fire
echo "[ThirdSpace] {WeaponFire|FlakCannon|right}" >> /tmp/ut_test.log
```

## Future Enhancements

1. **Mutator Package** - Create a downloadable mutator for each UT version
2. **Native UDP Support** - Direct UDP events from game to daemon (no log file)
3. **Multi-Kill Feedback** - Escalating haptics for double kill, triple kill, etc.
4. **Vehicle Support** - Manta, Scorpion, Goliath vehicle feedback
5. **Translocator** - Unique teleport effect

## Status

**Current:** 📋 **PLANNED**
- Phase 1: Log Watcher ⏳
- Phase 2: Event Parser ⏳  
- Phase 3: Haptic Mapper ⏳
- Phase 4: Daemon Integration ⏳
- Phase 5: UI Integration ⏳
