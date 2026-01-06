# Assassin's Creed Mirage Integration Strategy

> **Status:** 📋 Planned
>
> This document outlines the strategy for adding haptic feedback support to Assassin's Creed Mirage using the Third Space Vest.

## Overview

Assassin's Creed Mirage is a single-player action-adventure game set in 9th-century Baghdad. The gameplay features stealth assassinations, parkour, and combat with swords and daggers. Key haptic events include:

- **Combat damage** (sword hits, arrows, enemy attacks)
- **Assassinations** (hidden blade kills)
- **Environmental interactions** (falls, explosions)
- **Stealth detection** (heartbeat when enemies are alerted)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Assassin's Creed Mirage (Anvil Engine)              │
│                                                                      │
│  • Writes debug/telemetry logs to AppData                           │
│  • In-memory player state (health, position, combat)                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    Log file watching / Memory reading
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ACMirage Manager                                  │
│                    (server/acmirage_manager.py)                     │
│                                                                      │
│  • Parses log files for game events                                 │
│  • Detects damage, deaths, assassinations                           │
│  • Maps events → haptic effects                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                            TCP (port 5050)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python Daemon                                     │
│                    (server/daemon.py)                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                  USB
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Third Space Vest                                  │
│                    (8 actuator cells)                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Research Findings

### Existing Haptic Support

- **bHaptics Mods**: None found for AC Mirage
- **OWO Mods**: None found for AC Mirage
- **Official Support**: None (DualSense haptics on PS5 only)

### Game Engine Analysis

**Anvil Engine** (Ubisoft proprietary):
- Not Unity (no MelonLoader/BepInEx support)
- Not Unreal Engine
- Limited modding support compared to other engines
- Some games log debug info to `%APPDATA%\Ubisoft\{Game}\logs\`

### Potential Log File Locations

```
Windows:
- %APPDATA%\Ubisoft\Assassin's Creed Mirage\logs\
- C:\Users\{User}\Documents\Assassin's Creed Mirage\
- C:\Program Files (x86)\Ubisoft\Ubisoft Game Launcher\logs\
```

### What We Can Learn from Similar Games

From other AC games with haptic mods (AC Valhalla had some community mods):
- Combat damage detection via health delta monitoring
- Weapon impact types (sword, dagger, bow)
- Environmental damage (fire, fall damage)
- Stealth mechanics (detection states)

## Integration Method

### Primary: Log File Watching

Similar to Star Citizen and Half-Life: Alyx integrations:
- Watch Ubisoft game logs for relevant events
- Parse structured log entries for damage, kills, etc.
- Low latency with file tail watching

### Secondary: Configuration-Based Triggers

For advanced users:
- Manual keybind configuration for haptic triggers
- Global hotkeys for custom effects

## Event-to-Haptic Mapping

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

### Event Mappings

| Event | Cells | Speed | Duration | Description |
|-------|-------|-------|----------|-------------|
| **Player Damage (Front)** | 2, 3, 4, 5 | 6-10 (scaled) | 200ms | Front impact, intensity based on damage |
| **Player Damage (Back)** | 0, 1, 6, 7 | 6-10 (scaled) | 200ms | Back impact (backstab, arrow from behind) |
| **Player Damage (Left)** | 2, 3, 1, 0 | 6-10 (scaled) | 200ms | Left side impact |
| **Player Damage (Right)** | 4, 5, 6, 7 | 6-10 (scaled) | 200ms | Right side impact |
| **Player Death** | ALL (0-7) | 10 | 1000ms | Full vest pulse, max intensity |
| **Assassination Kill** | 3, 4 | 7 | 150ms | Sharp pulse in lower front (hidden blade) |
| **Sword Strike (Right)** | 4, 5, 7 | 5 | 100ms | Right arm recoil |
| **Sword Strike (Left)** | 2, 3, 0 | 5 | 100ms | Left arm recoil |
| **Parry/Block** | 2, 5 | 6 | 100ms | Upper front impact |
| **Fall Damage** | 3, 4, 0, 7 | 8 | 300ms | Lower body impact |
| **Low Health Heartbeat** | 2, 3 | 3 | 500ms (loop) | Subtle pulse, left chest area |
| **Detection Alert** | 1, 6 | 4 | 200ms | Back upper - "eyes on you" feeling |
| **Eagle Vision Active** | ALL | 2 | 150ms | Subtle full vest tingle |

### Intensity Scaling

```python
def scale_damage_intensity(damage_amount: float, max_damage: float = 100.0) -> int:
    """
    Scale damage amount to haptic intensity (1-10).
    
    - Light scratch (5-15 damage): intensity 3-4
    - Medium hit (20-40 damage): intensity 5-7
    - Heavy hit (50+ damage): intensity 8-10
    """
    normalized = min(damage_amount / max_damage, 1.0)
    return max(1, min(10, int(3 + normalized * 7)))
