"""
Screen Capture Prototype for EA Battlefront 2 (2017) Haptic Integration

This script captures screen edges and detects the red damage indicator,
then writes events to a file for the Python daemon to process.

Requirements:
    pip install mss pillow numpy

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
    "edge_width": 20,
    "red_threshold": 150,
    "red_ratio": 1.5,
    "cooldown": 0.2,
    "capture_fps": 60,
}

def load_config():
    """Load configuration from file, or use defaults."""
    # Try to find config file in common Electron userData locations
    config_paths = []
    
    # Windows: %APPDATA%/Third Space Vest/bf2-screen-capture-config.json
    if os.name == "nt":
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            config_paths.append(Path(appdata) / "Third Space Vest" / "bf2-screen-capture-config.json")
        localappdata = os.environ.get("LOCALAPPDATA", "")
        if localappdata:
            config_paths.append(Path(localappdata) / "Third Space Vest" / "bf2-screen-capture-config.json")
    
    # macOS: ~/Library/Application Support/Third Space Vest/bf2-screen-capture-config.json
    elif os.name == "posix" and os.uname().sysname == "Darwin":
        home = os.path.expanduser("~")
        config_paths.append(Path(home) / "Library" / "Application Support" / "Third Space Vest" / "bf2-screen-capture-config.json")
    
    # Linux: ~/.config/Third Space Vest/bf2-screen-capture-config.json
    else:
        home = os.path.expanduser("~")
        config_paths.append(Path(home) / ".config" / "Third Space Vest" / "bf2-screen-capture-config.json")
    
    # Try each path
    for config_path in config_paths:
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                    print(f"Loaded config from: {config_path}")
                    return {
                        "edge_width": config.get("edge_width", DEFAULT_CONFIG["edge_width"]),
                        "red_threshold": config.get("red_threshold", DEFAULT_CONFIG["red_threshold"]),
                        "red_ratio": config.get("red_ratio", DEFAULT_CONFIG["red_ratio"]),
                        "cooldown": config.get("cooldown", DEFAULT_CONFIG["cooldown"]),
                        "capture_fps": config.get("capture_fps", DEFAULT_CONFIG["capture_fps"]),
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
        "edge_width": config["edge_width"],
        "red_threshold": config["red_threshold"],
        "red_ratio": config["red_ratio"],
        "cooldown": config["cooldown"],
        "capture_fps": config["capture_fps"],
    }

LOG_FILE = Path(os.environ.get("LOCALAPPDATA", ".")) / "EA_Battlefront2" / "haptic_events.log"

# Create log directory if needed
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

def find_game_window():
    """Find EA Battlefront 2 game window."""
    import pygetwindow as gw
    
    windows = gw.getWindowsWithTitle("STAR WARS")
    if windows:
        return windows[0]
    
    # Try alternative titles
    for title in ["Battlefront", "Battlefront II", "Star Wars"]:
        windows = gw.getWindowsWithTitle(title)
        if windows:
            return windows[0]
    
    return None

def capture_edge_regions(window, edge_width):
    """Capture edge regions of the game window."""
    with mss.mss() as sct:
        # Get window bounds
        left = window.left
        top = window.top
        width = window.width
        height = window.height
        
        # Define edge regions
        edges = {
            "left": {
                "top": top,
                "left": left,
                "width": edge_width,
                "height": height
            },
            "right": {
                "top": top,
                "left": left + width - edge_width,
                "width": edge_width,
                "height": height
            },
            "top": {
                "top": top,
                "left": left,
                "width": width,
                "height": edge_width
            },
            "bottom": {
                "top": top + height - edge_width,
                "left": left,
                "width": width,
                "height": edge_width
            }
        }
        
        # Capture each edge
        captured = {}
        for edge_name, region in edges.items():
            img = sct.grab(region)
            captured[edge_name] = np.array(img)
        
        return captured

def detect_red_tint(pixels, red_threshold, red_ratio):
    """Detect red tint in pixel array and return intensity."""
    if pixels.size == 0:
        return 0
    
    # Convert to RGB if needed (mss returns BGRA)
    if pixels.shape[2] == 4:
        rgb = pixels[:, :, [2, 1, 0]]  # BGR to RGB
    else:
        rgb = pixels
    
    # Calculate average RGB values
    avg_r = np.mean(rgb[:, :, 0])
    avg_g = np.mean(rgb[:, :, 1])
    avg_b = np.mean(rgb[:, :, 2])
    
    # Check if red is dominant
    if avg_r < red_threshold:
        return 0
    
    # Check if red is significantly higher than green/blue
    if avg_r < avg_g * red_ratio or avg_r < avg_b * red_ratio:
        return 0
    
    # Calculate intensity (0-100)
    # Base intensity on how much red exceeds green/blue
    intensity = min(100, int((avg_r - max(avg_g, avg_b)) * 2))
    
    return intensity

def write_damage_event(edge, intensity):
    """Write damage event to log file."""
    timestamp = int(time.time() * 1000)  # Milliseconds
    event_line = f"{timestamp}|DAMAGE|{edge}|{intensity}\n"
    
    with open(LOG_FILE, "a") as f:
        f.write(event_line)
    
    print(f"[{timestamp}] DAMAGE detected: {edge} edge, intensity {intensity}")

def main():
    """Main loop - capture screen and detect damage."""
    print("EA Battlefront 2 Haptic Integration - Screen Capture")
    print(f"Log file: {LOG_FILE}")
    print("Looking for game window...")
    
    # Find game window
    window = find_game_window()
    if not window:
        print("ERROR: Could not find game window!")
        print("Please make sure EA Battlefront 2 is running.")
        return
    
    # Load initial config
    config = get_config()
    print(f"Found window: {window.title} ({window.width}x{window.height})")
    print(f"Initial Configuration:")
    print(f"  Edge Width: {config['edge_width']}px")
    print(f"  Red Threshold: {config['red_threshold']}")
    print(f"  Red Ratio: {config['red_ratio']}x")
    print(f"  Cooldown: {config['cooldown']}s")
    print(f"  Capture FPS: {config['capture_fps']}")
    print("Monitoring for damage indicators...")
    print("(Press Ctrl+C to stop)\n")
    
    last_detected = {}  # Track last detection time per edge
    last_config_check = time.time()
    config_check_interval = 5.0  # Check for config updates every 5 seconds
    
    try:
        while True:
            # Periodically reload config (in case user changed settings in UI)
            now = time.time()
            if now - last_config_check > config_check_interval:
                config = get_config()
                last_config_check = now
            
            # Capture edge regions
            edges = capture_edge_regions(window, config["edge_width"])
            
            # Check each edge for red tint
            for edge_name, pixels in edges.items():
                intensity = detect_red_tint(pixels, config["red_threshold"], config["red_ratio"])
                
                if intensity > 0:
                    # Check cooldown
                    if edge_name not in last_detected or (now - last_detected[edge_name]) > config["cooldown"]:
                        write_damage_event(edge_name, intensity)
                        last_detected[edge_name] = now
            
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

