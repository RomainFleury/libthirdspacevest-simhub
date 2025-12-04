# Half-Life 2: Deathmatch Integration

> **Status: ✅ IMPLEMENTED**
>
> The Half-Life 2: Deathmatch integration has been implemented and is available via the daemon and Electron UI.

This document outlines the strategy and implementation for integrating haptic feedback with Half-Life 2: Deathmatch using the Third Space Vest.

## Quick Start

1. **Launch HL2:DM with console logging** - Add `-condebug` to Steam launch options
2. **Start integration** - Use the Electron UI or daemon command
3. **Play the game** - Haptic feedback will trigger on damage, death, and kills

### Daemon Commands

```bash
# Start HL2:DM integration (auto-detect log path)
echo '{"cmd":"hl2dm_start"}' | nc localhost 5050

# Start with custom log path
echo '{"cmd":"hl2dm_start","log_path":"/path/to/console.log"}' | nc localhost 5050

# Start with player name filter (only trigger haptics for your player)
echo '{"cmd":"hl2dm_start","message":"YourPlayerName"}' | nc localhost 5050

# Stop integration
echo '{"cmd":"hl2dm_stop"}' | nc localhost 5050

# Check status
echo '{"cmd":"hl2dm_status"}' | nc localhost 5050
```

## Overview

Half-Life 2: Deathmatch is a Source engine multiplayer game. Like other Source games (L4D2, HL:Alyx), it supports console logging via the `-condebug` launch option.

This integration watches the `console.log` file for game events (damage, death, kills) and triggers corresponding haptic feedback on the Third Space Vest.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Half-Life 2: Deathmatch                          │
│              (launched with -condebug)                           │
│  • Outputs game events to console.log                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ writes to console.log
┌─────────────────────────────────────────────────────────────────┐
│  console.log (Half-Life 2 Deathmatch/hl2mp/console.log)         │
│  Created when game launched with -condebug                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ tails/watches file
┌─────────────────────────────────────────────────────────────────┐
│       Python Integration (server/hl2dm_manager.py)              │
│  • File watcher (50ms polling)                                  │
│  • Line parser for damage/death/kill events                     │
│  • Event-to-haptic mapper                                        │
│  • Integrated with vest daemon                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ triggers vest cells
┌─────────────────────────────────────────────────────────────────┐
│                    Vest Daemon (port 5050)                      │
│                    └── Third Space Vest                         │
└─────────────────────────────────────────────────────────────────┘
```

## Console Log Event Detection

The integration parses Source engine console output for key events:

### Damage Events

Source engine logs damage events in various formats:
```
"PlayerName" took 25 damage from "AttackerName"
"PlayerName" was killed by "AttackerName"
```

### Kill Feed Events

Kill feed messages appear in console:
```
PlayerName killed VictimName with weapon_pistol
PlayerName suicided
```

### Supported Events

| Event | Detection Pattern | Haptic Effect |
|-------|-------------------|---------------|
| **Player Damage** | `took X damage` | Directional pulse based on damage amount |
| **Player Death** | `was killed by` / death messages | Full vest strong pulse |
| **Got a Kill** | `killed` (player is attacker) | Quick front pulse (victory) |
| **Respawn** | Spawn messages | Light full vest pulse |

## Event-to-Haptic Mapping

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

### Mapping Table

| Event | Cells | Intensity | Duration |
|-------|-------|-----------|----------|
| **Light Damage (1-25)** | Front upper | 3-5 | 150ms |
| **Medium Damage (26-50)** | Front all | 5-7 | 200ms |
| **Heavy Damage (51+)** | All cells | 7-10 | 250ms |
| **Death** | All cells | 10 (max) | 500ms |
| **Got a Kill** | Front upper | 4 | 100ms |
| **Respawn** | All cells | 3 | 200ms |

### Damage Intensity Scaling

Damage is mapped to haptic intensity:
- **1-10 damage**: Intensity 3
- **11-25 damage**: Intensity 5
- **26-50 damage**: Intensity 7
- **51-75 damage**: Intensity 8
- **76-100+ damage**: Intensity 10

## Setup Instructions

### 1. Enable Console Logging

Add `-condebug` to HL2:DM Steam launch options:

1. Right-click Half-Life 2: Deathmatch in Steam library
2. Select "Properties"
3. In "Launch Options", add: `-condebug`

### 2. Console Log Location

The console.log file is created in:

- **Windows**: `C:\Program Files (x86)\Steam\steamapps\common\Half-Life 2 Deathmatch\hl2mp\console.log`
- **Linux**: `~/.steam/steam/steamapps/common/Half-Life 2 Deathmatch/hl2mp/console.log`
- **macOS**: `~/Library/Application Support/Steam/steamapps/common/Half-Life 2 Deathmatch/hl2mp/console.log`

### 3. Start Integration

Use the Electron UI or CLI:

```bash
# Start daemon first
python3 -m modern_third_space.cli daemon start

