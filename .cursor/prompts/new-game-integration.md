# New Game Integration Workflow

Load this prompt when adding haptic support for a new game: `@.cursor/prompts/new-game-integration.md`

---

@.cursorrules @CHANGELOG.md @docs-external-integrations-ideas/DAEMON_ARCHITECTURE.md

## 🎮 Game Integration Assistant

I'll help you add haptic feedback support for a new game to the Third Space Vest project.

---

## Step 1: Gather Information

**Please provide the game name**, and I will:

1. **Search for existing resources** in:
   - `misc-documentations/bhaptics-svg-24-nov/` (bHaptics/OWO mod sources)
   - `docs-external-integrations-ideas/` (strategy docs)

2. **Research integration methods** for this game:
   - Official APIs (GSI, telemetry, etc.)
   - Existing haptic mods (bHaptics, OWO, buttplug.io)
   - MelonLoader/BepInEx mod frameworks
   - Console log output patterns
   - Memory reading approaches

3. **Identify available resources**:
   - NexusMods pages
   - GitHub repositories
   - Community guides

---

## Step 2: Document the Approach

Based on research, I'll create a strategy document:

**File**: `docs-external-integrations-ideas/{GAME}_INTEGRATION.md`

Contents:
- Overview and architecture diagram
- Integration method (GSI vs log file vs mod)
- Event-to-haptic mapping table
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

### Vest Cell Layout Reference

```
  FRONT          BACK
┌───┬───┐    ┌───┬───┐
│ 0 │ 1 │    │ 4 │ 5 │  Upper
├───┼───┤    ├───┼───┤
│ 2 │ 3 │    │ 6 │ 7 │  Lower
└───┴───┘    └───┴───┘
```

---

## Reference Resources

### Existing Integrations (in this repo)
- **CS2**: `integrations/cs2_gsi.py` + `docs-external-integrations-ideas/CS2_INTEGRATION.md`
- **HL:Alyx**: `server/alyx_manager.py` + `docs-external-integrations-ideas/ALYX_INTEGRATION.md`

### External References
- [bHaptics Notion](https://bhaptics.notion.site/8537ae39fda74d7393e5d863be8472c5?v=251e05a62774418c985a7827bb211a38)
- [OWO Game Integrations](https://github.com/OWODevelopers)
- [MelonLoader Wiki](https://melonwiki.xyz/)
- [Buttplug.io (generic haptics)](https://buttplug.io/)

### In-Repo Documentation
- `misc-documentations/bhaptics-svg-24-nov/` - Mod sources for reference
- `docs-external-integrations-ideas/MELONLOADER_INTEGRATION_STRATEGY.md` - MelonLoader approach

---

## Ready?

**Tell me the game name** and I'll:
1. Check if we have existing resources for it
2. Research the best integration approach
3. Create a strategy document
4. Implement the integration step by step

