# Kingdom Come: Deliverance Integration

## Status: 🟡 IMPLEMENTATION READY

> **Last Updated:** December 2024
>
> **Target Games:** Kingdom Come: Deliverance 1 & 2
>
> **Engine:** CryEngine (modified fork)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decision](#architecture-decision)
3. [Lua Scripting Capabilities](#lua-scripting-capabilities)
4. [Implementation Plan](#implementation-plan)
5. [Task Breakdown for Junior Developers](#task-breakdown-for-junior-developers)
6. [Appendix: Technical Reference](#appendix-technical-reference)

---

## Overview

Kingdom Come: Deliverance (KCD) is a realistic medieval RPG developed by Warhorse Studios using CryEngine. The game features:

- **Realistic combat system** - Melee, archery, mounted combat
- **Health and stamina system** - Damage affects gameplay
- **Status effects** - Bleeding, injuries, exhaustion
- **First-person perspective** - Directional damage feedback ideal for haptics
- **Body part targeting** - Combat can target specific body areas

### Why KCD is Great for Haptic Feedback

| Feature | Haptic Potential |
|---------|-----------------|
| Melee combat hits | Directional impact feedback |
| Arrow hits | Sharp, sudden feedback |
| Health changes | Heartbeat effects at low health |
| Blocking/parrying | Impact resistance feedback |
| Status effects | Sustained/pulsing patterns |
| Weapon recoil | Attack feedback |

---

## Architecture Decision

### ⭐ Recommended Approach: Lua Script + Log File Watching

After extensive research, we recommend the **same pattern used for Half-Life: Alyx**:

1. **Create a Lua script** that hooks into game events
2. **Write events to console/log file** using `System.LogAlways()`
3. **Python file watcher** monitors the log file
4. **Event parser** extracts damage/health/combat data
5. **Haptic mapper** converts events to vest commands
6. **Daemon integration** sends commands via TCP

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kingdom Come: Deliverance                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Lua Script (thirdspace_haptics.lua)                       │ │
│  │  - Polls player health/stats every frame                   │ │
│  │  - Detects changes (damage, healing, death)                │ │
│  │  - Writes [ThirdSpace] {...} lines to console              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ writes [ThirdSpace] {...}
┌─────────────────────────────────────────────────────────────────┐
│  Game Log File (log.log or console.log)                         │
│  Location: KCD/KingdomComeDeliverance.log or similar            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ tails/watches file
┌─────────────────────────────────────────────────────────────────┐
│       Python Integration (server/kcd_manager.py)                │
│  • File watcher (polling or watchdog)                           │
│  • Line parser for [ThirdSpace] {EventType|params} format       │
│  • Event-to-haptic mapper                                       │
│  • Broadcasts events to daemon clients                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ TCP commands
┌─────────────────────────────────────────────────────────────────┐
│                    Vest Daemon (port 5050)                       │
│                    └── Third Space Vest Hardware                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Approach?

| Advantage | Description |
|-----------|-------------|
| **Proven pattern** | Same as HL:Alyx integration which works well |
| **No DLL injection** | Pure Lua, no risk of anti-cheat issues |
| **Hot-reloadable** | Lua scripts can be reloaded without restarting game |
| **Cross-version** | Works with KCD 1 and KCD 2 |
| **Easy debugging** | Log output visible in game console |
| **Minimal game impact** | Lightweight polling script |

### Alternative Approaches Considered

| Approach | Feasibility | Reason Not Chosen |
|----------|-------------|-------------------|
| **Telemetry data** | LOW | Telemetry is performance-focused (FPS, memory), not gameplay events |
| **DLL injection** | MEDIUM | More complex, requires C++, potential anti-cheat issues |
| **Memory reading** | LOW | Breaks with updates, may trigger anti-cheat |
| **Screen capture** | LOW | Too slow, inaccurate, high CPU usage |

---

## Lua Scripting Capabilities

### CryEngine Lua API Available in KCD

Based on research of KCD2's Lua state dump and official CryEngine documentation:

#### Core Functions for Our Integration

```lua
-- Logging (ESSENTIAL for our approach)
System.LogAlways("message")        -- Write to log file
System.ClearConsole()              -- Clear console

-- Player Access
player = System.GetEntityByName("dude")   -- Get player entity
player:GetWorldPos()                       -- Get position {x, y, z}
player.health                              -- Player health value

-- Game Frame Hook
function OnUpdate(frameTime)
    -- Called every frame - use for polling
end

-- Event Listeners
UIAction.RegisterActionListener(object, "", "", "callback")

-- Script Management  
Script.ReloadScript(filename)      -- Hot-reload scripts
Script.UnloadScript(filename)      -- Unload before reload
```

#### Entity Events Available

```lua
-- These are entity methods that get called by the engine:
Entity.OnHit(hit)          -- Called when entity is hit
Entity.Event_Hit()         -- Hit event handler
Entity.Event_ResetHealth() -- Health reset event
```

#### Accessing Player Stats (KCD-Specific)

```lua
-- The player entity ("dude") has these accessible:
player.soul                -- Soul/RPG stats
player.actor              -- Actor component
player:GetHealth()        -- Current health
player:GetMaxHealth()     -- Maximum health
player:GetStamina()       -- Current stamina (if available)
```

### Script Execution Methods

1. **Console Command**: `#System.LogAlways("test")` (prefix with #)
2. **Dev Mode**: Launch with `-devmode` flag
3. **Mod Pak File**: Package as `.pak` and place in Mods folder
4. **Startup Script**: Add to Scripts/Startup/ for auto-execution

### Log File Locations

| Game | Platform | Typical Log Location |
|------|----------|---------------------|
| KCD 1 | Windows | `%USERPROFILE%\Saved Games\kingdomcome\` |
| KCD 1 | Windows | `Steam/steamapps/common/KingdomComeDeliverance/` |
| KCD 2 | Windows | `%APPDATA%\Local\KingdomComeDeliverance2\` |
| KCD 2 | Windows | Game install directory |

The exact log file name varies (e.g., `game.log`, `console.log`, `KingdomCome.log`).

---

## Implementation Plan

### Phase Overview

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| **Phase 1** | Lua script development | 2-3 days | None |
| **Phase 2** | Python log watcher | 1-2 days | Phase 1 |
| **Phase 3** | Event parser | 1 day | Phase 2 |
| **Phase 4** | Haptic mapper | 1-2 days | Phase 3 |
| **Phase 5** | Daemon integration | 1 day | Phase 4 |
| **Phase 6** | UI integration | 1-2 days | Phase 5 |
| **Phase 7** | Testing & polish | 2-3 days | All |

**Total Estimated Effort: 9-14 days**

---

## Task Breakdown for Junior Developers

### 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] Kingdom Come: Deliverance installed (KCD 1 or KCD 2)
- [ ] Python 3.9+ with the project set up
- [ ] Daemon running (`python3 -m modern_third_space.cli daemon start`)
- [ ] Familiarity with `server/alyx_manager.py` (reference implementation)
- [ ] Read `docs-external-integrations-ideas/ALYX_INTEGRATION.md`

---

### 🔷 PHASE 1: Lua Script Development

**Goal:** Create a Lua script that logs game events to the console.

#### Task 1.1: Set Up Development Environment

**What you'll do:** Enable developer mode in KCD to test Lua scripts.

**Step-by-step:**

1. Create a shortcut to KingdomCome.exe
2. Add `-devmode` to the shortcut target
3. Launch the game with this shortcut
4. Press `~` or `^` to open the console
5. Test with: `#System.LogAlways("Hello World!")`
6. You should see "Hello World!" in the console

**Verification:** Console shows your test message.

**Files to create:** None (just setup)

---

#### Task 1.2: Create Basic Script Structure

**What you'll do:** Create the main Lua script file with proper structure.

**Step-by-step:**

1. Navigate to your KCD installation folder
2. Create folder: `Mods/ThirdSpaceHaptics/`
3. Create file: `Mods/ThirdSpaceHaptics/Scripts/thirdspace_haptics.lua`

**Code to write:**

```lua
-- thirdspace_haptics.lua
-- Third Space Vest Integration for Kingdom Come: Deliverance
-- Logs game events for haptic feedback

ThirdSpace = {
    -- Configuration
    LOG_PREFIX = "[ThirdSpace]",
    POLL_INTERVAL = 0.1,  -- Poll every 100ms
    
    -- State tracking
    lastHealth = -1,
    lastStamina = -1,
    isInitialized = false,
    lastPollTime = 0,
    
    -- Player reference
    player = nil,
}

-- Log an event in our custom format
function ThirdSpace:LogEvent(eventType, params)
    local message = self.LOG_PREFIX .. " {" .. eventType
    if params then
        for key, value in pairs(params) do
            message = message .. "|" .. key .. "=" .. tostring(value)
        end
    end
    message = message .. "}"
    System.LogAlways(message)
end

-- Initialize the integration
function ThirdSpace:Init()
    if self.isInitialized then
        return
    end
    
    self:LogEvent("Init", {version = "1.0.0"})
    self.isInitialized = true
    
    -- Try to get player reference
    self.player = System.GetEntityByName("dude")
    if self.player then
        self.lastHealth = self:GetPlayerHealth()
        self:LogEvent("PlayerFound", {health = self.lastHealth})
    else
        self:LogEvent("Warning", {msg = "Player not found"})
    end
end

-- Get current player health (implement based on KCD version)
function ThirdSpace:GetPlayerHealth()
    if not self.player then
        return -1
    end
    
    -- Try different methods to get health
    if self.player.GetHealth then
        return self.player:GetHealth()
    elseif self.player.actor and self.player.actor.health then
        return self.player.actor.health
    elseif self.player.health then
        return self.player.health
    end
    
    return -1
end

-- Main update function - called every frame
function ThirdSpace:OnUpdate(frameTime)
    -- Initialize if not done
    if not self.isInitialized then
        self:Init()
        return
    end
    
    -- Throttle polling
    self.lastPollTime = self.lastPollTime + frameTime
    if self.lastPollTime < self.POLL_INTERVAL then
        return
    end
    self.lastPollTime = 0
    
    -- Check for player if we don't have reference
    if not self.player then
        self.player = System.GetEntityByName("dude")
        if self.player then
            self.lastHealth = self:GetPlayerHealth()
            self:LogEvent("PlayerFound", {health = self.lastHealth})
        end
        return
    end
    
    -- Poll health changes
    self:CheckHealth()
end

-- Check for health changes
function ThirdSpace:CheckHealth()
    local currentHealth = self:GetPlayerHealth()
    
    if currentHealth < 0 then
        return  -- Couldn't get health
    end
    
    if self.lastHealth < 0 then
        self.lastHealth = currentHealth
        return
    end
    
    local healthDiff = currentHealth - self.lastHealth
    
    if healthDiff < 0 then
        -- Player took damage
        self:LogEvent("PlayerDamage", {
            damage = math.abs(healthDiff),
            health = currentHealth,
            previous = self.lastHealth
        })
        
        -- Check for death
        if currentHealth <= 0 then
            self:LogEvent("PlayerDeath", {
                lastHealth = self.lastHealth
            })
        -- Check for critical health
        elseif currentHealth < 20 then
            self:LogEvent("CriticalHealth", {
                health = currentHealth
            })
        end
        
    elseif healthDiff > 0 then
        -- Player healed
        self:LogEvent("PlayerHeal", {
            amount = healthDiff,
            health = currentHealth
        })
    end
    
    self.lastHealth = currentHealth
end

-- Register the update callback
-- This approach may vary between KCD versions
if Script and Script.SetTimer then
    Script.SetTimer(100, function()
        ThirdSpace:OnUpdate(0.1)
    end)
elseif Game and Game.RegisterUpdateCallback then
    Game.RegisterUpdateCallback(function(dt)
        ThirdSpace:OnUpdate(dt)
    end)
else
    -- Fallback: register as a console command for manual testing
    System.AddCCommand("ts_update", "ThirdSpace:OnUpdate(0.1)", "Manual ThirdSpace update")
    System.AddCCommand("ts_init", "ThirdSpace:Init()", "Initialize ThirdSpace")
    System.AddCCommand("ts_status", "ThirdSpace:LogEvent('Status', {health=ThirdSpace:GetPlayerHealth()})", "Log current status")
end

-- Auto-initialize when script loads
ThirdSpace:Init()

System.LogAlways("[ThirdSpace] Script loaded. Use console commands ts_init, ts_update, ts_status for testing.")
```

**Verification:**
1. Start KCD with `-devmode`
2. In console: `#Script.ReloadScript("Scripts/thirdspace_haptics.lua")`
3. You should see "[ThirdSpace] Script loaded..."
4. Test with: `#ts_status`

---

#### Task 1.3: Package Script as Mod

**What you'll do:** Create a proper mod package (.pak file).

**Step-by-step:**

1. Create folder structure:
   ```
   ThirdSpaceHaptics/
   └── Scripts/
       └── Startup/
           └── thirdspace_haptics.lua
   ```

2. Zip the `ThirdSpaceHaptics` folder contents
3. Rename `.zip` to `.pak`
4. Place `ThirdSpaceHaptics.pak` in:
   - KCD 1: `Mods/` folder
   - KCD 2: `Mods/` folder

**Verification:** Script auto-loads when game starts.

---

#### Task 1.4: Research and Implement Combat Events (RESEARCH TASK)

**What you'll do:** Investigate KCD's combat system to detect attacks and blocks.

**Research steps:**

1. Use console to dump player entity:
   ```
   #dump(System.GetEntityByName("dude"))
   ```

2. Look for:
   - Combat state variables
   - Weapon swing events
   - Block/parry state
   - Hit direction information

3. Document findings in comments in the script

**Expected output format for combat events:**

```
[ThirdSpace] {Attack|weapon=sword|type=slash}
[ThirdSpace] {Block|success=true|direction=left}
[ThirdSpace] {Hit|damage=15|direction=front|bodyPart=torso}
```

---

### 🔷 PHASE 2: Python Log Watcher

**Goal:** Create a Python module that watches the game's log file.

#### Task 2.1: Create KCD Manager Module

**What you'll do:** Create the main Python module following the Alyx pattern.

**File to create:** `modern-third-space/src/modern_third_space/server/kcd_manager.py`

**Step-by-step:**

1. Copy the structure from `alyx_manager.py`
2. Modify for KCD-specific log format
3. Update default log paths for KCD

**Code template:**

```python
"""
Kingdom Come: Deliverance Integration Manager for the vest daemon.

This module provides log file watching to receive game events from
Kingdom Come: Deliverance. The game events are emitted via a Lua script
(thirdspace_haptics.lua) that writes to the game log.

Pattern: [ThirdSpace] {EventType|param1=value1|param2=value2}
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from threading import Thread
from typing import Callable, Optional, List, Dict

from ..vest.cell_layout import (
    Cell,
    FRONT_CELLS,
    BACK_CELLS,
    ALL_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
    UPPER_CELLS,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Parser
# =============================================================================

@dataclass
class KCDEvent:
    """Parsed event from KCD log."""
    type: str
    raw: str
    params: Dict[str, str]
    timestamp: float = 0.0
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()
    
    def get_int(self, key: str, default: int = 0) -> int:
        """Get parameter as integer."""
        try:
            return int(self.params.get(key, default))
        except (ValueError, TypeError):
            return default
    
    def get_float(self, key: str, default: float = 0.0) -> float:
        """Get parameter as float."""
        try:
            return float(self.params.get(key, default))
        except (ValueError, TypeError):
            return default


# Event format: [ThirdSpace] {EventType|param1=value1|param2=value2}
THIRDSPACE_PATTERN = re.compile(r'\[ThirdSpace\]\s*\{([^}]+)\}')


def parse_thirdspace_line(line: str) -> Optional[KCDEvent]:
    """
    Parse a [ThirdSpace] {...} line from KCD log.
    
    Returns KCDEvent if valid, None otherwise.
    """
    match = THIRDSPACE_PATTERN.search(line)
    if not match:
        return None
    
    content = match.group(1)
    parts = content.split('|')
    
    if not parts:
        return None
    
    event_type = parts[0]
    params = {}
    
    # Parse key=value pairs
    for part in parts[1:]:
        if '=' in part:
            key, value = part.split('=', 1)
            params[key.strip()] = value.strip()
    
    return KCDEvent(type=event_type, raw=content, params=params)


# =============================================================================
# Haptic Mapper
# =============================================================================

def direction_to_cells(direction: str) -> List[int]:
    """
    Convert damage direction to vest cells.
    
    Directions: front, back, left, right, or angle in degrees
    """
    direction = direction.lower().strip()
    
    if direction in ('front', 'forward', '0'):
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT,
                Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT]
    elif direction in ('back', 'rear', '180'):
        return BACK_CELLS
    elif direction in ('left', '90', '270'):
        return LEFT_SIDE
    elif direction in ('right', '270', '-90'):
        return RIGHT_SIDE
    else:
        # Try to parse as angle
        try:
            angle = float(direction) % 360
            if angle < 45 or angle >= 315:
                return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
            elif 45 <= angle < 135:
                return LEFT_SIDE
            elif 135 <= angle < 225:
                return BACK_CELLS
            else:
                return RIGHT_SIDE
        except ValueError:
            return FRONT_CELLS  # Default to front


def body_part_to_cells(body_part: str) -> List[int]:
    """Convert body part to vest cells."""
    part = body_part.lower().strip()
    
    if part in ('head', 'neck'):
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT]
    elif part in ('torso', 'chest', 'body'):
        return FRONT_CELLS
    elif part in ('stomach', 'gut', 'abdomen'):
        return [Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT]
    elif part in ('left_arm', 'left_shoulder'):
        return [Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT]
    elif part in ('right_arm', 'right_shoulder'):
        return [Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT]
    elif part in ('left_leg', 'left_foot'):
        return [Cell.BACK_LOWER_LEFT]
    elif part in ('right_leg', 'right_foot'):
        return [Cell.BACK_LOWER_RIGHT]
    elif part in ('back', 'spine'):
        return BACK_CELLS
    else:
        return FRONT_CELLS  # Default


def map_event_to_haptics(event: KCDEvent) -> List[tuple[int, int]]:
    """
    Map a KCD event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    """
    commands = []
    
    if event.type == "PlayerDamage":
        damage = event.get_int("damage", 10)
        health = event.get_int("health", 100)
        
        # Get direction if available
        direction = event.params.get("direction", "front")
        cells = direction_to_cells(direction)
        
        # Get body part if available
        body_part = event.params.get("bodyPart")
        if body_part:
            cells = body_part_to_cells(body_part)
        
        # Scale intensity by damage
        if damage > 40:
            speed = 9
        elif damage > 25:
            speed = 7
        elif damage > 10:
            speed = 5
        else:
            speed = 3
        
        # Boost intensity at low health
        if health < 20:
            speed = min(10, speed + 2)
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "PlayerDeath":
        # Full vest maximum intensity
        for cell in ALL_CELLS:
            commands.append((cell, 10))
    
    elif event.type == "CriticalHealth":
        # Heartbeat effect - left chest cells
        commands.append((Cell.FRONT_UPPER_LEFT, 4))
        commands.append((Cell.FRONT_LOWER_LEFT, 3))
    
    elif event.type == "PlayerHeal":
        # Gentle wave effect
        for cell in FRONT_CELLS:
            commands.append((cell, 2))
    
    elif event.type == "Attack":
        # Weapon swing feedback - upper cells
        commands.append((Cell.FRONT_UPPER_LEFT, 3))
        commands.append((Cell.FRONT_UPPER_RIGHT, 3))
    
    elif event.type == "Block":
        success = event.params.get("success", "false").lower() == "true"
        if success:
            # Successful block - firm feedback
            commands.append((Cell.FRONT_UPPER_LEFT, 6))
            commands.append((Cell.FRONT_UPPER_RIGHT, 6))
        else:
            # Failed block - stronger feedback
            for cell in FRONT_CELLS:
                commands.append((cell, 7))
    
    elif event.type == "Hit":
        # When player hits enemy - light recoil
        commands.append((Cell.FRONT_UPPER_LEFT, 2))
        commands.append((Cell.FRONT_UPPER_RIGHT, 2))
    
    return commands


# =============================================================================
# Log File Watcher
# =============================================================================

class KCDLogWatcher:
    """
    Watches Kingdom Come: Deliverance log file for [ThirdSpace] events.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[KCDEvent], None],
        poll_interval: float = DEFAULT_POLL_INTERVAL,
    ):
        self.log_path = log_path
        self.on_event = on_event
        self.poll_interval = poll_interval
        
        self._running = False
        self._last_position = 0
        self._thread: Optional[Thread] = None
    
    def start(self) -> tuple[bool, Optional[str]]:
        """Start watching the log file."""
        if self._running:
            return False, "Already watching"
        
        if not self.log_path.exists():
            return False, f"Log file not found: {self.log_path}"
        
        self._running = True
        self._last_position = self.log_path.stat().st_size  # Start from end
        
        self._thread = Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        
        logger.info(f"Started watching: {self.log_path}")
        return True, None
    
    def stop(self):
        """Stop watching the log file."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        logger.info("Stopped watching KCD log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading KCD log: {e}")
            
            time.sleep(self.poll_interval)
    
    def _check_for_new_lines(self):
        """Check for new lines in the log file."""
        if not self.log_path.exists():
            return
        
        current_size = self.log_path.stat().st_size
        
        # Handle log truncation (game restart)
        if current_size < self._last_position:
            logger.info("Log file truncated, resetting position")
            self._last_position = 0
        
        if current_size == self._last_position:
            return
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(self._last_position)
                new_content = f.read()
                self._last_position = f.tell()
            
            for line in new_content.splitlines():
                if "[ThirdSpace]" in line:
                    event = parse_thirdspace_line(line)
                    if event:
                        self.on_event(event)
        
        except IOError as e:
            logger.debug(f"IOError reading log: {e}")


# =============================================================================
# KCD Manager (Daemon Integration)
# =============================================================================

GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class KCDManager:
    """
    Manages Kingdom Come: Deliverance integration within the daemon.
    
    This class:
    1. Watches game log for [ThirdSpace] events
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    """
    
    # Default paths for KCD log files
    DEFAULT_LOG_PATHS = [
        # KCD 1 - Windows
        Path(os.path.expanduser("~")) / "Saved Games" / "kingdomcome" / "game.log",
        Path("C:/Program Files (x86)/Steam/steamapps/common/KingdomComeDeliverance/game.log"),
        Path("C:/Program Files/Steam/steamapps/common/KingdomComeDeliverance/game.log"),
        # KCD 2 - Windows
        Path(os.path.expandvars("%LOCALAPPDATA%")) / "KingdomComeDeliverance2" / "game.log",
        Path("C:/Program Files (x86)/Steam/steamapps/common/KingdomComeDeliverance2/game.log"),
        # Linux (Proton)
        Path.home() / ".steam/steam/steamapps/common/KingdomComeDeliverance/game.log",
        Path.home() / ".steam/steam/steamapps/common/KingdomComeDeliverance2/game.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[KCDLogWatcher] = None
        self._running = False
        
        # Stats
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
    
    @property
    def is_running(self) -> bool:
        return self._running
    
    @property
    def log_path(self) -> Optional[Path]:
        return self._log_path
    
    @property
    def events_received(self) -> int:
        return self._events_received
    
    @property
    def last_event_ts(self) -> Optional[float]:
        return self._last_event_ts
    
    def auto_detect_log_path(self) -> Optional[Path]:
        """Try to auto-detect the game log path."""
        for path in self.DEFAULT_LOG_PATHS:
            if path.exists():
                return path
        
        # Check parent directories (game installed but no log yet)
        for path in self.DEFAULT_LOG_PATHS:
            if path.parent.exists():
                return path
        
        return None
    
    def start(self, log_path: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Start watching for KCD events.
        
        Args:
            log_path: Path to game log, or None for auto-detect
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "KCD integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, (
                "Could not find KCD log file. "
                "Ensure Kingdom Come: Deliverance is installed and "
                "the ThirdSpace Lua script is loaded."
            )
        
        # Create watcher
        self._watcher = KCDLogWatcher(
            log_path=self._log_path,
            on_event=self._on_kcd_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        
        logger.info(f"KCD integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for KCD events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("KCD integration stopped")
        return True
    
    def _on_kcd_event(self, event: KCDEvent):
        """Called when a KCD event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"KCD event: {event.type} - {event.params}")
        
        # Emit event to callback (for broadcasting)
        if self.on_game_event:
            self.on_game_event(event.type, event.params)
        
        # Map to haptics and trigger
        haptic_commands = map_event_to_haptics(event)
        for cell, speed in haptic_commands:
            self._trigger(cell, speed)
    
    def _trigger(self, cell: int, speed: int):
        """Trigger a haptic effect via callback."""
        if self.on_trigger:
            self.on_trigger(cell, speed)


# =============================================================================
# Mod Resources
# =============================================================================

def get_mod_info() -> dict:
    """Get information about the required mod."""
    return {
        "name": "Third Space Haptics for Kingdom Come: Deliverance",
        "description": "Lua script that logs game events for haptic feedback",
        "version": "1.0.0",
        "files": [
            "Mods/ThirdSpaceHaptics/Scripts/Startup/thirdspace_haptics.lua"
        ],
        "install_instructions": [
            "1. Download the ThirdSpaceHaptics mod",
            "2. Extract to your KCD installation folder",
            "3. The mod should be in: Mods/ThirdSpaceHaptics/",
            "4. Launch the game - script auto-loads on startup",
            "5. (Optional) Enable dev mode with -devmode flag for testing",
        ],
        "console_commands": [
            "ts_init - Initialize the haptics integration",
            "ts_status - Show current status",
            "ts_update - Manual update (for testing)",
        ],
    }
```

**Verification:**
1. Import works: `from server.kcd_manager import KCDManager`
2. No syntax errors

---

#### Task 2.2: Update Protocol for KCD Commands

**What you'll do:** Add KCD command types to the daemon protocol.

**File to modify:** `modern-third-space/src/modern_third_space/server/protocol.py`

**Add these command types:**

```python
# In CommandType enum:
KCD_START = "kcd_start"
KCD_STOP = "kcd_stop"
KCD_STATUS = "kcd_status"
KCD_GET_MOD_INFO = "kcd_get_mod_info"

# In EventType enum:
KCD_STARTED = "kcd_started"
KCD_STOPPED = "kcd_stopped"
KCD_GAME_EVENT = "kcd_game_event"
```

---

#### Task 2.3: Add KCD Handlers to Daemon

**What you'll do:** Add command handlers in the daemon.

**File to modify:** `modern-third-space/src/modern_third_space/server/daemon.py`

**Pattern to follow:** Look at how `alyx_manager` is integrated:

1. Import KCDManager
2. Initialize in `__init__`
3. Add command handlers for `kcd_start`, `kcd_stop`, `kcd_status`
4. Wire up callbacks for events and triggers

---

### 🔷 PHASE 3-4: Event Parser & Haptic Mapper

These are already implemented in Task 2.1 (`kcd_manager.py`). 

**Review and enhance:**
- [ ] Test parse_thirdspace_line with various inputs
- [ ] Add more event types as discovered during testing
- [ ] Fine-tune haptic intensities

---

### 🔷 PHASE 5: CLI Commands

**File to modify:** `modern-third-space/src/modern_third_space/cli.py`

**Add subcommand group:**

```python
@cli.group()
def kcd():
    """Kingdom Come: Deliverance integration commands."""
    pass

@kcd.command()
@click.option('--log-path', help='Path to KCD log file')
def start(log_path):
    """Start KCD integration."""
    # Send kcd_start command to daemon

@kcd.command()
def stop():
    """Stop KCD integration."""

@kcd.command()
def status():
    """Check KCD integration status."""
```

---

### 🔷 PHASE 6: UI Integration

**Files to create:**
- `web/src/components/KCDIntegrationPanel.tsx`
- `web/src/hooks/useKCDIntegration.ts`

**Pattern to follow:** Copy from `AlyxIntegrationPanel.tsx`

---

### 🔷 PHASE 7: Testing

**Test cases:**

1. **Unit tests:**
   - [ ] Test `parse_thirdspace_line()` with valid/invalid inputs
   - [ ] Test `map_event_to_haptics()` returns correct cells
   - [ ] Test `direction_to_cells()` and `body_part_to_cells()`

2. **Integration tests:**
   - [ ] Test log watcher with mock log file
   - [ ] Test daemon commands via TCP

3. **Manual testing:**
   - [ ] Install Lua script in KCD
   - [ ] Take damage and verify haptic feedback
   - [ ] Test healing, death, combat actions

**Test commands:**

```bash
# Start daemon
python3 -m modern_third_space.cli daemon start

# Start KCD integration
echo '{"cmd":"kcd_start"}' | nc localhost 5050

# Check status
echo '{"cmd":"kcd_status"}' | nc localhost 5050

# Stop integration
echo '{"cmd":"kcd_stop"}' | nc localhost 5050
```

---

## Appendix: Technical Reference

### Event Format Specification

All events use this format:
```
[ThirdSpace] {EventType|param1=value1|param2=value2|...}
```

### Supported Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `Init` | `version` | Script initialization |
| `PlayerFound` | `health` | Player entity located |
| `PlayerDamage` | `damage`, `health`, `previous`, `direction`, `bodyPart` | Player took damage |
| `PlayerDeath` | `lastHealth` | Player died |
| `PlayerHeal` | `amount`, `health` | Player healed |
| `CriticalHealth` | `health` | Health below 20% |
| `Attack` | `weapon`, `type` | Player attacked |
| `Block` | `success`, `direction` | Player blocked |
| `Hit` | `damage`, `direction`, `bodyPart` | Player's attack hit enemy |

### Vest Cell Mapping

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R
```

### Resources

- **KCD Coding Guide:** https://github.com/benjaminfoo/kcd_coding_guide
- **KCD2 Mod Docs:** https://github.com/muyuanjin/kcd2-mod-docs
- **CryEngine Docs:** https://docs.cryengine.com/
- **KCD Modding Tools:** https://www.nexusmods.com/kingdomcomedeliverance/mods/864
- **Official Modding Guide (KCD2):** https://kingdomcomerpg.com/en/news/modding-in-kcdii

### Version Compatibility

| Game Version | Status | Notes |
|--------------|--------|-------|
| KCD 1 | 🟡 Needs testing | Original game |
| KCD 1 Royal Edition | 🟡 Needs testing | All DLC included |
| KCD 2 | 🟡 Needs testing | Uses newer CryEngine fork |

---

## Changelog

- **2024-12**: Complete rewrite with detailed implementation plan
- **2024-11**: Initial research and strategy
