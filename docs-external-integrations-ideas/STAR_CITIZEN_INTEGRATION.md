# Star Citizen Integration

## Status: 🔍 RESEARCH PHASE

## Overview

Star Citizen is a space simulation MMO developed by Cloud Imperium Games (CIG). The game features:
- Space combat (ships, weapons, shields)
- FPS combat (ground combat, weapons, armor)
- Realistic damage system
- Death and respawn mechanics
- Multiplayer PvP and PvE

**Key Game Features:**
- Ship combat (weapons, shields, damage)
- FPS combat (weapons, armor, health)
- Death events (player death, kills, NPC deaths)
- Directional damage information
- Weapon and ship tracking

## Engine & Modding Framework

### CryEngine (Modified)

Star Citizen uses a **modified CryEngine** (similar to Kingdom Come: Deliverance).

| Aspect | Details |
|--------|---------|
| **Engine** | CryEngine (modified) |
| **Modding** | Limited - no official modding support |
| **API** | No official public API for telemetry |
| **Log Files** | ✅ **Game.log** - Comprehensive event logging |

## Integration Approach: Log File Watching ⭐⭐⭐ (RECOMMENDED)

**Complexity: MEDIUM** | **Feasibility: HIGH**

**Key Discovery:** Star Citizen writes comprehensive events to `Game.log` file. Community tools (VerseWatcher, citizenmon) already parse this file successfully.

### How It Works

1. **Star Citizen writes Game.log** - Located in game installation directory
2. **File watcher** - Python watches Game.log for new events
3. **Event parsing** - Parse death/kill events using regex patterns
4. **Haptic mapping** - Map events to vest cells (with directional support)
5. **TCP to daemon** - Send events to daemon

```
┌─────────────────────────────────────────────────────────┐
│  Star Citizen                                           │
│  • Writes events to Game.log                            │
│  • Location: {game_dir}/Game.log                       │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file writes
┌─────────────────────────────────────────────────────────┐
│  Game.log                                               │
│  • Death events (player, NPC, suicide)                  │
│  • Kill events                                          │
│  • Directional damage information                        │
│  • Weapon and ship data                                 │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file watcher
┌─────────────────────────────────────────────────────────┐
│  Python Integration                                     │
│  • Watches Game.log (like HL:Alyx)                      │
│  • Parses death/kill events                             │
│  • Extracts direction vectors                           │
│  • Maps events → vest cells                            │
│  • TCP to daemon                                       │
└─────────────────────────────────────────────────────────┘
```

**Advantages:**
- ✅ **No mod required** - Works with vanilla game
- ✅ **Real-time** - File watcher detects changes instantly
- ✅ **Simple** - Similar to HL:Alyx integration
- ✅ **Directional data** - Death events include direction vectors!
- ✅ **Proven approach** - VerseWatcher and citizenmon already use this
- ✅ **No API calls** - Pure local file access
- ✅ **No anti-cheat risk** - Passive file reading

**Challenges:**
- ❓ Need to find Game.log location (varies by installation)
- ❓ Log files can grow very large (need efficient tailing)
- ❓ Log format may change with game updates
- ❓ Need to handle log rotation (new Game.log on each launch)

## Game Events Available

### Death Event Pattern

Based on VerseWatcher code analysis, Star Citizen logs death events in this format:

```
[timestamp] [Notice] <Actor Death> CActor::Kill: 'victim_name' [id] in zone 'ship' killed by 'killer_name' [id] using 'weapon' [...] with damage type 'type' from direction x: ..., y: ..., z: ...
```

**Regex Pattern** (from VerseWatcher):
```python
death_pattern = re.compile(
    r"^(?P<timestamp>\S+)\s+\[Notice\]\s+<Actor Death> CActor::Kill:\s+"
    r"\'(?P<vname>[^\']+)\'\s+\[\d+\]\s+in zone\s+\'(?P<vship>[^\']+)\'\s+"
    r"killed by\s+\'(?P<kname>[^\']+)\'\s+\[\d+\]\s+using\s+\'(?P<kwep>[^\']+)\'\s+"
    r"\[[^\]]*\]\s+with damage type\s+\'(?P<dtype>[^\']+)\'\s+from direction x:\s*"
    r"(?P<dirvecx>[^,]+),\s*y:\s*(?P<dirvecy>[^,]+),\s*z:\s*(?P<dirvecz>[^\s]+)"
    r"\s+\[Team_ActorTech\]\[Actor\]$"
)
```

### Event Types

1. **Player Death** - Player was killed
   - Victim = player name
   - Killer = attacker name
   - Weapon, ship, damage type
   - **Direction vector** (x, y, z) - for directional haptics!

2. **Player Kill** - Player killed someone
   - Victim = target name
   - Killer = player name
   - Weapon, ship, damage type

3. **NPC Death** - NPC was killed
   - Victim or killer contains "NPC" or starts with "PU_"

4. **Suicide** - Player committed suicide
   - Victim = killer = player name

### Additional Events (Potential)

- Health changes (if logged)
- Shield damage (if logged)
- Ship damage (if logged)
- Other combat events (if logged)

**Research Needed:** Explore Game.log for additional event types beyond death/kill.

## Haptic Mapping Strategy

### Death Event → Vest Cell Mapping

**Key Feature:** Death events include **direction vectors** (x, y, z)!

We can map direction to vest cells:

```
Direction Vector (x, y, z) → Vest Cell(s)
─────────────────────────────────────────
Front (positive z)          → Front cells (2, 5, 3, 4)
Back (negative z)           → Back cells (1, 6, 0, 7)
Left (negative x)           → Left cells (2, 3, 1, 0)
Right (positive x)          → Right cells (5, 4, 6, 7)
Top (positive y)            → Upper cells (2, 5, 1, 6)
Bottom (negative y)         → Lower cells (3, 4, 0, 7)
```

**Direction Calculation:**
1. Normalize direction vector
2. Determine primary direction (front/back, left/right, up/down)
3. Map to appropriate vest cells
4. Scale intensity based on damage type

### Event Intensity Scaling

- **Player Death**: High intensity (7-9), all affected cells
- **Player Kill**: Medium intensity (5-7), front cells
- **NPC Death**: Low intensity (3-5), single cell
- **Suicide**: Medium intensity (5-7), all cells

### Damage Type Scaling

Different damage types could have different intensities:
- **Ballistic**: Sharp pulse (high intensity)
- **Energy**: Sustained pulse (medium intensity)
- **Explosive**: Full vest pulse (high intensity)
- **Environmental**: Varies by type

## Implementation Plan

### Phase 1: Log File Watcher (Similar to HL:Alyx)

1. **Create Game.log Watcher**
   - File: `modern-third-space/src/modern_third_space/server/starcitizen_manager.py`
   - Watch Game.log for new lines
   - Handle log rotation (new file on game restart)
   - Efficient tailing (seek to end, read new content)

2. **Event Parser**
   - Parse death event regex pattern
   - Extract: victim, killer, weapon, ship, damage type, direction
   - Identify event type (player death, kill, NPC, suicide)

3. **Direction Mapping**
   - Convert direction vector (x, y, z) to vest cells
   - Handle edge cases (diagonal directions)

### Phase 2: Daemon Integration

4. **Daemon Manager**
   - Add `StarCitizenManager` to daemon
   - Register callbacks for events and triggers
   - Add protocol commands: `starcitizen_start`, `starcitizen_stop`, `starcitizen_status`

5. **Protocol Updates**
   - Add to `server/protocol.py`:
     - `STARCITIZEN_START`, `STARCITIZEN_STOP`, `STARCITIZEN_STATUS` commands
     - `STARCITIZEN_STARTED`, `STARCITIZEN_STOPPED`, `STARCITIZEN_GAME_EVENT` events

### Phase 3: Electron UI

6. **React Components**
   - `StarCitizenIntegrationPanel.tsx` - UI component
   - `useStarCitizenIntegration.ts` - React hook
   - Display events, status, controls

7. **IPC Handlers**
   - `starcitizenHandlers.cjs` - Electron IPC handlers
   - Game.log path selection
   - Auto-detect game directory

## Game.log Location

**Default Locations** (need to verify):
- **Windows**: `{StarCitizenInstallDir}/Game.log`
- **Windows (RSI Launcher)**: `C:\Program Files\Roberts Space Industries\StarCitizen\LIVE\Game.log`
- **Windows (Steam)**: `{SteamLibrary}/steamapps/common/StarCitizen/Game.log`

**Log Rotation:**
- New `Game.log` created on each game launch
- Old logs moved to `logbackups/` folder

## Research Tasks

### Immediate (Phase 1)

1. **Game.log Analysis**
   - [ ] Find exact Game.log location(s)
   - [ ] Document full log format
   - [ ] Identify all available event types
   - [ ] Test direction vector accuracy
   - [ ] Check for health/shield/damage events (beyond death)

2. **Event Parsing**
   - [ ] Test death event regex pattern
   - [ ] Verify direction vector extraction
   - [ ] Test NPC detection logic
   - [ ] Handle edge cases (suicide, environmental deaths)

3. **Direction Mapping**
   - [ ] Implement direction vector → vest cell mapping
   - [ ] Test with various direction vectors
   - [ ] Calibrate intensity scaling

### Future (Phase 2)

4. **Python Integration**
   - [ ] Create Game.log watcher (similar to HL:Alyx)
   - [ ] Implement event parser
   - [ ] Integrate with daemon

5. **Testing**
   - [ ] Test in-game with various scenarios
   - [ ] Calibrate intensity levels
   - [ ] Test direction mapping accuracy
   - [ ] Verify log rotation handling

## Resources

- **VerseWatcher**: https://github.com/PINKgeekPDX/VerseWatcher - Python tool that parses Game.log
- **citizenmon**: https://github.com/danieldeschain/citizenmon - Go tool that parses Game.log
- **Star Citizen Wiki**: https://starcitizen.tools/ - Game information
- **VerseWatcher Source**: `misc-documentations/bhaptics-svg-24-nov/star-citizen/VerseWatcher-main/`
- **citizenmon Source**: `misc-documentations/bhaptics-svg-24-nov/star-citizen/citizenmon-main/`

## Notes

- **⚠️ No Official API**: Star Citizen has no official telemetry API. Log file watching is the only viable approach.
- **Log File Size**: Game.log can grow very large. Need efficient tailing (seek to end, read only new content).
- **Log Rotation**: New Game.log created on each launch. Need to handle file recreation.
- **Direction Vectors**: Death events include direction information - this enables directional haptic feedback!
- **Proven Approach**: VerseWatcher and citizenmon already successfully parse Game.log, proving this approach works.

## Next Steps

1. **Analyze Game.log** - Examine actual log file to verify event format
2. **Test Direction Mapping** - Verify direction vectors can be mapped to vest cells
3. **Create Log Watcher** - Implement file watcher (similar to HL:Alyx)
4. **Implement Event Parser** - Parse death events and extract data
5. **Integrate with Daemon** - Add StarCitizenManager to daemon