# HL2:DM integration is embedded in daemon, use daemon commands
echo '{"cmd":"hl2dm_start"}' | nc localhost 5050
```

### 4. Launch the Game

Start Half-Life 2: Deathmatch and join a server. Haptic feedback will trigger automatically!

## Player Name Filter (Optional)

In a multiplayer game, you may want to only receive haptics for YOUR player, not all players. Set your player name when starting:

```bash
echo '{"cmd":"hl2dm_start","message":"YourSteamName"}' | nc localhost 5050
```

This filters events to only those involving your player.

## Implementation Details

### Files Created

| File | Description |
|------|-------------|
| `server/hl2dm_manager.py` | Console log watcher, event parser, haptic mapper |
| `web/src/components/HL2DMIntegrationPanel.tsx` | React UI component |
| `web/src/hooks/useHL2DMIntegration.ts` | React hook for state management |
| `web/electron/ipc/hl2dmHandlers.cjs` | Electron IPC handlers |

### Daemon Commands & Events

**Commands:**
- `hl2dm_start` - Start watching console.log (optional `log_path`, `message` for player name)
- `hl2dm_stop` - Stop watching
- `hl2dm_status` - Get running state, events received, last event time

**Events (broadcast to all clients):**
- `hl2dm_started` - Integration started (includes log_path)
- `hl2dm_stopped` - Integration stopped
- `hl2dm_game_event` - Game event detected (includes event_type and params)

## Troubleshooting

### No Events Detected

1. **Check -condebug**: Ensure `-condebug` is in launch options
2. **Restart game**: Launch options only apply on game startup
3. **Check log path**: Verify console.log exists and is being written to
4. **Check permissions**: Ensure Python can read the log file

### Wrong Player Events

Use the player name filter to only receive events for your player:
```bash
echo '{"cmd":"hl2dm_start","message":"YourName"}' | nc localhost 5050
```

### Delayed Haptics

The integration polls the log file every 50ms. This should feel instant but may have slight delay on very fast events.

## Comparison with Other Source Engine Games

| Feature | HL2:DM | CS2 | L4D2 | HL:Alyx |
|---------|--------|-----|------|---------|
| Official API | ❌ | ✅ GSI | ❌ | ❌ |
| Console Logging | ✅ | ✅ | ✅ | ✅ |
| VScript Support | Limited | ❌ | ✅ | ✅ |
| Directional Damage | Limited | ✅ | ✅ | ✅ |
| Integration Method | Log Watch | HTTP | Log Watch | Log Watch |

## References

- [Half-Life 2: Deathmatch on Steam](https://store.steampowered.com/app/320/HalfLife_2_Deathmatch/)
- [Source Engine Console Commands](https://developer.valvesoftware.com/wiki/Console_Command_List)
- [DAEMON_ARCHITECTURE.md](./DAEMON_ARCHITECTURE.md) - Daemon protocol documentation
