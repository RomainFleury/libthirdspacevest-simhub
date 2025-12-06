#!/usr/bin/env python3
"""
Third Space Haptics - Mordhau Log Parser & Tester

This script watches the haptic events log file and displays parsed events.
Use this to verify your Blueprint mod is working correctly.

Usage:
    python test_log_parser.py [--log-path PATH] [--simulate]

Requirements:
    No external dependencies - uses only Python standard library.
"""

import argparse
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Generator
from datetime import datetime


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class DamageEvent:
    """Parsed damage event from log file."""
    timestamp: int  # milliseconds
    event_type: str  # DAMAGE, DEATH, BLOCK, PARRY
    angle: float  # 0-360 degrees, -1 for unknown
    zone: str  # front, front-right, right, back-right, back, back-left, left, front-left, all
    damage_type: str  # slash, stab, blunt, projectile, unknown
    intensity: int  # 0-100
    
    @property
    def datetime(self) -> datetime:
        """Convert timestamp to datetime."""
        return datetime.fromtimestamp(self.timestamp / 1000.0)
    
    def __str__(self) -> str:
        angle_str = f"{self.angle:.1f}°" if self.angle >= 0 else "N/A"
        return (
            f"[{self.datetime.strftime('%H:%M:%S.%f')[:-3]}] "
            f"{self.event_type}: angle={angle_str} ({self.zone}), "
            f"type={self.damage_type}, intensity={self.intensity}"
        )


# =============================================================================
# Log Parser
# =============================================================================

def angle_to_zone(angle: float) -> str:
    """Convert angle to 8-zone direction."""
    if angle < 0:
        return "unknown"
    
    angle = angle % 360
    
    if 337.5 <= angle or angle < 22.5:
        return "front"
    elif 22.5 <= angle < 67.5:
        return "front-right"
    elif 67.5 <= angle < 112.5:
        return "right"
    elif 112.5 <= angle < 157.5:
        return "back-right"
    elif 157.5 <= angle < 202.5:
        return "back"
    elif 202.5 <= angle < 247.5:
        return "back-left"
    elif 247.5 <= angle < 292.5:
        return "left"
    else:
        return "front-left"


def parse_line(line: str) -> Optional[DamageEvent]:
    """
    Parse a single line from the log file.
    
    Supports multiple formats:
    - v1 (5 parts): timestamp|event_type|zone|damage_type|intensity
    - v2 (6 parts): timestamp|event_type|angle|zone|damage_type|intensity
    - Screen capture (4 parts): timestamp|DAMAGE|direction|intensity
    
    Returns DamageEvent if valid, None otherwise.
    """
    line = line.strip()
    if not line:
        return None
    
    parts = line.split('|')
    
    # Must have 4, 5, or 6 parts
    if len(parts) not in (4, 5, 6):
        return None
    
    try:
        timestamp = int(parts[0])
        event_type = parts[1].upper()
        
        # Validate event type
        if event_type not in ('DAMAGE', 'DEATH', 'BLOCK', 'PARRY'):
            return None
        
        # Parse based on format
        if len(parts) == 4:
            # Screen capture format: timestamp|DAMAGE|direction|intensity
            direction = parts[2].lower()
            intensity = int(parts[3])
            damage_type = "unknown"
            # Convert direction to approximate angle
            direction_angles = {
                'front': 0.0, 'right': 90.0, 'back': 180.0, 'left': 270.0,
                'all': -1.0, 'unknown': -1.0
            }
            angle = direction_angles.get(direction, -1.0)
            zone = direction if direction in ('front', 'back', 'left', 'right', 'all', 'unknown') else 'unknown'
        
        elif len(parts) == 5:
            # v1 format: timestamp|event_type|zone|damage_type|intensity
            zone = parts[2].lower()
            damage_type = parts[3].lower()
            intensity = int(parts[4])
            # Convert zone to approximate angle
            zone_angles = {
                'front': 0.0, 'front-right': 45.0, 'right': 90.0, 'back-right': 135.0,
                'back': 180.0, 'back-left': 225.0, 'left': 270.0, 'front-left': 315.0,
                'all': -1.0, 'unknown': -1.0
            }
            angle = zone_angles.get(zone, -1.0)
        
        else:  # 6 parts
            # v2 format: timestamp|event_type|angle|zone|damage_type|intensity
            angle = float(parts[2])
            zone = parts[3].lower()
            damage_type = parts[4].lower()
            intensity = int(parts[5])
            # Derive zone from angle if zone is empty/unknown
            if zone in ('', 'unknown') and angle >= 0:
                zone = angle_to_zone(angle)
        
        # Validate intensity
        intensity = max(0, min(100, intensity))
        
        return DamageEvent(
            timestamp=timestamp,
            event_type=event_type,
            angle=angle,
            zone=zone,
            damage_type=damage_type,
            intensity=intensity
        )
    except (ValueError, IndexError):
        return None


def tail_file(filepath: Path, poll_interval: float = 0.1) -> Generator[str, None, None]:
    """
    Tail a file, yielding new lines as they appear.
    
    Similar to `tail -f` but with proper handling of file recreation.
    """
    # Start from end of file if it exists
    last_position = 0
    if filepath.exists():
        last_position = filepath.stat().st_size
    
    while True:
        try:
            if not filepath.exists():
                last_position = 0
                time.sleep(poll_interval)
                continue
            
            current_size = filepath.stat().st_size
            
            # Handle file truncation (recreated file)
            if current_size < last_position:
                last_position = 0
            
            if current_size > last_position:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    f.seek(last_position)
                    new_content = f.read()
                    last_position = f.tell()
                
                for line in new_content.splitlines():
                    yield line
        
        except IOError:
            pass  # File may be locked
        
        time.sleep(poll_interval)


