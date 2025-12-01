# Plan B: Screen Capture + Existing Red Arch Detection

This is the implementation for **Plan B** - detecting the existing red arch damage indicator around the crosshair using screen capture.

## Overview

Mordhau displays a **red arch around the crosshair** when the player takes damage. This script captures the crosshair region and detects this red arch pattern, then writes events to a log file for the daemon to process.

**Advantages:**
- ✅ No game modification needed
- ✅ Works with any game version
- ✅ Fast to implement
- ✅ Non-invasive

**Challenges:**
- Need to calibrate red color thresholds
- May need to filter out other red UI elements
- Performance overhead from screen capture

## Setup

### 1. Install Dependencies

```bash
pip install mss pillow numpy pygetwindow
```

### 2. Run the Script

```bash
python screen_capture_prototype.py
```

The script will:
1. Find the Mordhau game window
2. Capture the crosshair region (center of screen)
3. Detect red arch pattern
4. Write events to: `%LOCALAPPDATA%\Mordhau\haptic_events.log`

## Configuration

The script uses default configuration, but you can create a config file at:
- Windows: `%APPDATA%\Third Space Vest\mordhau-screen-capture-config.json`
- Or: `%LOCALAPPDATA%\Third Space Vest\mordhau-screen-capture-config.json`

Example config:
```json
{
  "crosshair_region_size": 200,
  "red_threshold": 150,
  "red_ratio": 1.5,
  "cooldown": 0.2,
  "capture_fps": 60,
  "arch_radius_min": 30,
  "arch_radius_max": 100
}
```

### Configuration Parameters

- **crosshair_region_size**: Size of region to capture around crosshair (px)
- **red_threshold**: Minimum red value (0-255) to consider a pixel "red"
- **red_ratio**: Red must be this many times higher than green/blue
- **cooldown**: Seconds between detections (prevents duplicates)
- **capture_fps**: How many times per second to capture screen
- **arch_radius_min**: Minimum distance from center for arch (px)
- **arch_radius_max**: Maximum distance from center for arch (px)

## Testing

### Step 1: Analyze Red Arch

1. Launch Mordhau
2. Take damage from different directions
3. Observe the red arch:
   - Where does it appear? (around crosshair)
   - What color is it? (RGB values)
   - How big is it? (radius from center)
   - Is it directional? (different sides for different directions)
   - How long does it last?

### Step 2: Test Detection

1. Run the screen capture script
2. Play Mordhau and take damage
3. Check console output for detections
4. Check log file: `%LOCALAPPDATA%\Mordhau\haptic_events.log`

### Step 3: Calibrate Thresholds

If detection is unreliable:
- **Too many false positives**: Increase `red_threshold` or `red_ratio`
- **Missing detections**: Decrease `red_threshold` or `red_ratio`
- **Wrong arch size**: Adjust `arch_radius_min` and `arch_radius_max`

## Log File Format

Events are written as:
```
timestamp|DAMAGE|direction|intensity
```

Example:
```
1704067200000|DAMAGE|front|75
1704067200200|DAMAGE|right|50
```

- **timestamp**: Milliseconds since epoch
- **direction**: `front`, `back`, `left`, `right`, or `unknown`
- **intensity**: 0-100 (based on red intensity)

## Direction Detection

The script attempts to detect damage direction by analyzing which quadrant has the most red pixels:
- **Front**: Top (0-45°, 315-360°)
- **Right**: Right (45-135°)
- **Back**: Bottom (135-225°)
- **Left**: Left (225-315°)

If the arch doesn't have clear directional properties, direction will be `unknown`.

## Next Steps

1. **Test and calibrate** - Adjust thresholds until detection is reliable
2. **Add daemon integration** - Create file watcher in Python daemon
3. **Map to haptics** - Convert events to vest cell triggers
4. **Test end-to-end** - Verify full integration works

## Troubleshooting

### "Could not find game window"
- Make sure Mordhau is running
- Try running script as administrator
- Check window title matches "MORDHAU"

### No detections
- Check if red arch actually appears (take damage in game)
- Lower `red_threshold` or `red_ratio`
- Increase `crosshair_region_size`
- Check log file for any events

### Too many false positives
- Increase `red_threshold` or `red_ratio`
- Decrease `crosshair_region_size`
- Adjust `arch_radius_min` and `arch_radius_max`
- Check if other red UI elements are interfering

### Performance issues
- Lower `capture_fps` (e.g., 30 instead of 60)
- Decrease `crosshair_region_size`

## Files

- `screen_capture_prototype.py` - Main screen capture script
- `PLAN_B_README.md` - This file
- Log file: `%LOCALAPPDATA%\Mordhau\haptic_events.log`

