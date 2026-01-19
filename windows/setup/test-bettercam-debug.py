#!/usr/bin/env python3
"""Debug BetterCam capture issues"""
import bettercam
import sys
import os

print("=== BetterCam Debug Test ===")
print()

# Check session type
session = os.environ.get('SESSIONNAME', '')
print(f"SESSIONNAME: {session}")
if session.upper() in ['RDP-TCP', 'RDP']:
    print("[WARN] Running via Remote Desktop (RDP)")
    print("   BetterCam's Desktop Duplication API does NOT work over RDP")
    print("   You need to run this locally (not via RDP)")
    sys.exit(1)
else:
    print("[OK] Running in Console session (not RDP)")

print()
print("Testing BetterCam initialization...")

try:
    print("  Creating capture object...")
    cap = bettercam.create(output_idx=0, output_color='BGRA')
    if cap is None:
        print("  [ERROR] bettercam.create returned None")
        print()
        print("  Possible causes:")
        print("    - No GPU / graphics driver issues")
        print("    - Desktop Duplication API not available")
        print("    - Windows capture restrictions")
        sys.exit(1)
    print("  [OK] Capture object created")
    
    print("  Grabbing frame...")
    frame = cap.grab()
    if frame is None:
        print("  [ERROR] cap.grab() returned None")
        print()
        print("  Possible causes:")
        print("    - Desktop Duplication API initialization failed")
        print("    - Graphics driver issues")
        print("    - Windows capture restrictions")
        sys.exit(1)
    
    print(f"  [OK] Frame grabbed successfully!")
    print(f"    Shape: {frame.shape}")
    print(f"    Dtype: {frame.dtype}")
    
    # Test cropping
    print("  Testing crop...")
    cropped = frame[0:32, 0:32]
    print(f"  [OK] Crop successful: {cropped.shape}")
    
    print()
    print("=== SUCCESS: BetterCam is working! ===")
    sys.exit(0)
    
except Exception as e:
    print(f"  [ERROR] {e}")
    import traceback
    traceback.print_exc()
    print()
    print("Possible solutions:")
    print("  1. Make sure you're running locally (not via RDP)")
    print("  2. Update your graphics drivers")
    print("  3. Check Windows display settings")
    print("  4. Try running as administrator")
    sys.exit(1)

