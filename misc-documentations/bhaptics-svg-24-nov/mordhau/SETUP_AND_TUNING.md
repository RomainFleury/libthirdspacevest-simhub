# Mordhau Screen Capture Setup and Tuning Guide

This guide explains how to set up and tune the screen capture integration for Mordhau (Plan B approach).

## Overview

The screen capture integration detects the **red arch damage indicator** that appears around the crosshair when you take damage in Mordhau. The script captures the crosshair region, analyzes it for red pixels, and writes damage events to a log file that the daemon watches.

## Prerequisites

- Python 3.7 or higher
- Mordhau installed and playable
- Windows (the script is designed for Windows, but can be adapted for other platforms)

## Installation

### Step 1: Install Python Dependencies

Open a terminal/command prompt and install the required packages:

```bash
pip install mss pillow numpy pygetwindow
```

**Package descriptions:**
- `mss` - Fast screen capture library
- `pillow` - Image processing (PIL)
- `numpy` - Array operations for pixel analysis
- `pygetwindow` - Window detection and management

### Step 2: Locate the Script

The screen capture script is located at:
```
misc-documentations/bhaptics-svg-24-nov/mordhau/screen_capture_prototype.py
```

You can run it from this location, or copy it to a more convenient location.

## Basic Setup

### Step 1: Run the Script

```bash
python screen_capture_prototype.py
```

The script will:
1. Look for the Mordhau game window (title: "MORDHAU")
2. Start capturing the crosshair region
3. Detect red arch patterns
4. Write events to: `%LOCALAPPDATA%\Mordhau\haptic_events.log`

### Step 2: Launch Mordhau

1. Start Mordhau
2. Join a match or local game
3. The script should detect the game window automatically

### Step 3: Test Detection

1. Take damage in-game (get hit by an enemy)
2. Watch the console output - you should see messages like:
   ```
   [1704067200000] DAMAGE detected: intensity 75 (front)
   ```
3. Check the log file: `%LOCALAPPDATA%\Mordhau\haptic_events.log`

### Step 4: Start the Integration in UI

1. Open the Third Space Vest UI
2. Navigate to Games → Mordhau
3. Click "Start Integration"
4. The daemon will watch the log file and trigger haptic feedback

## Configuration

The script uses default configuration values, but you can create a config file to customize detection parameters.

### Config File Location

Create a JSON file at one of these locations:
- `%APPDATA%\Third Space Vest\mordhau-screen-capture-config.json`
- `%LOCALAPPDATA%\Third Space Vest\mordhau-screen-capture-config.json`

### Configuration Parameters

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

#### Parameter Descriptions

| Parameter | Default | Description |
|-----------|---------|-------------|
| **crosshair_region_size** | 200 | Size (in pixels) of the square region to capture around the crosshair. Larger = more area to analyze, but slower. |
| **red_threshold** | 150 | Minimum red value (0-255) to consider a pixel "red". Lower = more sensitive, may cause false positives. |
| **red_ratio** | 1.5 | Red must be this many times higher than green/blue. Higher = stricter red detection. |
| **cooldown** | 0.2 | Seconds between detections (prevents duplicate events from same hit). |
| **capture_fps** | 60 | How many times per second to capture the screen. Higher = more responsive, but uses more CPU. |
| **arch_radius_min** | 30 | Minimum distance (in pixels) from crosshair center for arch detection. |
| **arch_radius_max** | 100 | Maximum distance (in pixels) from crosshair center for arch detection. |

## Tuning Guide

### Problem: Too Many False Positives

**Symptoms:** Script detects damage when you're not actually taking damage.

**Solutions:**
1. **Increase `red_threshold`** - Make red detection stricter
   ```json
   { "red_threshold": 180 }
   ```

2. **Increase `red_ratio`** - Require red to be more dominant
   ```json
   { "red_ratio": 2.0 }
   ```

3. **Adjust arch radius** - Narrow the detection area
   ```json
   { "arch_radius_min": 40, "arch_radius_max": 80 }
   ```

4. **Increase `cooldown`** - Prevent rapid duplicate detections
   ```json
   { "cooldown": 0.3 }
   ```

### Problem: Missing Detections

**Symptoms:** Taking damage but script doesn't detect it.

**Solutions:**
1. **Decrease `red_threshold`** - Make red detection more sensitive
   ```json
   { "red_threshold": 120 }
   ```

2. **Decrease `red_ratio`** - Allow less dominant red
   ```json
   { "red_ratio": 1.2 }
   ```

3. **Increase `crosshair_region_size`** - Capture larger area
   ```json
   { "crosshair_region_size": 250 }
   ```

4. **Adjust arch radius** - Widen the detection area
   ```json
   { "arch_radius_min": 20, "arch_radius_max": 120 }
   ```

### Problem: Wrong Direction Detection

**Symptoms:** Damage direction (front/back/left/right) is incorrect.

**Note:** Direction detection depends on which quadrant of the crosshair has the most red pixels. If the red arch doesn't have clear directional properties, direction will be "unknown".

**Solutions:**
1. **Test in-game** - Take damage from different directions and observe the red arch
2. **Check arch pattern** - The arch may not be directional in Mordhau
3. **Accept "unknown"** - If arch isn't directional, all damage will use general haptic feedback

