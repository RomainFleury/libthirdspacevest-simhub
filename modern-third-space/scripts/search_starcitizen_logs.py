#!/usr/bin/env python3
"""
Search Star Citizen Game.log for events related to a specific player.

Searches for:
- Death events
- Damage events (ship hit, hull damage, shield damage)
- Health recovery/healing events
- Any events mentioning the player name
"""

import re
import sys
from pathlib import Path
from typing import List, Dict, Optional

# Common patterns to search for
PATTERNS = {
    "death": re.compile(r"<Actor Death>.*?CActor::Kill.*?'([^']+)'.*?killed by.*?'([^']+)'", re.IGNORECASE),
    "damage": re.compile(r"(?:damage|hit|hurt|injured).*?'([^']+)'", re.IGNORECASE),
    "shield": re.compile(r"(?:shield|shields).*?'([^']+)'", re.IGNORECASE),
    "hull": re.compile(r"(?:hull|armor).*?'([^']+)'", re.IGNORECASE),
    "health": re.compile(r"(?:health|heal|healing|recovery|medpen|medpen).*?'([^']+)'", re.IGNORECASE),
    "ship_hit": re.compile(r"(?:ship|vehicle|vessel).*?(?:hit|damage|impact).*?'([^']+)'", re.IGNORECASE),
    "player_mention": re.compile(r"'([^']+)'", re.IGNORECASE),
}

# More specific patterns based on Star Citizen log structure
SPECIFIC_PATTERNS = {
    "actor_death": re.compile(r"\[Notice\].*?<Actor Death>.*?CActor::Kill.*?'([^']+)'.*?killed by.*?'([^']+)'", re.IGNORECASE),
    "damage_received": re.compile(r"(?:Damage|Hit|Injury).*?'([^']+)'.*?(?:received|took|sustained)", re.IGNORECASE),
    "shield_damage": re.compile(r"(?:Shield|Shields).*?'([^']+)'.*?(?:damage|depleted|down|broken)", re.IGNORECASE),
    "hull_damage": re.compile(r"(?:Hull|Armor).*?'([^']+)'.*?(?:damage|breach|penetrated)", re.IGNORECASE),
    "health_change": re.compile(r"(?:Health|HP).*?'([^']+)'.*?(?:change|update|restore|heal)", re.IGNORECASE),
    "healing": re.compile(r"(?:Heal|Healing|Medpen|Recovery).*?'([^']+)'", re.IGNORECASE),
    "ship_impact": re.compile(r"(?:Ship|Vehicle).*?'([^']+)'.*?(?:hit|impact|collision|crash)", re.IGNORECASE),
}


