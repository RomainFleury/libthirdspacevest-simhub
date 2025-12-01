"""
Screen Capture Prototype for Mordhau Haptic Integration (Plan B)

This script captures the crosshair region and detects the red arch damage indicator,
then writes events to a file for the Python daemon to process.

Requirements:
    pip install mss pillow numpy pygetwindow

Usage:
    python screen_capture_prototype.py
"""

import mss
import numpy as np
from PIL import Image
import time
import os
import json
from pathlib import Path

# Default configuration (used if config file not found)
DEFAULT_CONFIG = {
    "crosshair_region_size": 200,  # Size of region around crosshair (px)
    "red_threshold": 150,  # Minimum red value to consider
    "red_ratio": 1.5,  # Red must be this many times higher than green/blue
    "cooldown": 0.2,  # Seconds between detections
    "capture_fps": 60,  # Capture rate
    "arch_radius_min": 30,  # Minimum distance from center for arch (px)
    "arch_radius_max": 100,  # Maximum distance from center for arch (px)
}

def load_config():
    """Load configuration from file, or use defaults."""
    # Try to find config file in common Electron userData locations
    config_paths = []
    
    # Windows: %APPDATA%/Third Space Vest/mordhau-screen-capture-config.json
    if os.name == "nt":
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            config_paths.append(Path(appdata) / "Third Space Vest" / "mordhau-screen-capture-config.json")
        localappdata = os.environ.get("LOCALAPPDATA", "")
        if localappdata:
            config_paths.append(Path(localappdata) / "Third Space Vest" / "mordhau-screen-capture-config.json")
    
    # macOS: ~/Library/Application Support/Third Space Vest/mordhau-screen-capture-config.json
    elif os.name == "posix" and os.uname().sysname == "Darwin":
        home = os.path.expanduser("~")
        config_paths.append(Path(home) / "Library" / "Application Support" / "Third Space Vest" / "mordhau-screen-capture-config.json")
    
    # Linux: ~/.config/Third Space Vest/mordhau-screen-capture-config.json
    else:
        home = os.path.expanduser("~")
        config_paths.append(Path(home) / ".config" / "Third Space Vest" / "mordhau-screen-capture-config.json")
    
    # Try each path
    for config_path in config_paths:
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                    print(f"Loaded config from: {config_path}")
                    return {
                        "crosshair_region_size": config.get("crosshair_region_size", DEFAULT_CONFIG["crosshair_region_size"]),
                        "red_threshold": config.get("red_threshold", DEFAULT_CONFIG["red_threshold"]),
                        "red_ratio": config.get("red_ratio", DEFAULT_CONFIG["red_ratio"]),
                        "cooldown": config.get("cooldown", DEFAULT_CONFIG["cooldown"]),
                        "capture_fps": config.get("capture_fps", DEFAULT_CONFIG["capture_fps"]),
                        "arch_radius_min": config.get("arch_radius_min", DEFAULT_CONFIG["arch_radius_min"]),
                        "arch_radius_max": config.get("arch_radius_max", DEFAULT_CONFIG["arch_radius_max"]),
                    }
            except Exception as e:
                print(f"Warning: Failed to load config from {config_path}: {e}")
                continue
    
    # Use defaults if no config file found
    print("No config file found, using defaults")
    return DEFAULT_CONFIG.copy()

# Load configuration (will be reloaded periodically)
def get_config():
    """Get current config values."""
    config = load_config()
    return {
        "crosshair_region_size": config["crosshair_region_size"],
        "red_threshold": config["red_threshold"],
        "red_ratio": config["red_ratio"],
        "cooldown": config["cooldown"],
        "capture_fps": config["capture_fps"],
        "arch_radius_min": config["arch_radius_min"],
        "arch_radius_max": config["arch_radius_max"],
    }

LOG_FILE = Path(os.environ.get("LOCALAPPDATA", ".")) / "Mordhau" / "haptic_events.log"

# Create log directory if needed
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

def find_game_window():
    """Find Mordhau game window."""
    import pygetwindow as gw
    
    # Try exact title first
    windows = gw.getWindowsWithTitle("MORDHAU")
    if windows:
        return windows[0]
    
    # Try alternative titles
    for title in ["Mordhau", "MORDHAU", "mordhau"]:
        windows = gw.getWindowsWithTitle(title)
        if windows:
            return windows[0]
    
    return None

def capture_crosshair_region(window, region_size):
    """Capture region around crosshair (center of screen)."""
    with mss.mss() as sct:
        # Get window bounds
        left = window.left
        top = window.top
        width = window.width
        height = window.height
        
        # Calculate center of window
        center_x = left + width // 2
        center_y = top + height // 2
        
        # Calculate region around center
        half_size = region_size // 2
        
        region = {
            "top": center_y - half_size,
            "left": center_x - half_size,
            "width": region_size,
            "height": region_size
        }
        
        # Capture region
        img = sct.grab(region)
        return np.array(img), center_x, center_y

