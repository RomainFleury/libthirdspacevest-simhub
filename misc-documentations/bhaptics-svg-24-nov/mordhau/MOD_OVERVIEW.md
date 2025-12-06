# Mordhau Haptic Integration - Complete Overview

This document provides a complete overview of all approaches for integrating Mordhau with the Third Space Vest.

## Available Approaches

We have **two complementary approaches** for detecting player damage in Mordhau:

### Approach 1: Blueprint Mod (ThirdSpaceHapticsMod) ⭐ RECOMMENDED

**Status:** Ready for implementation

A UE4 Blueprint mod that directly hooks into Mordhau's damage system.

**Advantages:**
- ✅ Direct access to damage events
- ✅ Accurate damage direction and type
- ✅ Works offline (no network required)
- ✅ Low CPU overhead
- ✅ Precise event timing

**Files:**
- `ThirdSpaceHapticsMod/` - Complete mod package
- `ThirdSpaceHapticsMod/BLUEPRINT_IMPLEMENTATION.md` - Step-by-step implementation guide
- `ThirdSpaceHapticsMod/test_log_parser.py` - Testing utility

**Log Format (v2 with angle):**
```
{timestamp}|{event_type}|{angle}|{zone}|{damage_type}|{intensity}
```

The angle (0-360°) enables precise 8-zone haptic mapping:
- `front`, `front-right`, `right`, `back-right`, `back`, `back-left`, `left`, `front-left`

### Approach 2: Screen Capture (Plan B)

**Status:** Working prototype

Uses screen capture to detect the red damage arch that appears around the crosshair.

**Advantages:**
- ✅ No game modification required
- ✅ Works with any game version
- ✅ Non-invasive

**Disadvantages:**
- ❌ Higher CPU overhead
- ❌ May have false positives
- ❌ Less accurate direction detection
- ❌ Cannot detect damage type

**Files:**
- `screen_capture_prototype.py` - Screen capture script
- `PLAN_B_README.md` - Setup and usage
- `SETUP_AND_TUNING.md` - Calibration guide

**Log Format:**
```
{timestamp}|DAMAGE|{direction}|{intensity}
```

## Quick Start

### Using the Blueprint Mod (Recommended)

1. **Build the mod** (requires MORDHAU Editor):
   - Follow `ThirdSpaceHapticsMod/BLUEPRINT_IMPLEMENTATION.md`
   - Package as `.pak` file

2. **Install the mod:**
   ```
   Copy to: Steam\steamapps\common\Mordhau\Mordhau\Content\CustomPaks\
   ```

3. **Start the daemon:**
   ```bash
   python -m modern_third_space.cli daemon start
   ```

4. **Start integration in UI:**
   - Open Third Space Vest UI
   - Games → Mordhau → Start Integration

### Using Screen Capture (Alternative)

1. **Install dependencies:**
   ```bash
   pip install mss pillow numpy pygetwindow
   ```

2. **Run screen capture:**
   ```bash
   python screen_capture_prototype.py
   ```

3. **Start daemon and integration** (same as above)

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MORDHAU GAME                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   ┌─────────────────────┐        ┌─────────────────────────────┐   │
│   │  Blueprint Mod       │        │  Screen (Red Damage Arch)   │   │
│   │  (ThirdSpaceHaptics) │        │                             │   │
│   └──────────┬──────────┘        └──────────────┬──────────────┘   │
│              │                                    │                   │
└──────────────┼────────────────────────────────────┼───────────────────┘
               │                                    │
               ▼                                    ▼
    ┌──────────────────┐               ┌──────────────────────┐
    │  haptic_events.log│               │  Screen Capture       │
    │  (Approach 1)     │               │  Script (Approach 2)  │
    └────────┬─────────┘               └──────────┬───────────┘
             │                                     │
             │        ┌──────────────────┐        │
             └───────►│  Python Daemon   │◄───────┘
                      │  (mordhau_manager.py)      │
                      └──────────┬───────┘
                                 │
                                 ▼
                      ┌──────────────────┐
                      │  Third Space     │
                      │  Vest Hardware   │
                      └──────────────────┘