```

## Implementation Plan

### Phase 1: Core Infrastructure (MVP)

**Files to Create:**

```
modern-third-space/src/modern_third_space/server/
├── acmirage_manager.py        # Log file watcher and event parser

web/src/components/
├── ACMirageIntegrationPanel.tsx    # React UI component

web/src/hooks/
├── useACMirageIntegration.ts       # React state hook

web/electron/ipc/
├── acmirageHandlers.cjs            # IPC handlers
```

**Daemon Protocol:**
- `acmirage_start` - Start watching logs
- `acmirage_stop` - Stop watching
- `acmirage_status` - Get integration status

**Events:**
- `acmirage_started` - Integration started
- `acmirage_stopped` - Integration stopped
- `acmirage_game_event` - Game event detected

### Phase 2: Enhanced Detection

- Health monitoring via log parsing
- Combat event detection
- Stealth state changes

### Phase 3: Advanced Features (Future)

- Memory reading for real-time damage direction
- Weapon-specific haptic patterns
- Cutscene detection (disable haptics)

## User Setup Requirements

### Prerequisites

1. **Assassin's Creed Mirage** (Ubisoft Connect)
2. **Third Space Vest Daemon** running on port 5050
3. **Game must be running** with logging enabled

### Installation Steps

1. Start the Third Space Vest daemon:
   ```bash
   python3 -m modern_third_space.cli daemon start
   ```

2. Configure game logging (if needed):
   - Check `%APPDATA%\Ubisoft\Assassin's Creed Mirage\` for logs
   - Enable verbose logging if available in game settings

3. Start the integration in the Electron app

4. Launch Assassin's Creed Mirage

### Log Path Configuration

Default paths checked (in order):
1. `%APPDATA%\Ubisoft\Assassin's Creed Mirage\logs\`
2. `%USERPROFILE%\Documents\Assassin's Creed Mirage\`
3. Custom path (configurable in UI)

## Technical Challenges & Solutions

### Challenge 1: Log File Format Unknown

**Problem**: Ubisoft games don't have documented log formats.

**Solution**:
- Analyze actual log files during gameplay
- Support multiple log formats with regex patterns
- Fall back to basic health/damage detection

### Challenge 2: Real-Time Damage Detection

**Problem**: Logs may not update in real-time.

**Solution**:
- Use aggressive file polling (50ms intervals)
- Implement file change detection via mtime
- Buffer events and flush on significant changes

### Challenge 3: Directional Damage

**Problem**: Logs may not contain damage direction.

**Solution**:
- Start with non-directional damage (front cells)
- Parse attacker position if available
- Use combat state to infer direction

## Testing

### Without the Game

Send test events via netcat:
```bash
# Test damage event
echo '{"cmd":"acmirage_event","event":"player_damage","damage":25,"direction":"front"}' | nc localhost 5050

# Test death event
echo '{"cmd":"acmirage_event","event":"player_death"}' | nc localhost 5050

# Test assassination
echo '{"cmd":"acmirage_event","event":"assassination_kill"}' | nc localhost 5050
```

### With the Game

1. Start daemon and integration
2. Launch AC Mirage
3. Enter combat - feel impacts
4. Take damage - feel directional feedback
5. Perform assassinations - feel hidden blade pulse

## References

- [Anvil Engine Wiki](https://assassinscreed.fandom.com/wiki/Anvil)
- [Ubisoft Connect API](https://ubisoftconnect.com/)
- Star Citizen integration (similar log-watching approach)
- Half-Life: Alyx integration (console log parsing)

## Files Reference

### Implementation Files

| File | Description |
|------|-------------|
| `server/acmirage_manager.py` | Log watcher and event processor |
| `components/ACMirageIntegrationPanel.tsx` | React UI panel |
| `hooks/useACMirageIntegration.ts` | React state management |
| `ipc/acmirageHandlers.cjs` | Electron IPC handlers |

### Related Documentation

- `DAEMON_ARCHITECTURE.md` - Daemon protocol reference
- `CELL_MAPPING_AUDIT.md` - Vest cell layout
- `EFFECTS_LIBRARY.md` - Predefined effect patterns

---

**Document Status:** Planning complete  
**Next Action:** Implement Phase 1 (log watcher and basic UI)