### Problem: Performance Issues

**Symptoms:** High CPU usage, game lag.

**Solutions:**
1. **Lower `capture_fps`** - Reduce capture rate
   ```json
   { "capture_fps": 30 }
   ```

2. **Decrease `crosshair_region_size`** - Capture smaller area
   ```json
   { "crosshair_region_size": 150 }
   ```

## Step-by-Step Tuning Process

### 1. Initial Test

1. Run the script with default settings
2. Play Mordhau and take damage
3. Observe console output and log file
4. Note any issues (false positives, missed detections)

### 2. Calibrate Red Detection

If you see false positives:
- Gradually increase `red_threshold` (try 160, 170, 180)
- Test after each change
- Stop when false positives are eliminated

If you miss detections:
- Gradually decrease `red_threshold` (try 140, 130, 120)
- Test after each change
- Stop when all damage is detected

### 3. Fine-tune Arch Detection

1. Take screenshots when damage occurs (or use the script's debug output)
2. Measure the distance from crosshair center to red arch
3. Adjust `arch_radius_min` and `arch_radius_max` to match actual arch size

### 4. Optimize Performance

1. Monitor CPU usage while script is running
2. If too high, reduce `capture_fps` to 30
3. If still high, reduce `crosshair_region_size`

## Advanced Configuration

### Multiple Config Files

You can create different config files for different scenarios:
- `mordhau-screen-capture-config-pvp.json` - Tuned for PvP (faster detection)
- `mordhau-screen-capture-config-horde.json` - Tuned for Horde mode (more sensitive)

Switch configs by renaming the file to `mordhau-screen-capture-config.json`.

### Debug Mode

To see more detailed output, you can modify the script to print:
- Captured pixel data
- Red pixel counts
- Arch detection details

Add debug prints in the `detect_red_arch()` function.

## Troubleshooting

### Script Can't Find Game Window

**Error:** `ERROR: Could not find game window!`

**Solutions:**
1. Make sure Mordhau is running
2. Check window title - it should be "MORDHAU" (all caps)
3. Try running script as administrator
4. Check if game is in fullscreen (may need windowed or borderless windowed mode)

### No Events in Log File

**Symptoms:** Script runs but log file is empty or no events written.

**Solutions:**
1. Verify script is detecting the game window (check console output)
2. Take damage in-game and watch console for detection messages
3. Check log file path: `%LOCALAPPDATA%\Mordhau\haptic_events.log`
4. Verify file permissions (script needs write access)

### Events Detected But No Haptic Feedback

**Symptoms:** Log file has events, but vest doesn't trigger.

**Solutions:**
1. Make sure daemon is running
2. Check integration is started in UI
3. Verify log file path matches what daemon is watching
4. Check daemon logs for errors

### Script Crashes or Freezes

**Solutions:**
1. Check Python version (3.7+ required)
2. Verify all dependencies are installed correctly
3. Try running with lower `capture_fps` (30 instead of 60)
4. Check for conflicting screen capture software

## Testing Checklist

- [ ] Dependencies installed (`pip install mss pillow numpy pygetwindow`)
- [ ] Script runs without errors
- [ ] Script detects Mordhau window
- [ ] Taking damage produces console output
- [ ] Log file is created and events are written
- [ ] Integration starts in UI
- [ ] Haptic feedback triggers on damage
- [ ] No false positives during normal gameplay
- [ ] Performance is acceptable (CPU usage reasonable)

## Example Configurations

### Conservative (Fewer False Positives)

```json
{
  "crosshair_region_size": 180,
  "red_threshold": 180,
  "red_ratio": 2.0,
  "cooldown": 0.3,
  "capture_fps": 45,
  "arch_radius_min": 40,
  "arch_radius_max": 90
}
```

### Sensitive (Catch All Damage)

```json
{
  "crosshair_region_size": 250,
  "red_threshold": 120,
  "red_ratio": 1.2,
  "cooldown": 0.15,
  "capture_fps": 60,
  "arch_radius_min": 20,
  "arch_radius_max": 120
}
```

### Performance-Optimized

```json
{
  "crosshair_region_size": 150,
  "red_threshold": 150,
  "red_ratio": 1.5,
  "cooldown": 0.2,
  "capture_fps": 30,
  "arch_radius_min": 30,
  "arch_radius_max": 100
}
```

## Tips and Best Practices

1. **Start with defaults** - The default configuration works for most setups
2. **Tune incrementally** - Change one parameter at a time and test
3. **Test in actual gameplay** - Training mode may have different visual effects
4. **Monitor performance** - Keep an eye on CPU usage
5. **Save working configs** - Keep backup copies of configs that work well
6. **Document your settings** - Note what works for your setup

## Next Steps

Once the screen capture is working:
1. Test with different damage types (slashes, stabs, arrows)
2. Verify directional detection (if applicable)
3. Calibrate haptic intensity mapping in the daemon
4. Fine-tune for your preferred gameplay style

## Support

If you encounter issues:
1. Check the console output for error messages
2. Review the log file for event patterns
3. Try resetting to default configuration
4. Check the main README.md for more information

## Related Files

- `screen_capture_prototype.py` - The main screen capture script
- `PLAN_B_README.md` - Overview of Plan B approach
- `README.md` - General Mordhau integration documentation