```

## Log File Locations

| Approach | Log File Path |
|----------|---------------|
| Blueprint Mod | `%LOCALAPPDATA%\Mordhau\Saved\ThirdSpaceHaptics\haptic_events.log` |
| Screen Capture | `%LOCALAPPDATA%\Mordhau\haptic_events.log` |

## Event Types

### Blueprint Mod Events

| Event | Description | Zone | Damage Type |
|-------|-------------|------|-------------|
| DAMAGE | Player took damage | front/back/left/right | slash/stab/blunt/projectile |
| DEATH | Player died | all | death |
| BLOCK | Successful block (optional) | direction | - |
| PARRY | Perfect parry (optional) | direction | - |

### Screen Capture Events

| Event | Description | Zone |
|-------|-------------|------|
| DAMAGE | Red arch detected | front/back/left/right/unknown |

## Haptic Mapping

Both approaches use the same haptic mapping in the daemon. The Blueprint mod uses **angle-based mapping** for precise 8-zone feedback:

### Vest Cell Layout

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R
```

### 8-Zone Mapping (Angle-Based)

```python
# Angle → Vest cells (precise mapping)
def angle_to_cells(angle: float) -> List[int]:
    # Normalize to 0-360
    angle = angle % 360
    
    if 337.5 <= angle or angle < 22.5:   return [2, 3, 4, 5]  # front
    elif 22.5 <= angle < 67.5:           return [4, 5]        # front-right
    elif 67.5 <= angle < 112.5:          return [4, 5, 6, 7]  # right
    elif 112.5 <= angle < 157.5:         return [6, 7]        # back-right
    elif 157.5 <= angle < 202.5:         return [0, 1, 6, 7]  # back
    elif 202.5 <= angle < 247.5:         return [0, 1]        # back-left
    elif 247.5 <= angle < 292.5:         return [0, 1, 2, 3]  # left
    else:                                 return [2, 3]        # front-left
```

### Zone Summary

| Zone | Angle Range | Vest Cells |
|------|-------------|------------|
| front | 337.5° - 22.5° | 2, 3, 4, 5 |
| front-right | 22.5° - 67.5° | 4, 5 |
| right | 67.5° - 112.5° | 4, 5, 6, 7 |
| back-right | 112.5° - 157.5° | 6, 7 |
| back | 157.5° - 202.5° | 0, 1, 6, 7 |
| back-left | 202.5° - 247.5° | 0, 1 |
| left | 247.5° - 292.5° | 0, 1, 2, 3 |
| front-left | 292.5° - 337.5° | 2, 3 |

### Intensity → Haptic Speed

```python
def intensity_to_speed(intensity: int) -> int:
    if intensity >= 80: return 9
    if intensity >= 60: return 7
    if intensity >= 40: return 5
    if intensity >= 20: return 4
    return 3
```

## Testing

### Test Log Parser (No Game Required)

```bash
# Watch for real events
cd ThirdSpaceHapticsMod
python test_log_parser.py

# Generate fake events for testing
python test_log_parser.py --simulate
```

### Verify Integration

1. Start daemon
2. Start Mordhau integration in UI
3. Run test script with `--simulate`
4. Verify vest triggers on fake events

## Troubleshooting

### No Events Detected

**Blueprint Mod:**
- Verify `.pak` file is in `CustomPaks`
- Check Mordhau console for errors
- Verify Blueprints are correctly implemented

**Screen Capture:**
- Ensure Mordhau window is visible
- Adjust red detection thresholds
- Check `SETUP_AND_TUNING.md` for calibration

### Wrong Direction

- Blueprint mod requires valid damage causer
- Screen capture may not accurately detect direction
- Fall damage and environmental hazards show as "unknown"

### No Haptic Feedback

- Verify daemon is running
- Check integration is started in UI
- Verify vest is connected

## Development Roadmap

- [x] Screen capture prototype
- [x] Blueprint mod documentation
- [x] Log parser utility
- [x] Daemon integration (mordhau_manager.py)
- [x] UI integration page
- [ ] Package pre-built .pak file
- [ ] Add kill/block/parry events
- [ ] Damage type-specific haptic patterns

## Files Reference

```
mordhau/
├── README.md                     # Research and exploration notes
├── MOD_OVERVIEW.md              # This file - complete overview
├── PLAN_B_README.md             # Screen capture approach
├── SETUP_AND_TUNING.md          # Screen capture tuning guide
├── screen_capture_prototype.py  # Screen capture script
└── ThirdSpaceHapticsMod/        # Blueprint mod package
    ├── ThirdSpaceHaptics.uplugin
    ├── README.md
    ├── BLUEPRINT_IMPLEMENTATION.md
    ├── test_log_parser.py
    └── Resources/
        └── Icon128.png
```

## Related Code

- `modern-third-space/src/modern_third_space/server/mordhau_manager.py` - Daemon integration
- `web/src/pages/integrations/MordhauIntegrationPage.tsx` - UI page
- `web/electron/ipc/mordhauHandlers.cjs` - Electron IPC handlers
