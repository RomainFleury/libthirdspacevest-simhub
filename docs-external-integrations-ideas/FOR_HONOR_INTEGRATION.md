# For Honor Haptic Integration

> **Status: 🔬 RESEARCH / LOG-BASED APPROACH**
>
> For Honor is a third-person melee combat game by Ubisoft. This integration uses log file watching similar to the Half-Life: Alyx approach.

## Overview

For Honor is a melee combat-focused game where players engage in sword fighting with directional attacks and blocks. The game's combat system with its directional attack stance (left, right, top) makes it ideal for directional haptic feedback on the Third Space Vest.

```
┌─────────────────────────────────────────────────────────────────┐
│                      For Honor                                   │
│  (Runs with -log flag to enable console output)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ writes to log file
┌─────────────────────────────────────────────────────────────────┐
│  Log file (ForHonor.log)                                         │
│  Location varies by Ubisoft Connect installation                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ tails/watches file
┌─────────────────────────────────────────────────────────────────┐
│       Python Integration (server/forhonor_manager.py)           │
│  • File watcher (polling)                                        │
│  • Line parser for combat events                                 │
│  • Directional damage → cell mapping                             │
│  • TCP connection to vest daemon                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ TCP commands
┌─────────────────────────────────────────────────────────────────┐
│                    Vest Daemon (port 5050)                      │
│                    └── Third Space Vest                         │
└─────────────────────────────────────────────────────────────────┘
```

## Game Information

| Aspect | Details |
|--------|---------|
| **Developer** | Ubisoft Montreal |
| **Engine** | AnvilNext 2.0 (Ubisoft proprietary) |
| **Platform** | PC (Ubisoft Connect/Steam), PS4/PS5, Xbox |
| **Anti-Cheat** | EasyAntiCheat (EAC) |
| **Modding** | Limited - no official mod support |
| **Release** | 2017, ongoing support |

## ⚠️ Key Differences from Other Integrations

| Aspect | Unity Games (Superhot, Pistol Whip) | For Honor (AnvilNext) |
|--------|-------------------------------------|----------------------|
| **Engine** | Unity | AnvilNext 2.0 |
| **Mod Framework** | MelonLoader / BepInEx | ❌ None available |
| **Anti-Cheat** | None / Minimal | EasyAntiCheat |
| **Log Output** | Via mods | Native (with flags) |
| **Injection** | C# runtime injection | ❌ Blocked by EAC |

## Existing Haptic Mods Research

### bHaptics

**Status: ✅ FOUND - bHaptics Player Integration**

bHaptics has official support for For Honor via their bHaptics Player app:
- Listed on bHaptics website as supported game
- Uses screen analysis / game audio for trigger detection
- Community-created patterns available

