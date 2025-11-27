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
from pathlib import Path

# Configuration
EDGE_WIDTH = 20  # Pixels to capture from each edge
RED_THRESHOLD = 150  # Minimum red value (0-255)
RED_RATIO = 1.5  # Red must be this much higher than green/blue
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

def capture_edge_regions(window):
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
                "width": EDGE_WIDTH,
                "height": height
            },
            "right": {
                "top": top,
                "left": left + width - EDGE_WIDTH,
                "width": EDGE_WIDTH,
                "height": height
            },
            "top": {
                "top": top,
                "left": left,
                "width": width,
                "height": EDGE_WIDTH
            },
            "bottom": {
                "top": top + height - EDGE_WIDTH,
                "left": left,
                "width": width,
                "height": EDGE_WIDTH
            }
        }
        
        # Capture each edge
        captured = {}
        for edge_name, region in edges.items():
            img = sct.grab(region)
            captured[edge_name] = np.array(img)
        
        return captured

def detect_red_tint(pixels):
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
    if avg_r < RED_THRESHOLD:
        return 0
    
    # Check if red is significantly higher than green/blue
    if avg_r < avg_g * RED_RATIO or avg_r < avg_b * RED_RATIO:
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
    
    print(f"Found window: {window.title} ({window.width}x{window.height})")
    print("Monitoring for damage indicators...")
    print("(Press Ctrl+C to stop)\n")
    
    last_detected = {}  # Track last detection time per edge
    cooldown = 0.2  # Seconds between detections (prevent spam)
    
    try:
        while True:
            # Capture edge regions
            edges = capture_edge_regions(window)
            
            # Check each edge for red tint
            for edge_name, pixels in edges.items():
                intensity = detect_red_tint(pixels)
                
                if intensity > 0:
                    # Check cooldown
                    now = time.time()
                    if edge_name not in last_detected or (now - last_detected[edge_name]) > cooldown:
                        write_damage_event(edge_name, intensity)
                        last_detected[edge_name] = now
            
            # Small delay to avoid excessive CPU usage
            time.sleep(1/60)  # ~60 FPS
            
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

