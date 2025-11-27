# Effects Library Documentation

The Effects Library implements the 24 predefined haptic patterns from the original TN Games SDK, allowing direct testing of vest feedback without needing a game integration.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Test & Debug                              [⏹ Stop All]    │
│  Effects Library                                            │
├─────────────────────────────────────────────────────────────┤
│  🔫 Weapons (8)                                       ▼     │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Machine Gun      │  │ Machine Gun      │               │
│  │ (Front)   480ms  │  │ (Back)    480ms  │               │
│  └──────────────────┘  └──────────────────┘               │
│  ...                                                        │
│                                                             │
│  💥 Impacts (6)                                       ▶     │
│  ⚔️ Melee (4)                                         ▶     │
│  🏎️ Driving (4)                                       ▶     │
│  ✨ Special (6)                                       ▶     │
└─────────────────────────────────────────────────────────────┘
```

## Effect Categories

### 🔫 Weapons (8 effects)

| Effect | Cells | Description |
|--------|-------|-------------|
| Machine Gun (Front) | 2,5,3,4 | Rapid 80ms pulses on front cells |
| Machine Gun (Back) | 1,6,0,7 | Rapid 80ms pulses on back cells |
| Pistol (Front) | 2,5 | Single 150ms pulse, upper front |
| Pistol (Back) | 1,6 | Single 150ms pulse, upper back |
| Shotgun (Front) | All front | Strong 200ms blast |
| Shotgun (Back) | All back | Strong 200ms blast |
| Rifle (Front) | 2,5,3,4 | 2-shot burst |
| Rifle (Back) | 1,6,0,7 | 2-shot burst |

### 💥 Impacts (6 effects)

| Effect | Cells | Description |
|--------|-------|-------------|
| Big Blast (Front) | All front | Max intensity sustained 300ms |
| Big Blast (Back) | All back | Max intensity sustained 300ms |
| Small Blast (Front) | 2,5 | Upper front 150ms |
| Small Blast (Back) | 1,6 | Upper back 150ms |
| Left Side Hit | 2,3,1,0 | All left cells |
| Right Side Hit | 5,4,6,7 | All right cells |

### ⚔️ Melee (4 effects)

| Effect | Cells | Description |
|--------|-------|-------------|
| Punch (Front) | 3,4 | Lower front quick impact |
| Punch (Back) | 0,7 | Lower back quick impact |
| Stab (Front) | 3 or 4 | Single cell sharp pulse |
| Stab (Back) | 0 or 7 | Single cell sharp pulse |

### 🏎️ Driving (4 effects)

| Effect | Cells | Description |
|--------|-------|-------------|
| Acceleration | Back→Front wave | Sequential 100ms steps |
| Deceleration | Front→Back wave | Sequential 100ms steps |
| Left Turn | Right→Left sweep | G-force simulation |
| Right Turn | Left→Right sweep | G-force simulation |

### ✨ Special (6 effects)

| Effect | Cells | Description |
|--------|-------|-------------|
| Heartbeat | Lower cells | Rhythmic double-beat pulse |
| Full Body Pulse | All cells | Expanding 50ms wave |
| Death | All cells | Dramatic fade out |
| Spawn | All cells | Build-up entrance |
| Front Upper | 2,5 | Quick test pulse |
| Back Upper | 1,6 | Quick test pulse |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      EFFECTS LIBRARY                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  vest/effects.py          ←── Effect pattern definitions    │
│       ↓                        (28 HapticEffect objects)    │
│  server/protocol.py       ←── Commands:                     │
│       ↓                        - play_effect                │
│  server/daemon.py         ←── - list_effects                │
│       ↓                        - stop_effect                │
│  electron/preload.cjs     ←── IPC bridge                    │
│       ↓                                                      │
│  EffectsLibraryPanel.tsx  ←── React UI component            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Files Reference

| File | Purpose |
|------|---------|
| `modern-third-space/src/modern_third_space/vest/effects.py` | Effect definitions |
| `modern-third-space/src/modern_third_space/server/protocol.py` | Protocol commands |
| `modern-third-space/src/modern_third_space/server/daemon.py` | Effect playback handler |
| `web/electron/ipc/effectsHandlers.cjs` | Electron IPC handlers |
| `web/electron/preload.cjs` | Bridge exposure |
| `web/src/lib/bridgeApi.ts` | TypeScript types |
| `web/src/components/EffectsLibraryPanel.tsx` | UI component |

## Daemon Protocol

### Play Effect

```json
{
  "cmd": "play_effect",
  "req_id": "abc123",
  "effect_name": "machinegun_front"
}
```

Response:
```json
{
  "success": true,
  "req_id": "abc123"
}
```

### List Effects

```json
{
  "cmd": "list_effects",
  "req_id": "abc123"
}
```

Response:
```json
{
  "success": true,
  "req_id": "abc123",
  "effects": [
    {
      "name": "machinegun_front",
      "display_name": "Machine Gun (Front)",
      "category": "weapons",
      "description": "Rapid fire pulses on front cells",
      "duration_ms": 480
    }
  ],
  "categories": ["weapons", "impacts", "melee", "driving", "special"]
}
```

### Stop Effect

```json
{
  "cmd": "stop_effect",
  "req_id": "abc123"
}
```

## Effect Pattern Structure

Each effect is defined as a `HapticEffect` dataclass:

```python
@dataclass
class HapticEffect:
    name: str              # Internal identifier (e.g., "machinegun_front")
    display_name: str      # UI display name (e.g., "Machine Gun (Front)")
    category: str          # Category for grouping (e.g., "weapons")
    description: str       # Tooltip description
    pattern: List[Tuple[List[int], int, int]]  # (cells, speed, delay_ms)

