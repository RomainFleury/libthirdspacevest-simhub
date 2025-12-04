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
    zone: str  # front, back, left, right, all
    damage_type: str  # slash, stab, blunt, projectile, unknown
    intensity: int  # 0-100
    
    @property
    def datetime(self) -> datetime:
        """Convert timestamp to datetime."""
        return datetime.fromtimestamp(self.timestamp / 1000.0)
    
    def __str__(self) -> str:
        return (
            f"[{self.datetime.strftime('%H:%M:%S.%f')[:-3]}] "
            f"{self.event_type}: zone={self.zone}, type={self.damage_type}, "
            f"intensity={self.intensity}"
        )


# =============================================================================
# Log Parser
# =============================================================================

def parse_line(line: str) -> Optional[DamageEvent]:
    """
    Parse a single line from the log file.
    
    Format: timestamp|event_type|zone|damage_type|intensity
    Example: 1704067200000|DAMAGE|front|slash|45
    
    Returns DamageEvent if valid, None otherwise.
    """
    line = line.strip()
    if not line:
        return None
    
    parts = line.split('|')
    if len(parts) != 5:
        return None
    
    try:
        timestamp = int(parts[0])
        event_type = parts[1].upper()
        zone = parts[2].lower()
        damage_type = parts[3].lower()
        intensity = int(parts[4])
        
        # Validate event type
        if event_type not in ('DAMAGE', 'DEATH', 'BLOCK', 'PARRY'):
            return None
        
        # Validate zone
        if zone not in ('front', 'back', 'left', 'right', 'all', 'unknown'):
            return None
        
        # Validate intensity
        intensity = max(0, min(100, intensity))
        
        return DamageEvent(
            timestamp=timestamp,
            event_type=event_type,
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
        'back': '⬇️ ',
        'left': '⬅️ ',
        'right': '➡️ ',
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
    
    # Color code based on event type
    if event.event_type == 'DEATH':
        print(f"\n💀 {event.datetime.strftime('%H:%M:%S.%f')[:-3]} - PLAYER DEATH!")
        print(f"   {bar} Intensity: {event.intensity}%")
    else:
        print(f"\n{emoji} {event.datetime.strftime('%H:%M:%S.%f')[:-3]} - {event.event_type}")
        print(f"   Zone: {event.zone.upper():<8} Type: {event.damage_type:<12}")
        print(f"   {bar} Intensity: {event.intensity}%")


# =============================================================================
# Simulation Mode
# =============================================================================

def simulate_events(log_path: Path):
    """Generate fake events for testing without the game."""
    import random
    
    print("\n🎮 SIMULATION MODE")
    print("=" * 50)
    print(f"Writing fake events to: {log_path}")
    print("Press Ctrl+C to stop\n")
    
    # Create directory if needed
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    zones = ['front', 'back', 'left', 'right']
    damage_types = ['slash', 'stab', 'blunt', 'projectile']
    
    try:
        while True:
            # Random event
            timestamp = int(time.time() * 1000)
            event_type = random.choices(
                ['DAMAGE', 'DEATH'],
                weights=[0.9, 0.1]
            )[0]
            zone = random.choice(zones) if event_type == 'DAMAGE' else 'all'
            damage_type = random.choice(damage_types)
            intensity = random.randint(20, 100)
            
            # Write to log
            line = f"{timestamp}|{event_type}|{zone}|{damage_type}|{intensity}\n"
            with open(log_path, 'a') as f:
                f.write(line)
            
            print(f"Generated: {event_type} {zone} {damage_type} {intensity}")
            
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
