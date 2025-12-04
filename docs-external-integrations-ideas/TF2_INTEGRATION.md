# Team Fortress 2 Integration

> **Status: ✅ IMPLEMENTED**
>
> The Team Fortress 2 integration has been fully implemented and is available via the daemon and Electron UI.

This document outlines the strategy and implementation for integrating haptic feedback with Team Fortress 2 using the Third Space Vest.

## Quick Start

1. **Add launch option** - Add `-condebug` to Steam launch options for TF2
2. **Start the daemon** - `python3 -m modern_third_space.cli daemon start`
3. **Start TF2 integration** - Use the Electron UI or daemon command
4. **Launch TF2** - Play the game and feel the haptics!

### Daemon Commands

```bash
# Start TF2 integration (auto-detect log path)
echo '{"cmd":"tf2_start"}' | nc localhost 5050

# Start with custom log path
echo '{"cmd":"tf2_start","log_path":"/path/to/console.log"}' | nc localhost 5050

# Stop integration
echo '{"cmd":"tf2_stop"}' | nc localhost 5050

# Check status
echo '{"cmd":"tf2_status"}' | nc localhost 5050
```

## Overview

Team Fortress 2 is a Source engine game that can output game events to a console log file when launched with the `-condebug` flag. Unlike CS2 which has native Game State Integration (GSI), TF2 requires parsing the console log for game events.

This is similar to the Half-Life: Alyx and L4D2 integration approaches.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Team Fortress 2                               │
│  (Outputs events to console when launched with -condebug)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ writes game events
┌─────────────────────────────────────────────────────────────────┐
│  console.log (Team Fortress 2/tf/console.log)                    │
│  Created when game launched with -condebug                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ tails/watches file
┌─────────────────────────────────────────────────────────────────┐
│       Python Integration (server/tf2_manager.py)                 │
│  • File watcher (polling)                                        │
│  • Line parser for TF2 console events                           │
│  • Event-to-haptic mapper                                        │
│  • Integrated with vest daemon                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ trigger commands
┌─────────────────────────────────────────────────────────────────┐
│                    Vest Daemon (port 5050)                       │
│                    └── Third Space Vest                          │
└─────────────────────────────────────────────────────────────────┘
```

## Console Log Event Format

TF2 writes various events to the console log. Key patterns we parse:

### Damage Events

```
# Player hurt by another player
[DAMAGELOG] Player "PlayerName" hurt "VictimName" for 42 damage with "scattergun"

# Player took damage (console)
Damage Taken from "AttackerName" - 108 (weapon: pistol)
```

### Kill/Death Events

```
# Kill notifications (various formats)
PlayerName killed VictimName with scattergun.
PlayerName killed VictimName with scattergun. (crit)
PlayerName [critical] killed VictimName with scattergun.

# Player death
* PlayerName was killed by AttackerName
```

### Class-Specific Events

```
# Spy backstab
Backstab!
You've backstabbed PlayerName!

# Sniper headshot
Headshot!

# Medic Übercharge
ÜberCharge deployed!

# Pyro ignition
PlayerName ignited VictimName with flamethrower
```

### Game State Events

```
# Round events
Round started.
Round over!

# Capture events
PlayerName captured control point.
PlayerName captured the intelligence!

