# Age of Empires 2: Definitive Edition Integration

This document describes the haptic vest integration for Age of Empires 2: Definitive Edition (AoE2:DE).

## Overview

Age of Empires 2 is a real-time strategy (RTS) game, which presents unique challenges for haptic feedback compared to first-person shooters. Unlike FPS games where the player directly embodies a character, RTS games have the player commanding units from an overhead view.

### Integration Approach

**Primary Method: Capture Age WebSocket API**

[Capture Age](https://captureage.com/) is a popular community tool for AoE2:DE that provides:
- Real-time game state streaming
- WebSocket API for overlays
- Combat and economy event detection

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   AoE2:DE Game   │────►│   Capture Age    │────►│   Third Space    │
│   (Running)      │     │   (Spectating)   │     │   Daemon         │
└──────────────────┘     └───────┬──────────┘     └────────┬─────────┘
                                 │ WebSocket              │
                                 │ ws://localhost:50506   │
                                 │                        ▼
                                 └──────────────────────►Vest
```

## Haptic Feedback Philosophy

Since AoE2 is a strategy game, we take a different approach to haptic feedback:

| Game Element | Haptic Response | Reasoning |
|--------------|-----------------|-----------|
| **Selected unit attacked** | Light front pulse | You feel when your units take damage |
| **Selected unit killed** | Medium pulse | Loss of a selected unit |
| **Building destroyed** | Strong back pulse | Major asset loss |
| **Age up completed** | Full celebratory wave | Milestone achievement |
| **Research completed** | Light pulse | Progress notification |
| **Combat started** | Subtle heartbeat | Alert to action |
| **Defeat** | Strong full-body pulse | Game over |
| **Victory** | Celebratory wave pattern | You won! |

### Event-to-Cell Mapping

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │   ← Attacks/Damage
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │   ← Building events
  └─────┴─────┘          └─────┴─────┘
```

**Event Mapping:**
- Unit damage → Front upper cells (2, 5) - light, brief
- Unit death → Front cells (2, 5, 3, 4) - medium intensity
- Building destroyed → Back cells (0, 1, 6, 7) - strong
- Age up → All cells in a wave pattern - celebratory
- Victory → All cells pulsing - celebration
- Defeat → All cells - heavy, sustained

## Requirements

### User Setup

1. **Age of Empires 2: Definitive Edition** (Steam or Microsoft Store)
2. **Capture Age** - Free download from https://captureage.com/
3. **Third Space Vest Daemon** running

### How It Works

1. User starts AoE2:DE and begins a game
2. User starts Capture Age and connects to the game (as spectator of self)
3. Start the AoE2 integration in the vest daemon
4. The daemon connects to Capture Age's WebSocket server
5. Game events are translated to haptic feedback

## Capture Age WebSocket API

Capture Age runs a local WebSocket server (typically on port 50506) that streams game events.

### Connection

```
WebSocket: ws://localhost:50506/captureage
```

### Event Types (from Capture Age)

Capture Age emits JSON events. Key events we can use:

```json
{
  "type": "unit_death",
  "player": 1,
  "unit_type": "knight",
  "killer_player": 2,
  "timestamp": 1234567890
}
```

```json
{
  "type": "building_destroyed",
  "player": 1,
  "building_type": "castle",
  "timestamp": 1234567890
}
```

```json
{
  "type": "age_up",
  "player": 1,
  "age": 3,
  "timestamp": 1234567890
}
```

```json
{
  "type": "combat_start",
  "players": [1, 2],
  "timestamp": 1234567890
}
```

```json
{
  "type": "game_end",
  "winner": 1,
  "timestamp": 1234567890
}
```

## Implementation Details

### Manager: `aoe2_manager.py`

The manager connects to Capture Age's WebSocket and maps events to haptics.

```python
# Pseudo-code structure
class AoE2Manager:
    def __init__(self, player_number: int = 1):
        self.player_number = player_number  # Which player to track
        self.ws_url = "ws://localhost:50506"
    
    async def connect_to_capture_age(self):
        # Connect via WebSocket
        pass
    
    async def on_unit_death(self, event):
        if event["player"] == self.player_number:
            # Your unit died - front pulse
            await self.trigger_cells([2, 5], speed=5, duration_ms=200)
    
    async def on_building_destroyed(self, event):
        if event["player"] == self.player_number:
            # Your building destroyed - back cells, stronger
            await self.trigger_cells([0, 1, 6, 7], speed=7, duration_ms=400)
    
    async def on_age_up(self, event):
        if event["player"] == self.player_number:
            # You aged up - celebratory wave
            await self.play_wave_pattern()
```

### Daemon Commands

```json
// Start integration (connect to Capture Age)
{"cmd": "aoe2_start", "player_number": 1}

// Stop integration
{"cmd": "aoe2_stop"}

// Get status
{"cmd": "aoe2_status"}
```

### Daemon Events

```json
{"event": "aoe2_started", "player_number": 1}
{"event": "aoe2_stopped"}
{"event": "aoe2_game_event", "event_type": "unit_death", "params": {...}}
```

## Haptic Effect Definitions

### 1. Unit Damaged
- **Cells:** Front upper (2, 5)
- **Speed:** 3
- **Duration:** 100ms
- **Trigger:** When a selected unit takes damage

### 2. Unit Killed
- **Cells:** Front all (2, 5, 3, 4)
- **Speed:** 5
- **Duration:** 200ms
- **Trigger:** When player's unit dies

### 3. Building Destroyed
- **Cells:** Back all (0, 1, 6, 7)
- **Speed:** 7
- **Duration:** 400ms
- **Trigger:** When player's building is destroyed

### 4. Age Up Completed
- **Pattern:** Wave from lower to upper, all cells
- **Speed:** Moderate (4-6)
- **Duration:** 800ms total
- **Trigger:** When player advances to next age

### 5. Victory
- **Pattern:** Pulsing all cells, 3 pulses
- **Speed:** 6
- **Duration:** 1500ms
- **Trigger:** Game won

### 6. Defeat
- **Cells:** All
- **Speed:** 8
- **Duration:** 1000ms, sustained
- **Trigger:** Game lost

## Alternative Integration Methods

### Option B: Game Log Watching (Limited)

AoE2:DE writes to `warnings.log` but doesn't capture gameplay events reliably.

**Path:** `%USERPROFILE%\Games\Age of Empires 2 DE\logs\`

**Limitations:**
- Only captures crashes and warnings
- No gameplay events
- Not suitable for real-time feedback

### Option C: Audio Detection (Experimental)

Detect game sounds to trigger haptics:
- Combat sounds → Attack feedback
- Building collapse → Destruction feedback
- Fanfare → Victory/Age up

**Limitations:**
- Requires audio processing
- Can be fooled by background noise
- Latency issues

### Option D: Recorded Game Parsing (Post-Game Only)

Parse `.aoe2record` replay files after the game:
- Extract all events
- Play back haptics as a "highlight reel"

**Limitations:**
- Not real-time
- Novelty use case only

## Limitations & Considerations

1. **Capture Age Required**: Users must install and run Capture Age alongside the game
2. **Spectator Mode**: Capture Age spectates the game, which means the integration works best for:
   - Recorded game analysis
   - Live spectating your own games (with slight delay)
3. **Player Selection**: User must specify which player number they are (1-8)
4. **Network Games**: Works with any game mode (single, multi, campaigns)

## User Instructions

### Quick Start

1. Install Capture Age from https://captureage.com/
2. Start Age of Empires 2: Definitive Edition
3. Start Capture Age and connect to your game
4. Start the vest daemon:
   ```bash
   python -m modern_third_space.cli daemon start
   ```
5. Start AoE2 integration:
   ```bash
   python -m modern_third_space.cli aoe2 start --player 1
   ```
6. Play your game and feel the feedback!

### Troubleshooting

**"Cannot connect to Capture Age"**
- Ensure Capture Age is running and connected to a game
- Check if WebSocket port 50506 is accessible
- Try restarting Capture Age

**"No events received"**
- Verify you selected the correct player number
- Ensure you're in an active game (not paused/menu)
- Check Capture Age is properly spectating

## Future Enhancements

1. **Auto-detect player number** from Steam username
2. **Intensity scaling** based on unit value (losing a knight vs. a villager)
3. **Directional feedback** based on where attacks come from on the minimap
4. **Economy feedback** - pulse when resources run low
5. **Custom event mapping** - let users choose what triggers haptics

## References

- [Capture Age Website](https://captureage.com/)
- [Capture Age Discord](https://discord.gg/captureage) - Technical questions
- [AoE2:DE on Steam](https://store.steampowered.com/app/813780/)
- [Age of Empires II Fandom Wiki](https://ageofempires.fandom.com/wiki/Age_of_Empires_II:_Definitive_Edition)
