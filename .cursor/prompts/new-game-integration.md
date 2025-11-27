# New Game Integration Workflow

Load this prompt when adding haptic support for a new game: `@.cursor/prompts/new-game-integration.md`

---

@.cursorrules @CHANGELOG.md @docs-external-integrations-ideas/DAEMON_ARCHITECTURE.md

## 🎮 Game Integration Assistant

I'll help you add haptic feedback support for a new game to the Third Space Vest project.

---

## Step 1: Research Existing Haptic Integrations

**Please provide the game name**, and I will search for existing bHaptics and OWO mods to learn from.

### 1.1 Check Local Repository

First, check if we already have mod sources downloaded:

```
misc-documentations/bhaptics-svg-24-nov/{game-name}/
```

This folder contains downloaded bHaptics/OWO mod sources for various games that we can analyze.

### 1.2 Search GitHub for Existing Mods

**bHaptics Mods** (typically C# Unity mods):
- GitHub: `https://github.com/floh-bhaptics` (main contributor)
- Search: `https://github.com/search?q={game-name}+bhaptics`
- Pattern: MelonLoader/BepInEx mods that send events to bHaptics Player

**OWO Mods** (typically C# Unity mods):
- GitHub: `https://github.com/OWODevelopers` (official)
- Search: `https://github.com/search?q={game-name}+OWO`
- Game pages: `https://owogame.com/game/{game-name}/`
- Pattern: MelonLoader mods with `.owo` effect files

### 1.3 Analyze What We Can Learn

From existing mods, extract:

| Information | What to Look For |
|-------------|------------------|
| **Events** | What game events trigger haptics (damage, death, recoil, etc.) |
| **Hooks** | Which game classes/methods are patched (Harmony patches) |
| **Intensity** | How they scale intensity (damage amount, weapon type) |
| **Direction** | How they determine directional feedback (damage angle) |
| **Timing** | Effect durations and patterns |

### 1.4 Adapt for Our Vest

Our vest has **8 cells** vs bHaptics TactSuit (40 motors) or OWO (10 muscle zones):

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  │ UL  │ UR  │          │ UL  │ UR  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  │ LL  │ LR  │          │ LL  │ LR  │
  └─────┴─────┘          └─────┴─────┘
```

Map their complex patterns to our simpler 8-cell layout.

---

## Step 2: Determine Integration Method

Based on research, identify how to connect to the game:

| Method | When to Use | Example |
|--------|-------------|---------|
| **Official API (GSI)** | Game has telemetry API | CS2 (HTTP JSON posts) |
| **Log File Watching** | Game/mod writes to console.log | HL:Alyx (`-condebug` flag) |
| **MelonLoader Mod** | Unity game, no official API | SUPERHOT VR, Pistol Whip |
| **BepInEx Mod** | Unity game (alternative to MelonLoader) | Various VR games |
| **TCP/UDP Client** | Game exposes telemetry port | SimHub (telemetry relay) |

### Create Strategy Document

**File**: `docs-external-integrations-ideas/{GAME}_INTEGRATION.md`

Include:
- Overview and architecture diagram
- **What we learned from bHaptics/OWO mods** (events, hooks, patterns)
- Integration method chosen and why
- Event-to-haptic mapping table (adapted for 8 cells)
- Setup requirements for users
- Implementation plan with phases

---

## Step 3: Implementation

Following the existing patterns:

### Integration Types

| Type | Example | Python Location | Key Pattern |
|------|---------|-----------------|-------------|
| **HTTP Push (GSI)** | CS2 | `integrations/cs2_gsi.py` | HTTP server receives JSON posts |
| **Log File Watching** | HL:Alyx | `server/alyx_manager.py` | Poll console.log for `[Tactsuit]` events |
| **MelonLoader Mod** | Superhot VR | See `MELONLOADER_INTEGRATION_STRATEGY.md` | Mod logs events → Python watches |
| **TCP Client** | Custom | `integrations/base.py` | Connect to game's telemetry server |

### Files to Create

```
modern-third-space/src/modern_third_space/
├── server/{game}_manager.py       # Embedded manager (if log/file based)
├── integrations/{game}.py         # Standalone integration (if HTTP/TCP based)

web/src/components/
├── {Game}IntegrationPanel.tsx     # React UI component

web/src/hooks/
├── use{Game}Integration.ts        # React state hook

web/electron/ipc/
├── {game}Handlers.cjs             # IPC handlers

docs-external-integrations-ideas/
├── {GAME}_INTEGRATION.md          # Strategy and setup docs
```

### Daemon Protocol Updates

Add to `server/protocol.py`:
- `{game}_start`, `{game}_stop`, `{game}_status` commands
- `{game}_started`, `{game}_stopped`, `{game}_event` events

Add handlers to `server/daemon.py`

---

## Step 4: Event Mapping

Design the haptic feedback mapping:

```python
# Example mapping structure
EVENT_MAPPINGS = {
    "player_damage": {
        "cells": "directional",  # Use damage angle
        "intensity": "scaled",   # Based on damage amount
        "duration_ms": 200
    },
    "player_death": {
        "cells": [0, 1, 2, 3, 4, 5, 6, 7],  # All cells
        "intensity": 10,  # Max
        "duration_ms": 500
    },
    "weapon_fire": {
        "cells": [0, 1],  # Front upper (recoil)
        "intensity": 3,
        "duration_ms": 100
    }
}
```

### Vest Cell Layout Reference (Hardware Indices)

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  │ UL  │ UR  │          │ UL  │ UR  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  │ LL  │ LR  │          │ LL  │ LR  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R
```

Use constants from `vest/cell_layout.py`:
- `Cell.FRONT_UPPER_LEFT` = 2, `Cell.FRONT_UPPER_RIGHT` = 5
- `Cell.FRONT_LOWER_LEFT` = 3, `Cell.FRONT_LOWER_RIGHT` = 4
- `Cell.BACK_UPPER_LEFT` = 1, `Cell.BACK_UPPER_RIGHT` = 6
- `Cell.BACK_LOWER_LEFT` = 0, `Cell.BACK_LOWER_RIGHT` = 7

---

## Reference Resources

### Existing Integrations (in this repo)

| Game | Manager | Docs | Status |
|------|---------|------|--------|
| CS2 | `server/cs2_manager.py` | `CS2_INTEGRATION.md` | ✅ Done |
| HL:Alyx | `server/alyx_manager.py` | `ALYX_INTEGRATION.md` | ✅ Done |
| SUPERHOT VR | `server/superhot_manager.py` | `SUPERHOTVR_INTEGRATION.md` | ✅ Done |
| SimHub | `simhub-plugin/` (C#) | `SIMHUB_IRACING_INTEGRATION.md` | ✅ Done |
| Pistol Whip | - | `PISTOLWHIP_INTEGRATION.md` | 📋 Planned |

### bHaptics/OWO Research Sources

**Local mod sources** (already downloaded):
- `misc-documentations/bhaptics-svg-24-nov/` - Contains source code for various games

**GitHub - bHaptics mods**:
- https://github.com/floh-bhaptics (main contributor, many games)
- Search: `{game-name} bhaptics site:github.com`

**GitHub - OWO mods**:
- https://github.com/OWODevelopers (official integrations)
- Game list: https://owogame.com/games/

**Documentation**:
- [bHaptics Notion](https://bhaptics.notion.site/8537ae39fda74d7393e5d863be8472c5?v=251e05a62774418c985a7827bb211a38)
- [MelonLoader Wiki](https://melonwiki.xyz/)
- [BepInEx Docs](https://docs.bepinex.dev/)

### In-Repo Documentation
- `misc-documentations/reverse-eng-doc/SUMMARY.md` - Vest protocol & cell layout
- `docs-external-integrations-ideas/CELL_MAPPING_AUDIT.md` - Cell mapping reference
- `docs-external-integrations-ideas/EFFECTS_LIBRARY.md` - Predefined SDK effects

---

## Ready?

**Tell me the game name** and I'll:
1. Check if we have existing resources for it
2. Research the best integration approach
3. Create a strategy document
4. Implement the integration step by step