# Example pattern - Machine Gun Front
HapticEffect(
    name="machinegun_front",
    display_name="Machine Gun (Front)",
    category="weapons",
    description="Rapid fire pulses on front cells",
    pattern=[
        ([Cell.FRONT_UPPER_LEFT], 8, 80),   # cells, speed, delay
        ([Cell.FRONT_UPPER_RIGHT], 8, 80),
        ([Cell.FRONT_LOWER_LEFT], 8, 80),
        ([Cell.FRONT_LOWER_RIGHT], 8, 80),
        ([Cell.FRONT_UPPER_LEFT], 8, 80),
        ([Cell.FRONT_UPPER_RIGHT], 8, 0),   # Last step, no delay
    ]
)
```

## Cell Layout Reference

```
     FRONT           BACK
   ┌───────┐      ┌───────┐
   │ 2   5 │      │ 1   6 │
   │ UL UR │      │ UL UR │
   ├───────┤      ├───────┤
   │ 3   4 │      │ 0   7 │
   │ LL LR │      │ LL LR │
   └───────┘      └───────┘
```

Uses constants from `vest/cell_layout.py`:
- `Cell.FRONT_UPPER_LEFT` = 2
- `Cell.FRONT_UPPER_RIGHT` = 5
- `Cell.FRONT_LOWER_LEFT` = 3
- `Cell.FRONT_LOWER_RIGHT` = 4
- `Cell.BACK_UPPER_LEFT` = 1
- `Cell.BACK_UPPER_RIGHT` = 6
- `Cell.BACK_LOWER_LEFT` = 0
- `Cell.BACK_LOWER_RIGHT` = 7

## Usage

1. **Start the daemon**:
   ```bash
   python3 -m modern_third_space.cli daemon start
   ```

2. **Start the Electron UI**:
   ```bash
   cd web && yarn dev
   ```

3. **Connect vest** using the Device Selector panel

4. **Click any effect** in the Effects Library panel to trigger it

5. **Stop All** button halts any playing effect immediately

## Testing via curl

```bash
# List all effects
echo '{"cmd":"list_effects","req_id":"1"}' | nc localhost 5050

# Play an effect
echo '{"cmd":"play_effect","req_id":"2","effect_name":"machinegun_front"}' | nc localhost 5050

# Stop current effect
echo '{"cmd":"stop_effect","req_id":"3"}' | nc localhost 5050
```

## SDK Origins

These effects recreate the patterns from the original TN Games C/C++ SDK:

| SDK Function | Our Effect |
|--------------|------------|
| `E_MACHINEGUN_FRONT` | `machinegun_front` |
| `E_PISTOL_FRONT` | `pistol_front` |
| `E_BIG_BLAST_FRONT` | `big_blast_front` |
| `E_ACCELERATION` | `acceleration` |
| etc. | etc. |

See `misc-documentations/reverse-eng-doc/SUMMARY.md` for full SDK documentation.