# =============================================================================
# Event Display
# =============================================================================

def get_zone_emoji(zone: str) -> str:
    """Get emoji indicator for damage zone."""
    return {
        'front': '⬆️ ',
        'front-right': '↗️ ',
        'right': '➡️ ',
        'back-right': '↘️ ',
        'back': '⬇️ ',
        'back-left': '↙️ ',
        'left': '⬅️ ',
        'front-left': '↖️ ',
        'all': '🔥',
        'unknown': '❓',
    }.get(zone, '❓')


def get_intensity_bar(intensity: int) -> str:
    """Create visual intensity bar."""
    filled = intensity // 10
    empty = 10 - filled
    return f"[{'█' * filled}{'░' * empty}]"


def display_event(event: DamageEvent):
    """Display a damage event in a formatted way."""
    emoji = get_zone_emoji(event.zone)
    bar = get_intensity_bar(event.intensity)
    
    # Format angle
    angle_str = f"{event.angle:6.1f}°" if event.angle >= 0 else "   N/A"
    
    # Color code based on event type
    if event.event_type == 'DEATH':
        print(f"\n💀 {event.datetime.strftime('%H:%M:%S.%f')[:-3]} - PLAYER DEATH!")
        print(f"   {bar} Intensity: {event.intensity}%")
    else:
        print(f"\n{emoji} {event.datetime.strftime('%H:%M:%S.%f')[:-3]} - {event.event_type}")
        print(f"   Angle: {angle_str}  Zone: {event.zone:<12} Type: {event.damage_type:<12}")
        print(f"   {bar} Intensity: {event.intensity}%")


# =============================================================================
# Simulation Mode
# =============================================================================

def simulate_events(log_path: Path):
    """Generate fake events for testing without the game."""
    import random
    
    print("\n🎮 SIMULATION MODE (v2 with angles)")
    print("=" * 50)
    print(f"Writing fake events to: {log_path}")
    print("Press Ctrl+C to stop\n")
    
    # Create directory if needed
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    damage_types = ['slash', 'stab', 'blunt', 'projectile']
    
    try:
        while True:
            # Random event
            timestamp = int(time.time() * 1000)
            event_type = random.choices(
                ['DAMAGE', 'DEATH'],
                weights=[0.9, 0.1]
            )[0]
            
            if event_type == 'DAMAGE':
                # Random angle 0-360
                angle = random.uniform(0, 360)
                zone = angle_to_zone(angle)
            else:
                # Death event
                angle = -1
                zone = 'all'
            
            damage_type = random.choice(damage_types) if event_type == 'DAMAGE' else 'death'
            intensity = random.randint(20, 100)
            
            # Write to log (v2 format with angle)
            line = f"{timestamp}|{event_type}|{angle:.1f}|{zone}|{damage_type}|{intensity}\n"
            with open(log_path, 'a') as f:
                f.write(line)
            
            angle_str = f"{angle:.1f}°" if angle >= 0 else "N/A"
            print(f"Generated: {event_type} angle={angle_str} ({zone}) {damage_type} {intensity}")
            
            # Random delay between events
            delay = random.uniform(1.0, 5.0)
            time.sleep(delay)
    
    except KeyboardInterrupt:
        print("\n\nSimulation stopped.")


# =============================================================================
# Main
# =============================================================================

def get_default_log_path() -> Path:
    """Get the default log file path based on OS."""
    if os.name == 'nt':  # Windows
        localappdata = os.environ.get('LOCALAPPDATA', '')
        if localappdata:
            return Path(localappdata) / 'Mordhau' / 'Saved' / 'ThirdSpaceHaptics' / 'haptic_events.log'
    
    # Fallback for other platforms
    home = Path.home()
    return home / '.local' / 'share' / 'Mordhau' / 'Saved' / 'ThirdSpaceHaptics' / 'haptic_events.log'


def main():
    parser = argparse.ArgumentParser(
        description='Third Space Haptics - Mordhau Log Parser & Tester'
    )
    parser.add_argument(
        '--log-path', '-l',
        type=str,
        default=None,
        help='Path to the haptic events log file'
    )
    parser.add_argument(
        '--simulate', '-s',
        action='store_true',
        help='Simulate fake events for testing (writes to log file)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show raw log lines'
    )
    
    args = parser.parse_args()
    
    # Determine log path
    if args.log_path:
        log_path = Path(args.log_path)
    else:
        log_path = get_default_log_path()
    
    print("=" * 60)
    print("Third Space Haptics - Mordhau Log Parser")
    print("=" * 60)
    print(f"\nLog file: {log_path}")
    
    # Simulation mode
    if args.simulate:
        simulate_events(log_path)
        return
    
    # Watch mode
    print("\n🔍 Watching for damage events...")
    print("(Press Ctrl+C to stop)")
    print("-" * 60)
    
    if not log_path.exists():
        print(f"\n⚠️  Log file not found: {log_path}")
        print("The file will be created when the mod starts writing events.")
        print("Make sure:")
        print("  1. Mordhau is running")
        print("  2. The ThirdSpaceHaptics mod is installed")
        print("  3. You're taking damage in-game")
        print("\nWaiting for file to appear...")
    
    event_count = 0
    try:
        for line in tail_file(log_path):
            if args.verbose:
                print(f"RAW: {line}")
            
            event = parse_line(line)
            if event:
                event_count += 1
                display_event(event)
    
    except KeyboardInterrupt:
        print(f"\n\nStopped. Total events received: {event_count}")


if __name__ == '__main__':
    main()
