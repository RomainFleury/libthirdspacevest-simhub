# Kingdom Come: Deliverance 2 - Complete Integration Guide

> **Status: 📋 READY FOR IMPLEMENTATION**
>
> **Last Updated:** December 2024
>
> **Target Game:** Kingdom Come: Deliverance II
>
> **Engine:** CryEngine (CRYENGINE V modified fork)
>
> **Official Modding Tools:** [Warhorse Modding Documentation](https://warhorse.youtrack.cloud/articles/KM-A-55/The-Modding-Tools)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Part 1: Game Mod Development](#part-1-game-mod-development-lua-script)
5. [Part 2: Python Integration Manager](#part-2-python-integration-manager)
6. [Part 3: Daemon Protocol Integration](#part-3-daemon-protocol-integration)
7. [Part 4: CLI Commands](#part-4-cli-commands)
8. [Part 5: UI Component](#part-5-ui-component)
9. [Testing Guide](#testing-guide)
10. [Submission Checklist](#submission-checklist)
11. [Appendix: Technical Reference](#appendix-technical-reference)

---

## Overview

This guide provides **step-by-step instructions** for implementing Third Space Vest haptic feedback integration for Kingdom Come: Deliverance 2 (KCD2). A junior developer should be able to follow this guide and submit a complete PR.

### Why KCD2 is Great for Haptic Feedback

| Feature | Haptic Potential |
|---------|-----------------|
| Melee combat (swords, maces, axes) | Directional impact feedback |
| Blocking and parrying | Resistance/impact feedback |
| Arrow hits and ranged combat | Sharp, sudden feedback |
| Health and injury system | Heartbeat at low health |
| Status effects (bleeding, poison) | Sustained pulsing patterns |
| Horse combat and riding | Movement feedback |
| Environmental damage (falls, fire) | Full-body impact |

### Integration Pattern

We use the **log file watching pattern** (same as Half-Life: Alyx):

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kingdom Come: Deliverance 2                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Lua Script (thirdspace_kcd2.lua)                          │ │
│  │  - Hooks into game events                                   │ │
│  │  - Polls player health/stats                                │ │
│  │  - Writes [ThirdSpace] {...} to console                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ writes [ThirdSpace] {...}
┌─────────────────────────────────────────────────────────────────┐
│  Game Log File                                                   │
│  Location: %LOCALAPPDATA%/KingdomComeDeliverance2/game.log      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ polls/watches file
┌─────────────────────────────────────────────────────────────────┐
│       Python Manager (server/kcd2_manager.py)                    │
│  • File watcher (polling every 50ms)                             │
│  • Line parser for [ThirdSpace] {EventType|params} format        │
│  • Event-to-haptic mapper                                        │
│  • Broadcasts events to daemon clients                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ TCP commands
┌─────────────────────────────────────────────────────────────────┐
│                    Vest Daemon (port 5050)                       │
│                    └── Third Space Vest Hardware                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have:

- [ ] Kingdom Come: Deliverance 2 installed
- [ ] Python 3.9+ with the project set up
- [ ] Node.js 18+ and Yarn for the Electron UI
- [ ] Git for version control
- [ ] Read `AI_ONBOARDING.md` for project overview
- [ ] Read `docs-external-integrations-ideas/ALYX_INTEGRATION.md` as reference
- [ ] Familiarity with `server/alyx_manager.py` (our reference implementation)

### Setup Development Environment

```bash
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd third-space-vest

# 2. Set up Python environment
cd modern-third-space
pip install -e .

# 3. Start the daemon
python3 -m modern_third_space.cli daemon start

# 4. Set up Electron UI (in a separate terminal)
cd web
yarn install
yarn dev
```

---

## Part 1: Game Mod Development (Lua Script)

### 1.1 Understanding KCD2 Modding

KCD2 uses CryEngine's Lua scripting system. According to the [official modding documentation](https://warhorse.youtrack.cloud/articles/KM-A-55/The-Modding-Tools):

- Mods are packaged as `.pak` files
- Lua scripts can hook into game events
- Console logging is available via `System.LogAlways()`
- Scripts can be placed in `Mods/[ModName]/Scripts/` folder

### 1.2 Create Mod Directory Structure

**Location:** Create in KCD2 installation directory

```
KingdomComeDeliverance2/
└── Mods/
    └── ThirdSpaceHaptics/
        ├── mod.manifest            # Mod metadata
        └── Scripts/
            └── Startup/
                └── thirdspace_kcd2.lua    # Auto-loads on game start
```

### 1.3 Create mod.manifest

**File:** `Mods/ThirdSpaceHaptics/mod.manifest`

```xml
<?xml version="1.0" encoding="utf-8"?>
<kcd_mod>
    <info>
        <name>Third Space Haptics</name>
        <modid>thirdspace_haptics</modid>
        <description>Haptic feedback integration for Third Space Vest</description>
        <author>Third Space Community</author>
        <version>1.0.0</version>
        <created_on>2024-12-01</created_on>
        <updated_on>2024-12-01</updated_on>
    </info>
</kcd_mod>
```

### 1.4 Create the Lua Script

**File:** `Mods/ThirdSpaceHaptics/Scripts/Startup/thirdspace_kcd2.lua`

```lua
--[[
    Third Space Vest Integration for Kingdom Come: Deliverance 2
    
    This script logs game events for haptic feedback.
    Events are written to the game log in format:
    [ThirdSpace] {EventType|param1=value1|param2=value2}
    
    The Python integration reads these events and triggers vest haptics.
]]

-- =============================================================================
-- Configuration
-- =============================================================================

ThirdSpace = {
    -- Mod version
    VERSION = "1.0.0",
    
    -- Log prefix (must match Python parser)
    LOG_PREFIX = "[ThirdSpace]",
    
    -- Polling interval in seconds (0.1 = 100ms)
    POLL_INTERVAL = 0.1,
    
    -- State tracking
    isInitialized = false,
    lastPollTime = 0,
    lastHealth = -1,
    lastStamina = -1,
    lastInCombat = false,
    
    -- Player reference (cached)
    player = nil,
}

-- =============================================================================
-- Logging Functions
-- =============================================================================

--- Log an event in our custom format
-- @param eventType string The type of event
-- @param params table Optional key-value parameters
function ThirdSpace:LogEvent(eventType, params)
    local message = self.LOG_PREFIX .. " {" .. eventType
    
    if params then
        for key, value in pairs(params) do
            message = message .. "|" .. tostring(key) .. "=" .. tostring(value)
        end
    end
    
    message = message .. "}"
    System.LogAlways(message)
end

--- Log a debug message (only in dev mode)
function ThirdSpace:LogDebug(message)
    if System.IsDevMode and System.IsDevMode() then
        System.LogAlways(self.LOG_PREFIX .. " [DEBUG] " .. message)
    end
end

-- =============================================================================
-- Player State Access (KCD2-Specific)
-- =============================================================================

--- Get the player entity
-- @return entity|nil The player entity or nil
function ThirdSpace:GetPlayer()
    if self.player and self.player.id then
        return self.player
    end
    
    -- In KCD2, the player is typically called "dude" or accessed via System
    self.player = System.GetEntityByName("dude")
    
    if not self.player then
        -- Fallback: try to get from player manager
        if Player and Player.GetPlayer then
            self.player = Player.GetPlayer()
        end
    end
    
    return self.player
end

--- Get current player health
-- @return number Current health (0-100) or -1 if unavailable
function ThirdSpace:GetPlayerHealth()
    local player = self:GetPlayer()
    if not player then return -1 end
    
    -- Try different methods to get health
    if player.GetHealth then
        return player:GetHealth()
    elseif player.actor and player.actor.GetHealth then
        return player.actor:GetHealth()
    elseif player.soul and player.soul.GetHealth then
        return player.soul:GetHealth()
    elseif player.health then
        return player.health
    end
    
    return -1
end

--- Get current player stamina
-- @return number Current stamina (0-100) or -1 if unavailable
function ThirdSpace:GetPlayerStamina()
    local player = self:GetPlayer()
    if not player then return -1 end
    
    if player.GetStamina then
        return player:GetStamina()
    elseif player.actor and player.actor.GetStamina then
        return player.actor:GetStamina()
    elseif player.stamina then
        return player.stamina
    end
    
    return -1
end

--- Check if player is in combat
-- @return boolean True if in combat
function ThirdSpace:IsPlayerInCombat()
    local player = self:GetPlayer()
    if not player then return false end
    
    if player.IsInCombat then
        return player:IsInCombat()
    elseif player.actor and player.actor.IsInCombat then
        return player.actor:IsInCombat()
    end
    
    return false
end

--- Get the direction of damage relative to player facing
-- @param hitInfo table The hit information from OnHit
-- @return string Direction as "front", "back", "left", or "right"
function ThirdSpace:GetDamageDirection(hitInfo)
    local player = self:GetPlayer()
    if not player or not hitInfo or not hitInfo.pos then
        return "front"  -- Default to front
    end
    
    -- Get player position and forward direction
    local playerPos = player:GetWorldPos()
    local playerDir = player:GetDirectionVector(0)  -- Forward vector
    
    if not playerPos or not playerDir then
        return "front"
    end
    
    -- Calculate direction to damage source
    local toSource = {
        x = hitInfo.pos.x - playerPos.x,
        y = hitInfo.pos.y - playerPos.y,
        z = 0  -- Ignore vertical for direction
    }
    
    -- Normalize
    local len = math.sqrt(toSource.x * toSource.x + toSource.y * toSource.y)
    if len > 0.001 then
        toSource.x = toSource.x / len
        toSource.y = toSource.y / len
    end
    
    -- Dot product with forward (0 = perpendicular, 1 = front, -1 = back)
    local dot = playerDir.x * toSource.x + playerDir.y * toSource.y
    
    -- Cross product z-component (determines left/right)
    local cross = playerDir.x * toSource.y - playerDir.y * toSource.x
    
    if dot > 0.5 then
        return "front"
    elseif dot < -0.5 then
        return "back"
    elseif cross > 0 then
        return "left"
    else
        return "right"
    end
end

-- =============================================================================
-- Event Handlers
-- =============================================================================

--- Initialize the integration
function ThirdSpace:Init()
    if self.isInitialized then
        return
    end
    
    self:LogEvent("Init", {
        version = self.VERSION,
        game = "KCD2"
    })
    
    -- Try to get player reference
    local player = self:GetPlayer()
    if player then
        self.lastHealth = self:GetPlayerHealth()
        self:LogEvent("PlayerFound", {
            health = self.lastHealth
        })
    else
        self:LogEvent("Warning", {
            msg = "Player not found yet"
        })
    end
    
    self.isInitialized = true
    
    -- Register for game events (if available in KCD2)
    self:RegisterEventListeners()
end

--- Register for game events
function ThirdSpace:RegisterEventListeners()
    -- Note: The exact event registration may vary in KCD2
    -- This is based on CryEngine patterns
    
    if UIAction and UIAction.RegisterActionListener then
        UIAction.RegisterActionListener(self, "", "", "OnUIAction")
    end
    
    -- Try to hook into player damage events
    local player = self:GetPlayer()
    if player then
        -- Store original OnHit if it exists
        if player.OnHit then
            player._OriginalOnHit = player.OnHit
            player.OnHit = function(entity, hitInfo)
                ThirdSpace:OnPlayerHit(hitInfo)
                if entity._OriginalOnHit then
                    entity._OriginalOnHit(entity, hitInfo)
                end
            end
        end
    end
end

--- Called when player is hit
function ThirdSpace:OnPlayerHit(hitInfo)
    local damage = hitInfo.damage or 0
    local direction = self:GetDamageDirection(hitInfo)
    local currentHealth = self:GetPlayerHealth()
    
    -- Determine body part from hit zone (if available)
    local bodyPart = "torso"  -- Default
    if hitInfo.partId then
        -- KCD2 might use specific part IDs for body parts
        -- This mapping may need adjustment based on actual game values
        local partMapping = {
            [0] = "head",
            [1] = "torso",
            [2] = "left_arm",
            [3] = "right_arm",
            [4] = "left_leg",
            [5] = "right_leg",
        }
        bodyPart = partMapping[hitInfo.partId] or "torso"
    end
    
    self:LogEvent("PlayerDamage", {
        damage = math.floor(damage),
        health = math.floor(currentHealth),
        direction = direction,
        bodyPart = bodyPart,
        weaponType = hitInfo.weapon or "unknown"
    })
    
    -- Check for death
    if currentHealth <= 0 then
        self:LogEvent("PlayerDeath", {
            lastHealth = math.floor(self.lastHealth),
            cause = hitInfo.type or "combat"
        })
    elseif currentHealth < 20 then
        self:LogEvent("CriticalHealth", {
            health = math.floor(currentHealth)
        })
    end
    
    self.lastHealth = currentHealth
end

--- Called every game frame
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
        self.player = self:GetPlayer()
        if self.player then
            self.lastHealth = self:GetPlayerHealth()
            self:LogEvent("PlayerFound", {
                health = self.lastHealth
            })
        end
        return
    end
    
    -- Poll for state changes
    self:CheckHealthChanges()
    self:CheckCombatState()
    self:CheckStaminaChanges()
end

--- Check for health changes (polling fallback)
function ThirdSpace:CheckHealthChanges()
    local currentHealth = self:GetPlayerHealth()
    
    if currentHealth < 0 or self.lastHealth < 0 then
        self.lastHealth = currentHealth
        return
    end
    
    local healthDiff = currentHealth - self.lastHealth
    
    if healthDiff < -1 then  -- Significant damage (threshold to avoid noise)
        -- Damage detected via polling (event handler may have missed it)
        self:LogEvent("PlayerDamage", {
            damage = math.abs(math.floor(healthDiff)),
            health = math.floor(currentHealth),
            previous = math.floor(self.lastHealth),
            direction = "front",  -- Unknown direction for polled damage
            source = "polling"
        })
        
        if currentHealth <= 0 then
            self:LogEvent("PlayerDeath", {
                lastHealth = math.floor(self.lastHealth)
            })
        elseif currentHealth < 20 then
            self:LogEvent("CriticalHealth", {
                health = math.floor(currentHealth)
            })
        end
        
    elseif healthDiff > 1 then  -- Healing
        self:LogEvent("PlayerHeal", {
            amount = math.floor(healthDiff),
            health = math.floor(currentHealth)
        })
    end
    
    self.lastHealth = currentHealth
end

--- Check for combat state changes
function ThirdSpace:CheckCombatState()
    local inCombat = self:IsPlayerInCombat()
    
    if inCombat and not self.lastInCombat then
        self:LogEvent("CombatStart", {})
    elseif not inCombat and self.lastInCombat then
        self:LogEvent("CombatEnd", {})
    end
    
    self.lastInCombat = inCombat
end

--- Check for stamina changes (for heavy exertion feedback)
function ThirdSpace:CheckStaminaChanges()
    local currentStamina = self:GetPlayerStamina()
    
    if currentStamina < 0 then return end
    
    if currentStamina < 15 and self.lastStamina >= 15 then
        self:LogEvent("LowStamina", {
            stamina = math.floor(currentStamina)
        })
    end
    
    self.lastStamina = currentStamina
end

-- =============================================================================
-- Combat Event Hooks (extend as needed for KCD2)
-- =============================================================================

--- Called when player attacks
function ThirdSpace:OnPlayerAttack(attackInfo)
    local weaponType = "melee"
    if attackInfo and attackInfo.weapon then
        weaponType = attackInfo.weapon
    end
    
    self:LogEvent("PlayerAttack", {
        weapon = weaponType,
        type = attackInfo and attackInfo.attackType or "swing"
    })
end

--- Called when player blocks
function ThirdSpace:OnPlayerBlock(blockInfo)
    local success = blockInfo and blockInfo.success or false
    
    self:LogEvent("PlayerBlock", {
        success = success and "true" or "false",
        direction = blockInfo and blockInfo.direction or "front",
        perfect = blockInfo and blockInfo.perfectBlock and "true" or "false"
    })
end

--- Called when player's attack hits an enemy
function ThirdSpace:OnPlayerHitEnemy(hitInfo)
    self:LogEvent("PlayerHitEnemy", {
        damage = hitInfo and math.floor(hitInfo.damage or 0) or 0,
        enemyType = hitInfo and hitInfo.targetType or "human",
        weapon = hitInfo and hitInfo.weapon or "melee"
    })
end

--- Called when player falls
function ThirdSpace:OnPlayerFall(fallInfo)
    local damage = fallInfo and fallInfo.damage or 0
    
    self:LogEvent("PlayerFall", {
        damage = math.floor(damage),
        height = fallInfo and math.floor(fallInfo.height or 0) or 0
    })
end

-- =============================================================================
-- Update Loop Registration
-- =============================================================================

-- Register the update function
-- The exact method depends on KCD2's scripting API

if Script and Script.SetTimer then
    -- Use repeating timer
    Script.SetTimer(100, function()
        ThirdSpace:OnUpdate(0.1)
        Script.SetTimer(100, function()
            ThirdSpace:OnUpdate(0.1)
        end)
    end)
elseif Game and Game.RegisterUpdateCallback then
    -- Use game update callback
    Game.RegisterUpdateCallback(function(dt)
        ThirdSpace:OnUpdate(dt)
    end)
else
    -- Fallback: Register console commands for manual testing
    System.AddCCommand("ts_init", "ThirdSpace:Init()", "Initialize ThirdSpace integration")
    System.AddCCommand("ts_status", "ThirdSpace:LogEvent('Status', {health=ThirdSpace:GetPlayerHealth(), stamina=ThirdSpace:GetPlayerStamina()})", "Log current status")
    System.AddCCommand("ts_test_damage", "ThirdSpace:LogEvent('PlayerDamage', {damage=25, health=75, direction='front', bodyPart='torso'})", "Test damage event")
    System.AddCCommand("ts_test_death", "ThirdSpace:LogEvent('PlayerDeath', {lastHealth=10, cause='combat'})", "Test death event")
    System.AddCCommand("ts_test_heal", "ThirdSpace:LogEvent('PlayerHeal', {amount=20, health=80})", "Test heal event")
    
    System.LogAlways("[ThirdSpace] Console commands registered: ts_init, ts_status, ts_test_damage, ts_test_death, ts_test_heal")
end

-- Auto-initialize when script loads
ThirdSpace:Init()

System.LogAlways("[ThirdSpace] KCD2 Integration v" .. ThirdSpace.VERSION .. " loaded")
```

### 1.5 Enable Developer Mode for Testing

To test the Lua script during development:

1. Create a shortcut to `KingdomComeDeliverance2.exe`
2. Add `-devmode` to the launch arguments
3. Launch the game with the shortcut
4. Press `~` or `^` to open the console
5. Use the test commands:
   ```
   #ts_status           -- Check current player status
   #ts_test_damage      -- Test damage event
   #ts_test_death       -- Test death event
   #ts_test_heal        -- Test heal event
   ```

### 1.6 Package the Mod

1. Verify your folder structure matches Section 1.2
2. Open the game and verify the mod appears in the Mods menu
3. Start a game and check the console for `[ThirdSpace]` messages

---

## Part 2: Python Integration Manager

### 2.1 Create the KCD2 Manager Module

**File:** `modern-third-space/src/modern_third_space/server/kcd2_manager.py`

```python
"""
Kingdom Come: Deliverance 2 Integration Manager for the vest daemon.

This module provides log file watching to receive game events from
Kingdom Come: Deliverance 2. The game events are emitted via a Lua script
(thirdspace_kcd2.lua) that writes to the game log.

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
class KCD2Event:
    """Parsed event from KCD2 log."""
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
            return int(float(self.params.get(key, default)))
        except (ValueError, TypeError):
            return default
    
    def get_float(self, key: str, default: float = 0.0) -> float:
        """Get parameter as float."""
        try:
            return float(self.params.get(key, default))
        except (ValueError, TypeError):
            return default
    
    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get parameter as boolean."""
        val = self.params.get(key, str(default)).lower()
        return val in ("true", "1", "yes")


# Event format: [ThirdSpace] {EventType|param1=value1|param2=value2}
THIRDSPACE_PATTERN = re.compile(r'\[ThirdSpace\]\s*\{([^}]+)\}')


def parse_thirdspace_line(line: str) -> Optional[KCD2Event]:
    """
    Parse a [ThirdSpace] {...} line from KCD2 log.
    
    Returns KCD2Event if valid, None otherwise.
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
    
    return KCD2Event(type=event_type, raw=content, params=params)


# =============================================================================
# Haptic Mapper
# =============================================================================

def direction_to_cells(direction: str) -> List[int]:
    """
    Convert damage direction to vest cells.
    
    Directions: front, back, left, right
    
    Cell layout:
          FRONT                    BACK
      ┌─────┬─────┐          ┌─────┬─────┐
      │  2  │  5  │  Upper   │  1  │  6  │
      ├─────┼─────┤          ├─────┼─────┤
      │  3  │  4  │  Lower   │  0  │  7  │
      └─────┴─────┘          └─────┴─────┘
        L     R                L     R
    """
    direction = direction.lower().strip()
    
    if direction in ('front', 'forward'):
        return FRONT_CELLS
    elif direction in ('back', 'rear', 'behind'):
        return BACK_CELLS
    elif direction in ('left',):
        return LEFT_SIDE
    elif direction in ('right',):
        return RIGHT_SIDE
    else:
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


def map_event_to_haptics(event: KCD2Event) -> List[tuple[int, int]]:
    """
    Map a KCD2 event to haptic commands.
    
    Returns list of (cell, speed) tuples.
    Speed ranges from 1 (weak) to 10 (strong).
    """
    commands = []
    
    if event.type == "PlayerDamage":
        damage = event.get_int("damage", 10)
        health = event.get_int("health", 100)
        
        # Get direction if available
        direction = event.params.get("direction", "front")
        cells = direction_to_cells(direction)
        
        # Get body part if available (overrides direction)
        body_part = event.params.get("bodyPart")
        if body_part:
            cells = body_part_to_cells(body_part)
        
        # Scale intensity by damage amount
        # KCD2 has realistic damage, typical hits are 5-30 damage
        if damage > 40:
            speed = 10
        elif damage > 30:
            speed = 8
        elif damage > 20:
            speed = 6
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
        # Gentle soothing effect on front
        for cell in FRONT_CELLS:
            commands.append((cell, 2))
    
    elif event.type == "PlayerAttack":
        # Weapon swing feedback - upper front cells
        # Intensity based on weapon type
        weapon = event.params.get("weapon", "melee").lower()
        if "sword" in weapon or "mace" in weapon:
            speed = 5
        elif "bow" in weapon:
            speed = 4
        else:
            speed = 4
        
        commands.append((Cell.FRONT_UPPER_LEFT, speed))
        commands.append((Cell.FRONT_UPPER_RIGHT, speed))
    
    elif event.type == "PlayerBlock":
        success = event.get_bool("success", False)
        perfect = event.get_bool("perfect", False)
        direction = event.params.get("direction", "front")
        cells = direction_to_cells(direction)
        
        if perfect:
            # Perfect block - firm satisfying feedback
            speed = 7
        elif success:
            # Successful block - solid feedback
            speed = 5
        else:
            # Failed block - stronger impact
            speed = 8
        
        for cell in cells:
            commands.append((cell, speed))
    
    elif event.type == "PlayerHitEnemy":
        # When player hits enemy - light weapon recoil
        damage = event.get_int("damage", 10)
        speed = 3 if damage < 20 else 4
        
        commands.append((Cell.FRONT_UPPER_LEFT, speed))
        commands.append((Cell.FRONT_UPPER_RIGHT, speed))
    
    elif event.type == "PlayerFall":
        # Fall damage - lower body impact
        damage = event.get_int("damage", 0)
        if damage > 0:
            speed = min(10, 5 + damage // 10)
            commands.append((Cell.BACK_LOWER_LEFT, speed))
            commands.append((Cell.BACK_LOWER_RIGHT, speed))
            commands.append((Cell.FRONT_LOWER_LEFT, speed))
            commands.append((Cell.FRONT_LOWER_RIGHT, speed))
    
    elif event.type == "LowStamina":
        # Subtle exhaustion feedback
        commands.append((Cell.FRONT_UPPER_LEFT, 2))
        commands.append((Cell.FRONT_UPPER_RIGHT, 2))
    
    elif event.type == "CombatStart":
        # Quick alert pulse
        for cell in UPPER_CELLS:
            commands.append((cell, 3))
    
    return commands


# =============================================================================
# Log File Watcher
# =============================================================================

class KCD2LogWatcher:
    """
    Watches Kingdom Come: Deliverance 2 log file for [ThirdSpace] events.
    """
    
    DEFAULT_POLL_INTERVAL = 0.05  # 50ms
    
    def __init__(
        self,
        log_path: Path,
        on_event: Callable[[KCD2Event], None],
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
        logger.info("Stopped watching KCD2 log")
    
    def _watch_loop(self):
        """Main watch loop running in background thread."""
        while self._running:
            try:
                self._check_for_new_lines()
            except FileNotFoundError:
                self._last_position = 0
            except Exception as e:
                logger.error(f"Error reading KCD2 log: {e}")
            
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
# KCD2 Manager (Daemon Integration)
# =============================================================================

GameEventCallback = Callable[[str, dict], None]
TriggerCallback = Callable[[int, int], None]


class KCD2Manager:
    """
    Manages Kingdom Come: Deliverance 2 integration within the daemon.
    
    This class:
    1. Watches game log for [ThirdSpace] events
    2. Parses and maps events to haptic commands
    3. Triggers haptic effects via callback
    4. Reports events via callback (for broadcasting to clients)
    """
    
    # Default paths for KCD2 log files
    DEFAULT_LOG_PATHS = [
        # Windows - Local AppData (most likely location)
        Path(os.path.expandvars("%LOCALAPPDATA%")) / "KingdomComeDeliverance2" / "game.log",
        # Windows - Steam installation
        Path("C:/Program Files (x86)/Steam/steamapps/common/KingdomComeDeliverance2/game.log"),
        Path("C:/Program Files/Steam/steamapps/common/KingdomComeDeliverance2/game.log"),
        # Windows - GOG installation
        Path("C:/Program Files (x86)/GOG Galaxy/Games/Kingdom Come Deliverance 2/game.log"),
        # Windows - Epic Games
        Path("C:/Program Files/Epic Games/KingdomComeDeliverance2/game.log"),
        # Linux (Proton)
        Path.home() / ".steam/steam/steamapps/common/KingdomComeDeliverance2/game.log",
        Path.home() / ".local/share/Steam/steamapps/common/KingdomComeDeliverance2/game.log",
    ]
    
    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
    ):
        self.on_game_event = on_game_event
        self.on_trigger = on_trigger
        
        self._log_path: Optional[Path] = None
        self._watcher: Optional[KCD2LogWatcher] = None
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
    
    @property
    def last_event_type(self) -> Optional[str]:
        return self._last_event_type
    
    def auto_detect_log_path(self) -> Optional[Path]:
        """Try to auto-detect the game log path."""
        for path in self.DEFAULT_LOG_PATHS:
            if path.exists():
                logger.info(f"Found KCD2 log at: {path}")
                return path
        
        # Check parent directories (game installed but no log yet)
        for path in self.DEFAULT_LOG_PATHS:
            if path.parent.exists():
                logger.info(f"Found KCD2 directory, expecting log at: {path}")
                return path
        
        return None
    
    def start(self, log_path: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Start watching for KCD2 events.
        
        Args:
            log_path: Path to game log, or None for auto-detect
            
        Returns:
            (success, error_message)
        """
        if self._running:
            return False, "KCD2 integration already running"
        
        # Determine log path
        if log_path:
            self._log_path = Path(log_path)
        else:
            self._log_path = self.auto_detect_log_path()
        
        if not self._log_path:
            return False, (
                "Could not find KCD2 log file. "
                "Ensure Kingdom Come: Deliverance 2 is installed and "
                "the ThirdSpace mod is active."
            )
        
        # Create watcher
        self._watcher = KCD2LogWatcher(
            log_path=self._log_path,
            on_event=self._on_kcd2_event,
        )
        
        success, error = self._watcher.start()
        if not success:
            self._watcher = None
            return False, error
        
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        
        logger.info(f"KCD2 integration started, watching: {self._log_path}")
        return True, None
    
    def stop(self) -> bool:
        """Stop watching for KCD2 events."""
        if not self._running:
            return False
        
        if self._watcher:
            self._watcher.stop()
            self._watcher = None
        
        self._running = False
        logger.info("KCD2 integration stopped")
        return True
    
    def _on_kcd2_event(self, event: KCD2Event):
        """Called when a KCD2 event is detected."""
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event.type
        
        logger.debug(f"KCD2 event: {event.type} - {event.params}")
        
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

MOD_DOWNLOAD_URL = "https://www.nexusmods.com/kingdomcomedeliverance2/mods/XXX"  # TODO: Create NexusMods page
MOD_GITHUB_URL = "https://github.com/third-space-vest/kcd2-mod"  # TODO: Create repository

def get_mod_info() -> dict:
    """Get information about the required mod."""
    return {
        "name": "Third Space Haptics for Kingdom Come: Deliverance 2",
        "description": "Lua script that logs game events for haptic feedback",
        "version": "1.0.0",
        "download_url": MOD_DOWNLOAD_URL,
        "github_url": MOD_GITHUB_URL,
        "modding_docs": "https://warhorse.youtrack.cloud/articles/KM-A-55/The-Modding-Tools",
        "files": [
            "Mods/ThirdSpaceHaptics/mod.manifest",
            "Mods/ThirdSpaceHaptics/Scripts/Startup/thirdspace_kcd2.lua"
        ],
        "install_instructions": [
            "1. Download the ThirdSpaceHaptics mod",
            "2. Extract to your KCD2 installation folder",
            "3. The mod should be in: KingdomComeDeliverance2/Mods/ThirdSpaceHaptics/",
            "4. Launch the game - mod auto-loads on startup",
            "5. (Optional) Enable dev mode with -devmode flag for testing",
        ],
        "console_commands": [
            "ts_init - Initialize the haptics integration",
            "ts_status - Show current player status",
            "ts_test_damage - Test damage event",
            "ts_test_death - Test death event",
            "ts_test_heal - Test heal event",
        ],
    }
```

### 2.2 Add Unit Tests

**File:** `modern-third-space/tests/test_kcd2_manager.py`

```python
"""Tests for KCD2 Manager."""

import pytest
from pathlib import Path
from modern_third_space.server.kcd2_manager import (
    parse_thirdspace_line,
    KCD2Event,
    direction_to_cells,
    body_part_to_cells,
    map_event_to_haptics,
)
from modern_third_space.vest.cell_layout import Cell, FRONT_CELLS, BACK_CELLS


class TestEventParser:
    """Test event parsing."""
    
    def test_parse_damage_event(self):
        line = '[ThirdSpace] {PlayerDamage|damage=25|health=75|direction=front|bodyPart=torso}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerDamage"
        assert event.get_int("damage") == 25
        assert event.get_int("health") == 75
        assert event.params["direction"] == "front"
        assert event.params["bodyPart"] == "torso"
    
    def test_parse_death_event(self):
        line = '[ThirdSpace] {PlayerDeath|lastHealth=10|cause=combat}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerDeath"
        assert event.get_int("lastHealth") == 10
        assert event.params["cause"] == "combat"
    
    def test_parse_heal_event(self):
        line = '[ThirdSpace] {PlayerHeal|amount=20|health=80}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "PlayerHeal"
        assert event.get_int("amount") == 20
        assert event.get_int("health") == 80
    
    def test_parse_invalid_line(self):
        line = 'Some random log line'
        event = parse_thirdspace_line(line)
        assert event is None
    
    def test_parse_no_params(self):
        line = '[ThirdSpace] {CombatStart}'
        event = parse_thirdspace_line(line)
        
        assert event is not None
        assert event.type == "CombatStart"
        assert event.params == {}


class TestDirectionMapping:
    """Test direction to cell mapping."""
    
    def test_front_direction(self):
        cells = direction_to_cells("front")
        assert cells == FRONT_CELLS
    
    def test_back_direction(self):
        cells = direction_to_cells("back")
        assert cells == BACK_CELLS
    
    def test_left_direction(self):
        cells = direction_to_cells("left")
        assert Cell.FRONT_UPPER_LEFT in cells
        assert Cell.BACK_UPPER_LEFT in cells
    
    def test_right_direction(self):
        cells = direction_to_cells("right")
        assert Cell.FRONT_UPPER_RIGHT in cells
        assert Cell.BACK_UPPER_RIGHT in cells


class TestBodyPartMapping:
    """Test body part to cell mapping."""
    
    def test_head_mapping(self):
        cells = body_part_to_cells("head")
        assert Cell.FRONT_UPPER_LEFT in cells
        assert Cell.FRONT_UPPER_RIGHT in cells
    
    def test_torso_mapping(self):
        cells = body_part_to_cells("torso")
        assert cells == FRONT_CELLS
    
    def test_back_mapping(self):
        cells = body_part_to_cells("back")
        assert cells == BACK_CELLS


class TestHapticMapping:
    """Test event to haptic mapping."""
    
    def test_damage_event_mapping(self):
        event = KCD2Event(
            type="PlayerDamage",
            raw="PlayerDamage|damage=25|health=75|direction=front",
            params={"damage": "25", "health": "75", "direction": "front"}
        )
        
        commands = map_event_to_haptics(event)
        assert len(commands) > 0
        
        # Check all commands have valid cell and speed
        for cell, speed in commands:
            assert 0 <= cell <= 7
            assert 1 <= speed <= 10
    
    def test_death_event_mapping(self):
        event = KCD2Event(
            type="PlayerDeath",
            raw="PlayerDeath",
            params={}
        )
        
        commands = map_event_to_haptics(event)
        
        # Death should trigger all cells
        cells_triggered = [c for c, s in commands]
        assert len(cells_triggered) == 8  # All 8 cells
        
        # All at max intensity
        for _, speed in commands:
            assert speed == 10
    
    def test_heal_event_mapping(self):
        event = KCD2Event(
            type="PlayerHeal",
            raw="PlayerHeal|amount=20",
            params={"amount": "20"}
        )
        
        commands = map_event_to_haptics(event)
        
        # Heal should be gentle
        for _, speed in commands:
            assert speed <= 3
```

---

## Part 3: Daemon Protocol Integration

### 3.1 Update Protocol Definitions

**File to modify:** `modern-third-space/src/modern_third_space/server/protocol.py`

Add these to the `CommandType` enum:

```python
# In CommandType enum, add:
    # Kingdom Come: Deliverance 2 integration
    KCD2_START = "kcd2_start"
    KCD2_STOP = "kcd2_stop"
    KCD2_STATUS = "kcd2_status"
    KCD2_GET_MOD_INFO = "kcd2_get_mod_info"
```

Add these to the `EventType` enum:

```python
# In EventType enum, add:
    # Kingdom Come: Deliverance 2 integration
    KCD2_STARTED = "kcd2_started"
    KCD2_STOPPED = "kcd2_stopped"
    KCD2_GAME_EVENT = "kcd2_game_event"
```

Add these protocol helper functions at the end of the file:

```python
# =============================================================================
# Kingdom Come: Deliverance 2 Integration Protocol
# =============================================================================

def event_kcd2_started(log_path: str) -> Event:
    """Event when KCD2 integration starts."""
    return Event(event=EventType.KCD2_STARTED.value, log_path=log_path)


def event_kcd2_stopped() -> Event:
    """Event when KCD2 integration stops."""
    return Event(event=EventType.KCD2_STOPPED.value)


def event_kcd2_game_event(
    event_type: str,
    params: Optional[Dict[str, Any]] = None,
) -> Event:
    """
    KCD2 game event (damage, death, block, etc.).
    
    Args:
        event_type: Type of event ("PlayerDamage", "PlayerDeath", etc.)
        params: Event parameters (damage, health, direction, etc.)
    """
    return Event(
        event=EventType.KCD2_GAME_EVENT.value,
        event_type=event_type,
        params=params,
    )


def response_kcd2_start(
    success: bool,
    log_path: Optional[str] = None,
    error: Optional[str] = None,
    req_id: Optional[str] = None,
) -> Response:
    """Response to kcd2_start command."""
    return Response(
        response="kcd2_start",
        req_id=req_id,
        success=success,
        log_path=log_path,
        message=error,
    )


def response_kcd2_stop(success: bool, req_id: Optional[str] = None) -> Response:
    """Response to kcd2_stop command."""
    return Response(
        response="kcd2_stop",
        req_id=req_id,
        success=success,
    )


def response_kcd2_status(
    running: bool,
    log_path: Optional[str] = None,
    events_received: int = 0,
    last_event_ts: Optional[float] = None,
    last_event_type: Optional[str] = None,
    req_id: Optional[str] = None,
) -> Response:
    """Response to kcd2_status command."""
    return Response(
        response="kcd2_status",
        req_id=req_id,
        running=running,
        log_path=log_path,
        events_received=events_received,
        last_event_ts=last_event_ts,
        last_event_type=last_event_type,
    )


def response_kcd2_get_mod_info(
    mod_info: Dict[str, Any],
    req_id: Optional[str] = None,
) -> Response:
    """Response to kcd2_get_mod_info command with mod download/install info."""
    return Response(
        response="kcd2_get_mod_info",
        req_id=req_id,
        mod_info=mod_info,
    )
```

### 3.2 Add Daemon Command Handlers

**File to modify:** `modern-third-space/src/modern_third_space/server/daemon.py`

Add import at the top:

```python
from .kcd2_manager import KCD2Manager, get_mod_info as get_kcd2_mod_info
from .protocol import (
    # ... existing imports ...
    event_kcd2_started,
    event_kcd2_stopped,
    event_kcd2_game_event,
    response_kcd2_start,
    response_kcd2_stop,
    response_kcd2_status,
    response_kcd2_get_mod_info,
)
```

In the `VestDaemon.__init__` method, add:

```python
# KCD2 integration
self._kcd2_manager = KCD2Manager(
    on_game_event=self._on_kcd2_game_event,
    on_trigger=self._trigger_effect,
)
```

Add command handlers:

```python
async def _cmd_kcd2_start(self, command: Command, client_id: str) -> Response:
    """Handle kcd2_start command."""
    success, error = self._kcd2_manager.start(command.log_path)
    
    if success:
        log_path = str(self._kcd2_manager.log_path) if self._kcd2_manager.log_path else None
        self._broadcast_event(event_kcd2_started(log_path or ""))
        return response_kcd2_start(True, log_path, req_id=command.req_id)
    else:
        return response_kcd2_start(False, error=error, req_id=command.req_id)


async def _cmd_kcd2_stop(self, command: Command, client_id: str) -> Response:
    """Handle kcd2_stop command."""
    success = self._kcd2_manager.stop()
    
    if success:
        self._broadcast_event(event_kcd2_stopped())
    
    return response_kcd2_stop(success, req_id=command.req_id)


async def _cmd_kcd2_status(self, command: Command, client_id: str) -> Response:
    """Handle kcd2_status command."""
    return response_kcd2_status(
        running=self._kcd2_manager.is_running,
        log_path=str(self._kcd2_manager.log_path) if self._kcd2_manager.log_path else None,
        events_received=self._kcd2_manager.events_received,
        last_event_ts=self._kcd2_manager.last_event_ts,
        last_event_type=self._kcd2_manager.last_event_type,
        req_id=command.req_id,
    )


async def _cmd_kcd2_get_mod_info(self, command: Command, client_id: str) -> Response:
    """Handle kcd2_get_mod_info command."""
    return response_kcd2_get_mod_info(
        mod_info=get_kcd2_mod_info(),
        req_id=command.req_id,
    )


def _on_kcd2_game_event(self, event_type: str, params: dict):
    """Callback when KCD2 game event is received."""
    self._broadcast_event(event_kcd2_game_event(event_type, params))
```

In the `_handle_command` method, add command routing:

```python
# In _handle_command, add to the command routing:
CommandType.KCD2_START: self._cmd_kcd2_start,
CommandType.KCD2_STOP: self._cmd_kcd2_stop,
CommandType.KCD2_STATUS: self._cmd_kcd2_status,
CommandType.KCD2_GET_MOD_INFO: self._cmd_kcd2_get_mod_info,
```

---

## Part 4: CLI Commands

### 4.1 Add CLI Subcommand Group

**File to modify:** `modern-third-space/src/modern_third_space/cli.py`

Add a new command group:

```python
@cli.group()
def kcd2():
    """Kingdom Come: Deliverance 2 integration commands."""
    pass


@kcd2.command()
@click.option('--log-path', help='Path to KCD2 log file (auto-detects if not specified)')
@click.option('--port', default=5050, help='Daemon port')
def start(log_path: Optional[str], port: int):
    """Start KCD2 integration."""
    import socket
    import json
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(('localhost', port))
        
        cmd = {"cmd": "kcd2_start"}
        if log_path:
            cmd["log_path"] = log_path
        
        sock.sendall(json.dumps(cmd).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        
        if result.get("success"):
            click.echo(f"✅ KCD2 integration started")
            if result.get("log_path"):
                click.echo(f"   Watching: {result['log_path']}")
        else:
            click.echo(f"❌ Failed to start: {result.get('message', 'Unknown error')}")
        
        sock.close()
    except ConnectionRefusedError:
        click.echo("❌ Cannot connect to daemon. Is it running?")
        click.echo("   Start with: python -m modern_third_space.cli daemon start")


@kcd2.command()
@click.option('--port', default=5050, help='Daemon port')
def stop(port: int):
    """Stop KCD2 integration."""
    import socket
    import json
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(('localhost', port))
        
        sock.sendall(json.dumps({"cmd": "kcd2_stop"}).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        
        if result.get("success"):
            click.echo("✅ KCD2 integration stopped")
        else:
            click.echo("❌ Failed to stop (may not have been running)")
        
        sock.close()
    except ConnectionRefusedError:
        click.echo("❌ Cannot connect to daemon. Is it running?")


@kcd2.command()
@click.option('--port', default=5050, help='Daemon port')
def status(port: int):
    """Check KCD2 integration status."""
    import socket
    import json
    from datetime import datetime
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(('localhost', port))
        
        sock.sendall(json.dumps({"cmd": "kcd2_status"}).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        
        if result.get("running"):
            click.echo("🎮 KCD2 Integration: RUNNING")
            click.echo(f"   Log file: {result.get('log_path', 'Unknown')}")
            click.echo(f"   Events received: {result.get('events_received', 0)}")
            
            if result.get("last_event_ts"):
                last_time = datetime.fromtimestamp(result["last_event_ts"])
                click.echo(f"   Last event: {result.get('last_event_type', 'Unknown')} at {last_time.strftime('%H:%M:%S')}")
        else:
            click.echo("🎮 KCD2 Integration: STOPPED")
        
        sock.close()
    except ConnectionRefusedError:
        click.echo("❌ Cannot connect to daemon. Is it running?")


@kcd2.command()
@click.option('--port', default=5050, help='Daemon port')
def mod_info(port: int):
    """Get KCD2 mod installation info."""
    import socket
    import json
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(('localhost', port))
        
        sock.sendall(json.dumps({"cmd": "kcd2_get_mod_info"}).encode() + b'\n')
        
        response = b''
        while b'\n' not in response:
            response += sock.recv(1024)
        
        result = json.loads(response.decode().strip())
        info = result.get("mod_info", {})
        
        click.echo(f"\n📦 {info.get('name', 'Third Space Haptics Mod')}")
        click.echo(f"   Version: {info.get('version', '1.0.0')}")
        click.echo(f"   {info.get('description', '')}")
        click.echo()
        click.echo("📁 Required Files:")
        for f in info.get("files", []):
            click.echo(f"   - {f}")
        click.echo()
        click.echo("📋 Installation Steps:")
        for step in info.get("install_instructions", []):
            click.echo(f"   {step}")
        click.echo()
        click.echo("🔧 Console Commands (in-game, prefix with #):")
        for cmd in info.get("console_commands", []):
            click.echo(f"   {cmd}")
        
        sock.close()
    except ConnectionRefusedError:
        click.echo("❌ Cannot connect to daemon. Is it running?")
```

---

## Part 5: UI Component

### 5.1 Create React Hook

**File:** `web/src/hooks/useKCD2Integration.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';

export interface KCD2Status {
  running: boolean;
  log_path?: string;
  events_received: number;
  last_event_ts?: number;
  last_event_type?: string;
}

export interface KCD2ModInfo {
  name: string;
  description: string;
  version: string;
  download_url: string;
  github_url: string;
  modding_docs: string;
  files: string[];
  install_instructions: string[];
  console_commands: string[];
}

export interface KCD2GameEvent {
  id: string;
  type: string;
  params?: Record<string, unknown>;
  ts: number;
}

export function useKCD2Integration() {
  const [status, setStatus] = useState<KCD2Status>({
    running: false,
    events_received: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<KCD2GameEvent[]>([]);
  const [modInfo, setModInfo] = useState<KCD2ModInfo | null>(null);

  // Fetch initial status and mod info
  useEffect(() => {
    fetchStatus();
    fetchModInfo();
  }, []);

  // Subscribe to daemon events
  useEffect(() => {
    const handleDaemonEvent = (event: CustomEvent) => {
      const data = event.detail;
      
      if (data.event === 'kcd2_started') {
        setStatus(prev => ({
          ...prev,
          running: true,
          log_path: data.log_path,
        }));
      } else if (data.event === 'kcd2_stopped') {
        setStatus(prev => ({
          ...prev,
          running: false,
        }));
      } else if (data.event === 'kcd2_game_event') {
        setGameEvents(prev => [
          {
            id: `${Date.now()}-${Math.random()}`,
            type: data.event_type,
            params: data.params,
            ts: data.ts * 1000,
          },
          ...prev.slice(0, 49), // Keep last 50 events
        ]);
        setStatus(prev => ({
          ...prev,
          events_received: (prev.events_received || 0) + 1,
          last_event_ts: data.ts,
          last_event_type: data.event_type,
        }));
      }
    };

    window.addEventListener('daemon-event', handleDaemonEvent as EventListener);
    return () => {
      window.removeEventListener('daemon-event', handleDaemonEvent as EventListener);
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await window.electronAPI.sendCommand({ cmd: 'kcd2_status' });
      if (response) {
        setStatus({
          running: response.running || false,
          log_path: response.log_path,
          events_received: response.events_received || 0,
          last_event_ts: response.last_event_ts,
          last_event_type: response.last_event_type,
        });
      }
    } catch (err) {
      console.error('Failed to fetch KCD2 status:', err);
    }
  }, []);

  const fetchModInfo = useCallback(async () => {
    try {
      const response = await window.electronAPI.sendCommand({ cmd: 'kcd2_get_mod_info' });
      if (response?.mod_info) {
        setModInfo(response.mod_info);
      }
    } catch (err) {
      console.error('Failed to fetch KCD2 mod info:', err);
    }
  }, []);

  const start = useCallback(async (logPath?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const cmd: Record<string, unknown> = { cmd: 'kcd2_start' };
      if (logPath) {
        cmd.log_path = logPath;
      }
      
      const response = await window.electronAPI.sendCommand(cmd);
      
      if (response?.success) {
        setStatus(prev => ({
          ...prev,
          running: true,
          log_path: response.log_path,
          events_received: 0,
        }));
      } else {
        setError(response?.message || 'Failed to start KCD2 integration');
      }
    } catch (err) {
      setError('Failed to communicate with daemon');
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await window.electronAPI.sendCommand({ cmd: 'kcd2_stop' });
      
      if (response?.success) {
        setStatus(prev => ({
          ...prev,
          running: false,
        }));
      } else {
        setError('Failed to stop KCD2 integration');
      }
    } catch (err) {
      setError('Failed to communicate with daemon');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearEvents = useCallback(() => {
    setGameEvents([]);
  }, []);

  return {
    status,
    loading,
    error,
    gameEvents,
    modInfo,
    start,
    stop,
    clearEvents,
    refreshStatus: fetchStatus,
  };
}
```

### 5.2 Create React Component

**File:** `web/src/components/KCD2IntegrationPanel.tsx`

```tsx
import { useState } from "react";
import { useKCD2Integration, KCD2GameEvent } from "../hooks/useKCD2Integration";

// Event type to display info mapping
const EVENT_INFO: Record<string, { label: string; icon: string; color: string }> = {
  PlayerDamage: { label: "Damage Taken", icon: "⚔️", color: "text-red-400" },
  PlayerDeath: { label: "Death", icon: "💀", color: "text-red-500" },
  PlayerHeal: { label: "Healing", icon: "💚", color: "text-green-400" },
  PlayerAttack: { label: "Attack", icon: "🗡️", color: "text-amber-400" },
  PlayerBlock: { label: "Block", icon: "🛡️", color: "text-blue-400" },
  PlayerHitEnemy: { label: "Hit Enemy", icon: "💥", color: "text-orange-400" },
  PlayerFall: { label: "Fall Damage", icon: "📉", color: "text-yellow-400" },
  CriticalHealth: { label: "Critical Health", icon: "❤️", color: "text-red-300" },
  LowStamina: { label: "Exhausted", icon: "😮‍💨", color: "text-yellow-300" },
  CombatStart: { label: "Combat Started", icon: "⚔️", color: "text-amber-300" },
  CombatEnd: { label: "Combat Ended", icon: "🕊️", color: "text-green-300" },
  Init: { label: "Initialized", icon: "✅", color: "text-green-400" },
  PlayerFound: { label: "Player Found", icon: "👤", color: "text-blue-400" },
};

function getEventInfo(type: string) {
  return EVENT_INFO[type] || { label: type, icon: "📡", color: "text-slate-400" };
}

function formatEventDetails(event: KCD2GameEvent): string {
  const params = event.params;
  if (!params) return "";
  
  if (event.type === "PlayerDamage") {
    const parts = [];
    if (params.damage) parts.push(`-${params.damage} HP`);
    if (params.direction) parts.push(String(params.direction));
    if (params.bodyPart) parts.push(String(params.bodyPart));
    return parts.join(", ");
  }
  if (event.type === "PlayerBlock") {
    return params.success === "true" ? "Successful" : "Failed";
  }
  if (event.type === "PlayerHeal") {
    return `+${params.amount} HP`;
  }
  return "";
}

export function KCD2IntegrationPanel() {
  const {
    status,
    loading,
    error,
    gameEvents,
    modInfo,
    start,
    stop,
    clearEvents,
  } = useKCD2Integration();

  const [showModInfo, setShowModInfo] = useState(false);

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Game Integration
          </p>
          <h2 className="text-xl font-semibold text-white">
            Kingdom Come: Deliverance 2
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
            status.running
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-500/20 text-slate-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status.running ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          {status.running ? "Watching" : "Stopped"}
        </span>
      </header>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Mod Info Banner */}
      {!status.running && modInfo && (
        <div className="mb-4 rounded-xl bg-amber-900/20 border border-amber-700/30 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-200 mb-1">
                ⚠️ Mod Required
              </h3>
              <p className="text-xs text-amber-300/80">
                Kingdom Come: Deliverance 2 requires the Third Space Haptics mod to be installed.
              </p>
            </div>
            <button
              onClick={() => setShowModInfo(!showModInfo)}
              className="ml-2 text-xs text-amber-400 hover:text-amber-300 underline"
            >
              {showModInfo ? "Hide" : "Setup Guide"}
            </button>
          </div>

          {/* Expandable mod info */}
          {showModInfo && (
            <div className="mt-3 space-y-3 border-t border-amber-700/30 pt-3">
              {/* Links */}
              <div className="flex gap-3 flex-wrap">
                <a
                  href={modInfo.modding_docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600"
                >
                  📖 Official Modding Docs
                </a>
                {modInfo.github_url && (
                  <a
                    href={modInfo.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    GitHub
                  </a>
                )}
              </div>

              {/* Install instructions */}
              <div className="text-xs text-amber-200/80 space-y-1">
                <p className="font-medium">Installation Steps:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-300/70">
                  {modInfo.install_instructions.map((step, i) => (
                    <li key={i}>{step.replace(/^\d+\.\s*/, "")}</li>
                  ))}
                </ol>
              </div>

              {/* Console commands */}
              <div className="text-xs">
                <p className="text-amber-200/80 mb-1">Console Commands (prefix with #):</p>
                <ul className="bg-slate-900/50 rounded px-2 py-1 text-slate-300 space-y-0.5">
                  {modInfo.console_commands.map((cmd, i) => (
                    <li key={i} className="font-mono text-xs">{cmd}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Path Display */}
      {status.log_path && (
        <div className="mb-4 rounded-xl bg-slate-900/50 p-3">
          <h3 className="text-sm font-medium text-slate-300 mb-1">
            Watching Game Log
          </h3>
          <p className="text-xs text-slate-500 truncate" title={status.log_path}>
            {status.log_path}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {!status.running ? (
            <button
              onClick={() => start()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600/80 px-4 py-2 font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {loading ? "Starting..." : "Start Watching"}
            </button>
          ) : (
            <button
              onClick={stop}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600/80 px-4 py-2 font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              {loading ? "Stopping..." : "Stop"}
            </button>
          )}
        </div>
        
        <p className="text-xs text-slate-500">
          💡 Start the game with the Third Space Haptics mod installed, then click "Start Watching"
        </p>
      </div>

      {/* Stats */}
      {status.running && (
        <div className="mb-4 flex gap-4 text-sm">
          <div className="rounded-lg bg-slate-700/30 px-3 py-2">
            <span className="text-slate-400">Events:</span>{" "}
            <span className="font-mono text-white">
              {status.events_received ?? 0}
            </span>
          </div>
          {status.last_event_ts && (
            <div className="rounded-lg bg-slate-700/30 px-3 py-2">
              <span className="text-slate-400">Last:</span>{" "}
              <span className="font-mono text-white">
                {new Date(status.last_event_ts * 1000).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Live Events */}
      <div className="rounded-xl bg-slate-900/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">Live Events</h3>
          {gameEvents.length > 0 && (
            <button
              onClick={clearEvents}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto">
          {gameEvents.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              {status.running
                ? "Waiting for game events... (play the game!)"
                : "Start watching to see live events"}
            </p>
          ) : (
            <ul className="space-y-1">
              {gameEvents.map((event) => {
                const info = getEventInfo(event.type);
                const details = formatEventDetails(event);
                return (
                  <li
                    key={event.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5 text-sm"
                  >
                    <span className="text-base">{info.icon}</span>
                    <span className={`font-medium ${info.color}`}>
                      {info.label}
                    </span>
                    {details && (
                      <span className="text-slate-400">({details})</span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">
                      {new Date(event.ts).toLocaleTimeString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
```

### 5.3 Register Component in Game Integration Page

**File to modify:** `web/src/components/GameIntegrationPage.tsx`

Add import:

```typescript
import { KCD2IntegrationPanel } from "./KCD2IntegrationPanel";
```

Add to the game list/grid:

```tsx
<KCD2IntegrationPanel />
```

---

## Testing Guide

### Test Commands

```bash
# 1. Start the daemon
cd modern-third-space
python3 -m modern_third_space.cli daemon start

# 2. Test daemon commands via netcat
echo '{"cmd":"kcd2_status"}' | nc localhost 5050
echo '{"cmd":"kcd2_get_mod_info"}' | nc localhost 5050

# 3. Start integration (will fail if game not installed)
echo '{"cmd":"kcd2_start"}' | nc localhost 5050

# 4. Run unit tests
cd modern-third-space
pytest tests/test_kcd2_manager.py -v

# 5. Test the UI
cd web
yarn dev
```

### Manual Testing Checklist

1. **Lua Script Testing**
   - [ ] Script loads without errors
   - [ ] Console commands work (`ts_init`, `ts_status`)
   - [ ] Test events appear in game log
   - [ ] Events trigger haptic feedback

2. **Python Manager Testing**
   - [ ] Parser correctly parses all event types
   - [ ] Haptic mapping produces correct cells/speeds
   - [ ] Log watcher detects new events
   - [ ] Auto-detect finds log path

3. **Daemon Integration Testing**
   - [ ] `kcd2_start` command works
   - [ ] `kcd2_stop` command works
   - [ ] `kcd2_status` returns correct state
   - [ ] Events broadcast to all clients

4. **UI Testing**
   - [ ] Panel renders correctly
   - [ ] Start/Stop buttons work
   - [ ] Live events display
   - [ ] Mod info shows correctly

---

## Submission Checklist

Before submitting your PR, verify:

### Files Created

- [ ] `modern-third-space/src/modern_third_space/server/kcd2_manager.py`
- [ ] `modern-third-space/tests/test_kcd2_manager.py`
- [ ] `web/src/hooks/useKCD2Integration.ts`
- [ ] `web/src/components/KCD2IntegrationPanel.tsx`
- [ ] Game mod files documented (not committed, provided as download)

### Files Modified

- [ ] `modern-third-space/src/modern_third_space/server/protocol.py` (add command/event types)
- [ ] `modern-third-space/src/modern_third_space/server/daemon.py` (add handlers)
- [ ] `modern-third-space/src/modern_third_space/cli.py` (add kcd2 commands)
- [ ] `web/src/components/GameIntegrationPage.tsx` (register panel)

### Tests Pass

```bash
# All tests should pass
cd modern-third-space
pytest tests/test_kcd2_manager.py -v

# Lint checks
cd web
yarn lint
```

### Documentation

- [ ] Code has docstrings
- [ ] Complex logic has comments
- [ ] PR description explains changes

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
| `Init` | `version`, `game` | Script initialization |
| `PlayerFound` | `health` | Player entity located |
| `PlayerDamage` | `damage`, `health`, `previous`, `direction`, `bodyPart`, `weaponType` | Player took damage |
| `PlayerDeath` | `lastHealth`, `cause` | Player died |
| `PlayerHeal` | `amount`, `health` | Player healed |
| `CriticalHealth` | `health` | Health below 20 |
| `PlayerAttack` | `weapon`, `type` | Player attacked |
| `PlayerBlock` | `success`, `direction`, `perfect` | Player blocked |
| `PlayerHitEnemy` | `damage`, `enemyType`, `weapon` | Player hit enemy |
| `PlayerFall` | `damage`, `height` | Player fell |
| `LowStamina` | `stamina` | Stamina below 15 |
| `CombatStart` | | Combat started |
| `CombatEnd` | | Combat ended |

### Vest Cell Layout

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

- **Official KCD2 Modding Tools:** https://warhorse.youtrack.cloud/articles/KM-A-55/The-Modding-Tools
- **KCD Modding Community:** https://www.nexusmods.com/kingdomcomedeliverance2
- **CryEngine Lua Reference:** https://docs.cryengine.com/
- **Project Reference (Alyx Integration):** `docs-external-integrations-ideas/ALYX_INTEGRATION.md`
- **Daemon Protocol:** `docs-external-integrations-ideas/DAEMON_ARCHITECTURE.md`

---

## Changelog

- **2024-12**: Initial complete implementation guide