def detect_red_arch(pixels, red_threshold, red_ratio, arch_radius_min, arch_radius_max):
    """
    Detect red arch pattern around crosshair center.
    
    Returns:
        (intensity, direction) - Intensity 0-100, direction in degrees (0-360) or None
    """
    if pixels.size == 0:
        return 0, None
    
    # Convert to RGB if needed (mss returns BGRA)
    if pixels.shape[2] == 4:
        rgb = pixels[:, :, [2, 1, 0]]  # BGR to RGB
    else:
        rgb = pixels
    
    # Get center of captured region
    center_x = rgb.shape[1] // 2
    center_y = rgb.shape[0] // 2
    
    # Find red pixels in arch region (circular band around center)
    red_pixels = []
    red_intensities = []
    
    for y in range(rgb.shape[0]):
        for x in range(rgb.shape[1]):
            # Calculate distance from center
            dx = x - center_x
            dy = y - center_y
            distance = np.sqrt(dx*dx + dy*dy)
            
            # Check if pixel is in arch region
            if arch_radius_min <= distance <= arch_radius_max:
                r, g, b = rgb[y, x]
                
                # Check if pixel is red enough
                if r >= red_threshold and r >= g * red_ratio and r >= b * red_ratio:
                    red_pixels.append((x, y))
                    # Calculate intensity based on how red it is
                    intensity = min(100, int((r - max(g, b)) * 2))
                    red_intensities.append(intensity)
    
    if not red_pixels:
        return 0, None
    
    # Calculate average intensity
    avg_intensity = int(np.mean(red_intensities)) if red_intensities else 0
    
    # Try to detect direction (which quadrant has most red pixels)
    direction = None
    if len(red_pixels) > 10:  # Need enough pixels to determine direction
        quadrants = {
            "front": 0,  # Top (0-45, 315-360 degrees)
            "right": 0,  # Right (45-135 degrees)
            "back": 0,   # Bottom (135-225 degrees)
            "left": 0    # Left (225-315 degrees)
        }
        
        for x, y in red_pixels:
            dx = x - center_x
            dy = y - center_y
            angle = np.degrees(np.arctan2(dy, dx)) % 360
            
            if 315 <= angle or angle < 45:
                quadrants["front"] += 1
            elif 45 <= angle < 135:
                quadrants["right"] += 1
            elif 135 <= angle < 225:
                quadrants["back"] += 1
            else:  # 225 <= angle < 315
                quadrants["left"] += 1
        
        # Find quadrant with most red pixels
        max_quadrant = max(quadrants, key=quadrants.get)
        if quadrants[max_quadrant] > len(red_pixels) * 0.3:  # At least 30% of pixels
            direction = max_quadrant
    
    return avg_intensity, direction

def write_damage_event(intensity, direction=None):
    """Write damage event to log file."""
    timestamp = int(time.time() * 1000)  # Milliseconds
    direction_str = direction if direction else "unknown"
    event_line = f"{timestamp}|DAMAGE|{direction_str}|{intensity}\n"
    
    with open(LOG_FILE, "a") as f:
        f.write(event_line)
    
    direction_msg = f" ({direction})" if direction else ""
    print(f"[{timestamp}] DAMAGE detected: intensity {intensity}{direction_msg}")

def main():
    """Main loop - capture screen and detect damage."""
    print("Mordhau Haptic Integration - Screen Capture (Plan B)")
    print(f"Log file: {LOG_FILE}")
    print("Looking for game window...")
    
    # Find game window
    window = find_game_window()
    if not window:
        print("ERROR: Could not find game window!")
        print("Please make sure Mordhau is running.")
        return
    
    # Load initial config
    config = get_config()
    print(f"Found window: {window.title} ({window.width}x{window.height})")
    print(f"Initial Configuration:")
    print(f"  Crosshair Region Size: {config['crosshair_region_size']}px")
    print(f"  Red Threshold: {config['red_threshold']}")
    print(f"  Red Ratio: {config['red_ratio']}x")
    print(f"  Arch Radius: {config['arch_radius_min']}-{config['arch_radius_max']}px")
    print(f"  Cooldown: {config['cooldown']}s")
    print(f"  Capture FPS: {config['capture_fps']}")
    print("Monitoring for red arch damage indicator...")
    print("(Press Ctrl+C to stop)\n")
    
    last_detected = 0  # Track last detection time
    last_config_check = time.time()
    config_check_interval = 5.0  # Check for config updates every 5 seconds
    
    try:
        while True:
            # Periodically reload config (in case user changed settings in UI)
            now = time.time()
            if now - last_config_check > config_check_interval:
                config = get_config()
                last_config_check = now
            
            # Capture crosshair region
            pixels, center_x, center_y = capture_crosshair_region(
                window, 
                config["crosshair_region_size"]
            )
            
            # Detect red arch
            intensity, direction = detect_red_arch(
                pixels,
                config["red_threshold"],
                config["red_ratio"],
                config["arch_radius_min"],
                config["arch_radius_max"]
            )
            
            if intensity > 0:
                # Check cooldown
                if (now - last_detected) > config["cooldown"]:
                    write_damage_event(intensity, direction)
                    last_detected = now
            
            # Small delay to avoid excessive CPU usage
            time.sleep(1.0 / config["capture_fps"])
            
    except KeyboardInterrupt:
        print("\nStopped monitoring.")

if __name__ == "__main__":
    try:
        import pygetwindow
    except ImportError:
        print("ERROR: pygetwindow not installed.")
        print("Install with: pip install pygetwindow")
        exit(1)
    
    main()