# Domination/Revenge
You are dominating PlayerName!
REVENGE!
```

## Event-to-Haptic Mapping

### Priority Events (Phase 1)

| Event | Detection Pattern | Vest Effect |
|-------|-------------------|-------------|
| **Damage Taken** | `Damage Taken from` | Intensity scales with damage, front cells |
| **Player Death** | `killed` (with player as victim) | Strong full-vest pulse |
| **Headshot Kill** | `(headshot)` | Quick front upper pulse |
| **Critical Kill** | `(crit)` | Strong front pulse |

### Class-Specific Events (Phase 2)

| Event | Class | Vest Effect |
|-------|-------|-------------|
| **Backstab** | Spy | Strong back pulse |
| **Headshot** | Sniper | Quick upper pulse |
| **ÜberCharge** | Medic | Wave pattern all cells |
| **Rocket Jump** | Soldier | Lower cells burst |
| **Sticky Jump** | Demoman | Lower cells burst |
| **Fire Damage** | All (from Pyro) | Progressive chest pulses |

### Game State Events (Phase 3)

| Event | Vest Effect |
|-------|-------------|
| **Round Start** | Light activation all cells |
| **Capture** | Quick celebratory pulse |
| **Domination** | Strong satisfaction pulse |
| **Revenge** | Victory burst |

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

## Console Log Location

The console log is written when TF2 is launched with `-condebug`:

**Windows:**
```
C:\Program Files (x86)\Steam\steamapps\common\Team Fortress 2\tf\console.log
```

**Linux:**
```
~/.steam/steam/steamapps/common/Team Fortress 2/tf/console.log
```

**macOS:**
```
~/Library/Application Support/Steam/steamapps/common/Team Fortress 2/tf/console.log
```

## Setup Requirements

1. **Enable Console Logging**
   Add `-condebug` to Steam launch options for Team Fortress 2:
   - Open Steam → Right-click TF2 → Properties → Launch Options
   - Add: `-condebug`

2. **Optional: Enhanced Logging**
   For more detailed damage logs, add to `autoexec.cfg`:
   ```
   // TF2 config for haptic integration
   con_logfile console.log
   con_timestamp 1
   ```

3. **Start Integration**
   Launch the TF2 integration before starting the game

## Implementation Details

### Files to Create

| File | Description |
|------|-------------|
| `server/tf2_manager.py` | Console log watcher, event parser, haptic mapper, daemon integration |
| `web/src/components/TF2IntegrationPanel.tsx` | React UI component |
| `web/src/hooks/useTF2Integration.ts` | React hook for state management |
| `web/electron/ipc/tf2Handlers.cjs` | Electron IPC handlers |

### Daemon Commands & Events

**Commands:**
- `tf2_start` - Start watching console.log (optional `log_path` param)
- `tf2_stop` - Stop watching
- `tf2_status` - Get running state, events received, last event time

**Events (broadcast to all clients):**
- `tf2_started` - Integration started (includes log_path)
- `tf2_stopped` - Integration stopped
- `tf2_game_event` - Game event detected (includes event_type and params)

## Technical Notes

### Parsing Challenges

1. **Multi-line events**: Some console output spans multiple lines
2. **Encoding**: Console.log uses various encodings (handle with errors='ignore')
3. **Log rotation**: Game may clear log on restart
4. **Timestamp formats**: May vary based on settings

### Performance Considerations

- Poll interval: 50ms (balanced responsiveness vs CPU usage)
- File locking: TF2 may lock the file, handle IOErrors gracefully
- Large logs: Track file position, don't re-read entire file

## Comparison with Other Source Games

| Game | Method | Mod Required | Setup Complexity |
|------|--------|--------------|------------------|
| **CS2** | HTTP GSI | No | Low (config file) |
| **Half-Life: Alyx** | Console log + Lua mod | Yes | Medium |
| **Left 4 Dead 2** | Console log + VScript | Optional | Medium |
| **Team Fortress 2** | Console log only | No | Low |

TF2 is simpler than Alyx/L4D2 because:
- No game modification required
- Just enable `-condebug` launch option
- Native console output is sufficient

## Future Enhancements

1. **SourceMod Integration**: For server operators, a SourceMod plugin could emit more detailed events
2. **RCON Support**: Connect via RCON for additional status information
3. **Steam Rich Presence**: Detect game state via Steam presence data

## References

- [TF2 Console Commands](https://wiki.teamfortress.com/wiki/List_of_useful_console_commands)
- [TF2 Damage System](https://wiki.teamfortress.com/wiki/Damage)
- [Source Engine Console](https://developer.valvesoftware.com/wiki/Developer_Console)
