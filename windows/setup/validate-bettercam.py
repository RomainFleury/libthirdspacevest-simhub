#!/usr/bin/env python3
"""Validate BetterCam screen capture"""
import bettercam
import sys

try:
    cap = bettercam.create(output_idx=0, output_color='BGRA')
    if cap is None:
        print("ERROR: bettercam.create returned None", file=sys.stderr)
        sys.exit(1)
    
    frame = cap.grab()
    if frame is None:
        print("ERROR: cap.grab() returned None", file=sys.stderr)
        sys.exit(1)
    
    if not hasattr(frame, 'shape'):
        print("ERROR: frame has no shape attribute", file=sys.stderr)
        sys.exit(1)
    
    if len(frame.shape) != 3:
        print(f"ERROR: Expected 3D frame, got shape {frame.shape}", file=sys.stderr)
        sys.exit(1)
    
    # Test cropping (like the actual code does)
    cropped = frame[0:32, 0:32]
    if cropped.shape != (32, 32, 4):
        print(f"ERROR: Cropped shape mismatch: {cropped.shape}", file=sys.stderr)
        sys.exit(1)
    
    # Success
    sys.exit(0)
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)