**Reference**: [bHaptics Games List](https://www.bhaptics.com/experiences/games)

### OWO

**Status: ❌ Not found**

No OWO integration found for For Honor on:
- OWO Games page
- GitHub OWODevelopers

## Integration Approach

### Primary: Log File Watching

For Honor can output debug logs when launched with specific flags. Similar to our HL:Alyx integration, we can monitor these logs for combat events.

**Launch Parameters** (add to Ubisoft Connect or Steam):
```
-log -logfile "ForHonor.log"
```

**Log Locations** (Windows):
```
# Ubisoft Connect
%LOCALAPPDATA%\Ubisoft Game Launcher\logs\

# Steam version
C:\Program Files (x86)\Steam\steamapps\common\FOR HONOR\logs\

# Custom log path
Specified via -logfile parameter
```

### Fallback: Audio Analysis

If log-based approach proves insufficient, we can implement audio-based detection:
- Monitor game audio for combat sound cues
- Detect hit sounds, block sounds, death sounds
- Map audio events to haptic feedback

### Not Recommended: Memory Reading

Memory reading/injection is **NOT recommended** due to:
- EasyAntiCheat actively blocks such attempts
- Risk of game bans
- Breaks with every game update

## Combat Event Detection

For Honor's combat system features directional attacks from three stances:

```
         TOP (Guard Up)
              ▲
              │
    LEFT ◄────┼────► RIGHT
              │
              ▼
         (Guard Down)
```

### Events to Detect

| Event | Detection Method | Haptic Effect |
|-------|------------------|---------------|
| **Damage (Left)** | Log pattern / Audio | Left side cells (2, 3, 1, 0) |
| **Damage (Right)** | Log pattern / Audio | Right side cells (5, 4, 6, 7) |
| **Damage (Top)** | Log pattern / Audio | Upper cells (2, 5, 1, 6) |
| **Heavy Hit** | Log pattern / Audio | Full side + higher intensity |
| **Block/Parry** | Log pattern / Audio | Light pulse on guard side |
| **Guard Break** | Log pattern / Audio | Full front (2, 3, 4, 5) |
| **Death** | Log pattern / Audio | All cells max intensity |
| **Execution (Victim)** | Log pattern | Dramatic multi-pulse |
| **Kill/Execution (Attacker)** | Log pattern | Quick satisfaction pulse |

### Damage Direction Mapping

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

Attack from LEFT  → Cells 2, 3 (Front-Left) + 1, 0 (Back-Left)
Attack from RIGHT → Cells 5, 4 (Front-Right) + 6, 7 (Back-Right)  
Attack from TOP   → Cells 2, 5 (Front-Upper) + 1, 6 (Back-Upper)
```

## Implementation Plan

### Phase 0: Research & Validation (Current)

1. ✅ Research existing haptic mods (bHaptics found)
2. ⬜ Test For Honor log output with `-log` flag
3. ⬜ Identify useful log patterns for combat events
4. ⬜ Validate log file location on different installations

### Phase 1: Log File Watcher

Create `server/forhonor_manager.py`:

```python
class ForHonorManager:
    """
    For Honor log file watcher for haptic feedback.
    
    Watches the game's log file for combat events and triggers
    corresponding haptic effects on the vest.
    """
    
    DEFAULT_LOG_PATHS = [
        # Ubisoft Connect
        Path(os.environ.get("LOCALAPPDATA", "")) / "Ubisoft Game Launcher" / "logs" / "ForHonor.log",
        # Steam common
        Path("C:/Program Files (x86)/Steam/steamapps/common/FOR HONOR/logs/ForHonor.log"),
    ]
```

### Phase 2: Event Parser

Parse log lines for combat events:

```python
# Example log patterns (to be validated with actual game logs)
COMBAT_PATTERNS = {
    r"Player took (\d+) damage from (LEFT|RIGHT|TOP)": "damage",
    r"Player blocked attack from (LEFT|RIGHT|TOP)": "block",
    r"Player died": "death",
    r"Guard break on player": "guard_break",
}
```

### Phase 3: Haptic Mapper

Map combat events to vest cells:

```python
def _trigger_damage(self, direction: str, amount: int):
    """Trigger directional damage haptics."""
    speed = min(10, max(3, amount // 10))  # Scale by damage
    
    if direction == "LEFT":
        cells = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT,
                 Cell.BACK_UPPER_LEFT, Cell.BACK_LOWER_LEFT]
    elif direction == "RIGHT":
        cells = [Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT,
                 Cell.BACK_UPPER_RIGHT, Cell.BACK_LOWER_RIGHT]
    elif direction == "TOP":
        cells = UPPER_CELLS
    
    for cell in cells:
        self._on_trigger(cell, speed)
```

### Phase 4: Daemon Integration

Add daemon commands following existing patterns:
- `forhonor_start` - Start watching log file
- `forhonor_stop` - Stop watching
- `forhonor_status` - Get integration status

### Phase 5: UI Integration (Optional)

Add Electron UI panel with:
- Start/Stop controls
- Log file path configuration
- Live event display
- Setup instructions

## Daemon Protocol

### Commands

```json
// Start For Honor integration
{"cmd": "forhonor_start"}
{"cmd": "forhonor_start", "log_path": "/custom/path/ForHonor.log"}

// Stop integration
{"cmd": "forhonor_stop"}

// Check status
{"cmd": "forhonor_status"}
```

### Events

```json
// Integration started
{"event": "forhonor_started", "log_path": "/path/to/ForHonor.log", "ts": 1700000000}

// Integration stopped
{"event": "forhonor_stopped", "ts": 1700000000}

// Game event detected
{"event": "forhonor_game_event", "event_type": "damage", "params": {"direction": "LEFT", "amount": 25}, "ts": 1700000000}
```

## User Setup Requirements

1. **Add Launch Parameters**
   
   In Ubisoft Connect or Steam, add launch options:
   ```
   -log -logfile "ForHonor.log"
   ```

2. **Start the Daemon**
   ```bash
   python -m modern_third_space.cli daemon start
   ```

3. **Start For Honor Integration**
   ```bash
   echo '{"cmd":"forhonor_start"}' | nc localhost 5050
   ```

4. **Launch For Honor**
   
   The game will now write logs that the integration monitors.

## Files to Create

| File | Purpose |
|------|---------|
| `server/forhonor_manager.py` | Log watcher, event parser, haptic mapper |
| `protocol.py` additions | Commands and events for For Honor |
| `daemon.py` additions | Command handlers |

## Testing

### Manual Testing

```bash
# Start daemon
python -m modern_third_space.cli daemon start

# Start For Honor integration
echo '{"cmd":"forhonor_start"}' | nc localhost 5050

# Check status
echo '{"cmd":"forhonor_status"}' | nc localhost 5050

# Stop integration
echo '{"cmd":"forhonor_stop"}' | nc localhost 5050
```

### Simulating Events (for development)

```bash
# Create test log file and append events
echo "Player took 30 damage from LEFT" >> /tmp/test_forhonor.log

# Start with test log
echo '{"cmd":"forhonor_start","log_path":"/tmp/test_forhonor.log"}' | nc localhost 5050
```

## Technical Considerations

### Log File Watching

1. **Polling Interval**: 50ms recommended (same as Alyx)
2. **File Locking**: Use read-only mode, handle IOErrors gracefully
3. **Log Rotation**: Handle file truncation and reset position
4. **Encoding**: UTF-8 expected

### Anti-Cheat Compatibility

The log file watching approach is **EAC-safe** because:
- We only read log files (no injection)
- We don't modify game memory
- We don't hook game processes
- Log output is a native game feature

## References

- [For Honor on Steam](https://store.steampowered.com/app/304390/FOR_HONOR/)
- [For Honor on Ubisoft](https://www.ubisoft.com/en-us/game/for-honor)
- [bHaptics For Honor Support](https://www.bhaptics.com/experiences/games)
- [Ubisoft AnvilNext Engine](https://en.wikipedia.org/wiki/AnvilNext)

## Next Steps

- [ ] Install For Honor and test with `-log` flag
- [ ] Capture sample log output during gameplay
- [ ] Identify combat event patterns in logs
- [ ] Implement log file watcher (based on alyx_manager.py)
- [ ] Test directional haptic feedback
- [ ] Add daemon commands and UI integration

## Comparison to Similar Games

| Game | Engine | Integration Method | Complexity |
|------|--------|-------------------|------------|
| **For Honor** | AnvilNext | Log watching | Medium |
| **Mordhau** | Unreal Engine 4 | Blueprint mod | High |
| **Chivalry 2** | Unreal Engine 4 | Similar to Mordhau | High |

For Honor's log-based approach is simpler than Mordhau's Blueprint mod requirement, making it a better candidate for integration.