def search_log_file(log_path: Path, player_name: str) -> Dict[str, List[str]]:
    """Search Game.log for events related to player_name."""
    results = {
        "deaths": [],
        "damage": [],
        "shield": [],
        "hull": [],
        "health": [],
        "healing": [],
        "ship_hits": [],
        "other_mentions": [],
    }
    
    if not log_path.exists():
        print(f"Error: Log file not found: {log_path}")
        return results
    
    print(f"Searching {log_path} for events related to '{player_name}'...")
    print(f"File size: {log_path.stat().st_size / 1024 / 1024:.2f} MB\n")
    
    player_lower = player_name.lower()
    line_count = 0
    matches = 0
    
    try:
        with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                line_count += 1
                line_lower = line.lower()
                
                # Check if line mentions player name
                if player_lower not in line_lower:
                    continue
                
                matches += 1
                
                # Categorize the event
                if "<Actor Death>" in line or "CActor::Kill" in line:
                    results["deaths"].append(f"Line {line_num}: {line.strip()[:200]}")
                elif any(keyword in line_lower for keyword in ["damage", "hit", "hurt", "injured"]):
                    if "shield" in line_lower:
                        results["shield"].append(f"Line {line_num}: {line.strip()[:200]}")
                    elif "hull" in line_lower or "armor" in line_lower:
                        results["hull"].append(f"Line {line_num}: {line.strip()[:200]}")
                    else:
                        results["damage"].append(f"Line {line_num}: {line.strip()[:200]}")
                elif any(keyword in line_lower for keyword in ["shield", "shields"]):
                    results["shield"].append(f"Line {line_num}: {line.strip()[:200]}")
                elif any(keyword in line_lower for keyword in ["hull", "armor"]):
                    results["hull"].append(f"Line {line_num}: {line.strip()[:200]}")
                elif any(keyword in line_lower for keyword in ["heal", "healing", "medpen", "recovery", "restore"]):
                    results["healing"].append(f"Line {line_num}: {line.strip()[:200]}")
                elif any(keyword in line_lower for keyword in ["health", "hp"]):
                    results["health"].append(f"Line {line_num}: {line.strip()[:200]}")
                elif any(keyword in line_lower for keyword in ["ship", "vehicle", "vessel"]):
                    if any(keyword in line_lower for keyword in ["hit", "impact", "collision", "crash"]):
                        results["ship_hits"].append(f"Line {line_num}: {line.strip()[:200]}")
                else:
                    results["other_mentions"].append(f"Line {line_num}: {line.strip()[:200]}")
    
    except Exception as e:
        print(f"Error reading log file: {e}")
        return results
    
    print(f"Processed {line_count:,} lines, found {matches} mentions of '{player_name}'\n")
    return results


def print_results(results: Dict[str, List[str]], player_name: str):
    """Print search results in a formatted way."""
    print("=" * 80)
    print(f"EVENTS RELATED TO '{player_name}'")
    print("=" * 80)
    print()
    
    categories = [
        ("deaths", "💀 Death Events"),
        ("damage", "💥 Damage Events"),
        ("shield", "🛡️ Shield Events"),
        ("hull", "🔧 Hull/Armor Events"),
        ("health", "❤️ Health Events"),
        ("healing", "💚 Healing/Recovery Events"),
        ("ship_hits", "🚀 Ship Hit/Impact Events"),
        ("other_mentions", "📝 Other Mentions"),
    ]
    
    for key, title in categories:
        events = results[key]
        if events:
            print(f"\n{title} ({len(events)} found):")
            print("-" * 80)
            for event in events[:20]:  # Show first 20 of each type
                print(event)
            if len(events) > 20:
                print(f"... and {len(events) - 20} more")
        else:
            print(f"\n{title}: None found")
    
    print("\n" + "=" * 80)


def main():
    if len(sys.argv) < 2:
        print("Usage: python search_starcitizen_logs.py <player_name> [log_file_path]")
        print("\nExample:")
        print("  python search_starcitizen_logs.py Maveck")
        print("  python search_starcitizen_logs.py Maveck \"C:/Program Files/Roberts Space Industries/StarCitizen/LIVE/Game.log\"")
        sys.exit(1)
    
    player_name = sys.argv[1]
    
    # Get log file path
    if len(sys.argv) >= 3:
        log_path = Path(sys.argv[2])
    else:
        # Try common locations
        common_paths = [
            Path("C:/Program Files/Roberts Space Industries/StarCitizen/LIVE/Game.log"),
            Path("C:/Program Files (x86)/Steam/steamapps/common/StarCitizen/Game.log"),
            Path("C:/Program Files/Steam/steamapps/common/StarCitizen/Game.log"),
        ]
        
        log_path = None
        for path in common_paths:
            if path.exists():
                log_path = path
                break
        
        if not log_path:
            print("Error: Could not find Game.log file.")
            print("Please provide the path to your Game.log file:")
            print("  python search_starcitizen_logs.py Maveck \"<path_to_Game.log>\"")
            sys.exit(1)
    
    results = search_log_file(log_path, player_name)
    print_results(results, player_name)


if __name__ == "__main__":
    main()

