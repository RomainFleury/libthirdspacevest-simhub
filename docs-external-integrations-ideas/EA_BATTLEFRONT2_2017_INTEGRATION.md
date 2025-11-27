# EA Star Wars Battlefront 2 (2017) Haptic Integration

> **Status: 🔬 RESEARCH / HIGH COMPLEXITY**
>
> EA Battlefront 2 (2017) uses Frostbite engine with Frosty Mod tooling. This is a complex modding ecosystem with limited event hooking capabilities.

## Game Engine & Modding

| Aspect | EA Battlefront 2 (2017) |
|--------|-------------------------|
| **Engine** | Frostbite Engine (DICE) |
| **Mod Tool** | Frosty Tool Suite (Editor + Mod Manager) |
| **Mod Format** | `.fbmod` archives (binary) |
| **Modding Type** | Asset modification, UI changes, limited scripting |
| **Scripting** | Limited C# scripting (if supported) |

## Key Resources

- **Frosty Tool Suite**: [frostytoolsuitedev.gitlab.io](https://frostytoolsuitedev.gitlab.io/downloads)
- **SWBF2 Frosty Editor Wiki**: [swbf2frosty.wiki.gg](https://swbf2frosty.wiki.gg/)
- **Battlefront Modding Server Wiki**: [battlefront-modding-server.fandom.com](https://battlefront-modding-server.fandom.com/wiki/Frosty_Tool_Suite)
- **Nexus Mods**: [nexusmods.com/starwarsbattlefront22017](https://www.nexusmods.com/starwarsbattlefront22017/mods)

## What We Know

### Existing Mods Analysis

From the folder contents, we have examples of:
- **NoAutoZoom.fbmod** - UI modification
- **BetterHitmarkers.fbmod** - UI/HUD modification
- **Debugger mod** - Shows coordinates/speed (UI overlay)

**Key Finding:** Most mods are **UI/asset modifications**, not event-driven scripts.

### Frosty Mod Capabilities

Frosty Mod primarily allows:
1. **Asset Modification** - Edit textures, models, sounds
2. **UI Changes** - Modify HUD elements, menus
3. **Configuration Tweaks** - Change game parameters
4. **Limited Scripting** - C# scripts (if engine supports)

**Limitation:** Frostbite engine is notoriously difficult to mod. It's designed to be closed-source and doesn't expose event hooks easily.

---

## Integration Approaches

### Approach 1: Screen Capture + Pixel Analysis (RECOMMENDED) ⭐⭐⭐

**Complexity: LOW-MEDIUM** | **Feasibility: VERY HIGH**

**Key Insight:** Instead of modding the game, we can **capture screen pixels** and detect the red damage indicator visually!

**How it works:**
1. **Screen capture** - Capture edge regions of the game window
2. **Pixel analysis** - Detect red tint on screen edges
3. **Direction detection** - Which edge has red = damage direction
4. **Intensity detection** - How red = damage amount
5. **Write to file** - Output damage events
6. **Python watches file** - Daemon processes events

```
┌─────────────────────────────────────────────────────────┐
│  EA Battlefront 2 (2017)                                │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Game Window (with red damage indicator)        │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ screen capture
┌─────────────────────────────────────────────────────────┐
│  Python Screen Capture Module                          │
│  • Captures edge pixels (left, right, top, bottom)    │
│  • Analyzes RGB values for red tint                    │
│  • Detects which edge has red (direction)              │
│  • Measures intensity (how red)                       │
│  • Writes: "DAMAGE|left|75"                           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ writes events
┌─────────────────────────────────────────────────────────┐
│  haptic_events.log                                       │
│  DAMAGE|left|75                                         │
│  DAMAGE|right|50                                         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file watcher
┌─────────────────────────────────────────────────────────┐
│  Python Integration                                     │
│  • File watcher                                         │
│  • Direction → Vest cell mapping                        │
│  • TCP to daemon                                       │
└─────────────────────────────────────────────────────────┘
```

**Advantages:**
- ✅ **No game modification needed** - Works with any game
- ✅ **No Frosty modding knowledge required** - Much simpler
- ✅ **Universal approach** - Can work for other games too
- ✅ **Easy to test** - Just capture screen and analyze
- ✅ **Non-invasive** - Doesn't modify game files
- ✅ **Works with any game version** - Not affected by updates

**Implementation:**
- Use Python libraries: `mss` (screen capture) or `PIL` + `pyautogui`
- Capture small edge regions (e.g., 10-20px wide strips)
- Analyze RGB values - detect red tint (high R, low G/B)
- Monitor edges continuously (30-60 FPS)
- Detect when red appears and which edge

**Libraries:**
- `mss` - Fast screen capture
- `PIL/Pillow` - Image processing
- `numpy` - Array operations for pixel analysis
- `opencv-python` - Advanced image processing (optional)

**Challenges:**
- Need to identify game window (handle resolution changes)
- May need to filter out UI elements (HUD, menus)
- Performance - screen capture has overhead
- False positives - other red elements on screen

### Approach 2: Frosty Mod - Damage Indicator Hook (Alternative)

**Complexity: HIGH** | **Feasibility: MEDIUM**

**Key Insight:** EA Battlefront 2 shows a **red filter/damage indicator** on the screen corner corresponding to the direction of incoming damage. We can hook into this visual effect via modding!

**Visual Confirmation:** Screenshot `vf-2-damage.PNG` shows:
- Red tint/overlay appears on the **left side** of the screen when taking damage from the left
- The red filter is a screen-space effect (overlay, not a corner widget)
- It appears to be a gradient/fade effect from the edge inward
- Intensity likely correlates with damage amount (darker red = more damage)

**How it works:**
1. **Hook into UI rendering** - Detect when the red damage indicator appears
2. **Extract direction** - The corner where it appears = damage direction
3. **Write to file** - Output damage event with direction
4. **Python watches file** - Daemon processes events

```
┌─────────────────────────────────────────────────────────┐
│  EA Battlefront 2 (2017)                                │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Frosty Mod (UI Hook)                           │   │
│  │  - Monitors red damage indicator                │   │
│  │  - Detects which corner (direction)             │   │
│  │  - Writes: "DAMAGE|top_left|intensity"         │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ writes events
┌─────────────────────────────────────────────────────────┐
│  haptic_events.log                                       │
│  DAMAGE|top_left|75                                      │
│  DAMAGE|bottom_right|50                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file watcher
┌─────────────────────────────────────────────────────────┐
│  Python Integration                                     │
│  • File watcher                                         │
│  • Direction → Vest cell mapping                        │
│  • TCP to daemon                                       │
└─────────────────────────────────────────────────────────┘
```

**Advantages:**
- ✅ Uses existing game feature (damage indicator)
- ✅ Provides directional information automatically
- ✅ No need to reverse-engineer game events
- ✅ Visual effect = reliable trigger

**Implementation:**
- Hook into UI rendering pipeline
- Detect red filter overlay appearance
- Map screen edge position to direction:
  - **Left edge** = Left side damage (Front-left or Back-left)
  - **Right edge** = Right side damage (Front-right or Back-right)
  - **Top edge** = Front damage
  - **Bottom edge** = Back damage
  - **Corner combinations** = Diagonal damage (e.g., top-left = front-left)

**Note from Screenshot:** The red filter appears as a **screen-space overlay** on the edge where damage comes from, not just a corner widget. This suggests it might be a shader effect or post-process overlay.

**Challenges:**
- Need to understand Frosty UI modification system
- May need to hook into shader/rendering code
- Need to detect intensity (how red = how much damage)

### Approach 2: UI Overlay + File Output (Alternative)

**Complexity: HIGH** | **Feasibility: MEDIUM**

Create a UI overlay mod that:
1. Monitors player health/damage via UI elements
2. Writes events to a file
3. Python daemon watches the file

```
┌─────────────────────────────────────────────────────────┐
│  EA Battlefront 2 (2017)                                 │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Frosty Mod (UI Overlay)                         │   │
│  │  - Monitors health bar changes                   │   │
│  │  - Detects damage/death via UI                   │   │
│  │  - Writes events to file                         │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ writes events
┌─────────────────────────────────────────────────────────┐
│  haptic_events.log                                       │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ file watcher
┌─────────────────────────────────────────────────────────┐
│  Python Integration                                     │
│  • File watcher                                         │
│  • Event parser                                        │
│  • TCP to daemon                                       │
└─────────────────────────────────────────────────────────┘
```

**Challenges:**
- Need to reverse-engineer UI element access
- May need to hook into UI rendering pipeline
- Limited documentation on UI scripting

### Approach 2: Memory Reading (Not Recommended)

**Complexity: EXTREME** | **Feasibility: LOW**

Read player health/damage directly from game memory.

**Problems:**
- Breaks with every game update
- May trigger anti-cheat (FairFight/EAC)
- Extremely fragile
- Ethical concerns

### Approach 3: Log File Watching

**Complexity: LOW** | **Feasibility: UNKNOWN**

Check if EA Battlefront 2 outputs any log files with gameplay events.

**To investigate:**
- Check `%LOCALAPPDATA%\Star Wars Battlefront II\`
- Check game installation directory for logs
- Try launch arguments: `-log`, `-verbose`, `-debug`

### Approach 4: Network Traffic Analysis

**Complexity: MEDIUM** | **Feasibility: LOW**

Intercept network packets to detect damage/death events.

**Problems:**
- Only works in multiplayer
- Encrypted traffic
- Complex packet parsing
- May violate ToS

---

## Research Needed

### 1. Damage Indicator System Analysis ⭐ (PRIORITY)

**Key Research:**
- **Find the UI element/shaders** that render the red damage filter
- **Understand the rendering system** - How is the edge/corner position determined?
- **Check intensity values** - Is the red intensity accessible? (darker red = more damage?)
- **Test different damage sources** - Does direction always match indicator?
- **Analyze screenshot** - The red filter appears as a screen-space overlay on the left edge
- **Determine detection method** - Can we detect which edge has the red tint? Is it a shader or UI element?

**Files to investigate:**
- UI shader files (if accessible via Frosty)
- HUD widget files (similar to debugger mod files)
- Damage system files

**Questions:**
- Which UI file controls the damage indicator?
- Can we hook into its rendering function?
- Is the corner position stored as a variable we can read?
- Can we detect when it appears/disappears?

### 2. Frosty Editor UI Modification

**Questions:**
- How do UI mods work? (Analyze BetterHitmarkers, Debugger)
- Can we inject code into UI rendering?
- Can we read UI state values?
- Can we write to files from UI code?

**Investigation:**
- Analyze existing UI mods to understand structure
- Check if they can access game state or just modify visuals
- Test if we can add file I/O to UI code

### 3. Frosty Editor Scripting Capabilities

**Questions:**
- Does Frosty Editor support C# scripting?
- Can scripts hook into rendering pipeline?
- Are there any event callbacks available?
- Can scripts write to files?

**Resources to check:**
- [SWBF2 Frosty Editor Wiki](https://swbf2frosty.wiki.gg/)
- Frosty Editor documentation
- Community forums/Discord

### 3. Log File Investigation

**Locations to check:**
```
%LOCALAPPDATA%\Star Wars Battlefront II\
%APPDATA%\Star Wars Battlefront II\
SteamLibrary\steamapps\common\STAR WARS Battlefront II\
```

**Commands to try:**
```powershell
Get-ChildItem "$env:LOCALAPPDATA\Star Wars Battlefront II" -Recurse -Filter "*.log"
Get-ChildItem "$env:APPDATA\Star Wars Battlefront II" -Recurse -Filter "*.log"
```

### 4. Existing Haptic Mods

**Search:**
- Nexus Mods for "haptic", "tactile", "vibration"
- ModDB for similar mods
- Community forums

**Status:** No haptic mods found (per README)

---

## Implementation Plan

### Phase 0: Feasibility Study (Current)

1. **Research Frosty Editor scripting**
   - Check if C# scripts are supported
   - Understand event hooking capabilities
   - Review existing script mods (if any)

2. **Analyze existing mods**
   - Decompile/reverse-engineer UI mods
   - Understand how they access game state
   - Learn Frosty mod structure

3. **Check log files**
   - Look for gameplay events in logs
   - Test launch arguments for verbose logging

4. **Community research**
   - Join Frosty modding Discord
   - Ask about event hooking capabilities
   - Check if anyone has attempted similar mods

### Phase 1: Prototype - Screen Capture Approach ⭐

1. **Set up screen capture**
   - Install libraries: `mss`, `PIL`, `numpy`
   - Create function to capture game window
   - Handle window detection (find by title or process)

2. **Implement edge detection**
   - Capture edge regions (left, right, top, bottom)
   - Analyze pixels for red tint (RGB threshold)
   - Detect which edge has red
   - Measure intensity (how much red)

3. **Test with game**
   - Launch EA Battlefront 2
   - Take damage from different directions
   - Verify edge detection accuracy
   - Calibrate RGB thresholds

4. **Create event writer**
   - Write events to file: `DAMAGE|edge|intensity`
   - Add timestamp
   - Handle edge cases (multiple edges, UI overlap)

5. **Build Python watcher**
   - File watcher (similar to HL:Alyx)
   - Parse damage events
   - Map edge → direction → vest cells
   - Integrate with daemon

### Phase 1 Alternative: Frosty Mod Approach

1. **Analyze damage indicator system**
   - Find UI element/shaders for red filter
   - Understand how edge position is determined
   - Check if intensity is accessible

2. **Create Frosty mod hook**
   - Hook into damage indicator rendering
   - Detect when it appears
   - Extract edge position and intensity
   - Write to file: `DAMAGE|edge|intensity`

3. **Test direction mapping**
   - Verify edge → direction mapping
   - Test with different damage sources
   - Validate intensity scaling

4. **Build Python watcher**
   - File watcher (similar to HL:Alyx)
   - Parse damage events
   - Map direction to vest cells
   - Integrate with daemon

### Phase 2: Full Implementation

1. **Complete event detection**
   - Damage events
   - Death events
   - Spawn events
   - Vehicle entry/exit

2. **Directional feedback**
   - Calculate damage direction (if possible)
   - Map to vest cells

3. **Polish & testing**
   - Error handling
   - Performance optimization
   - User documentation

---

## Event-to-Haptic Mapping

### Damage Indicator → Vest Cell Mapping

The red damage indicator appears on screen edges/corners. Based on screenshot analysis, map to vest cells:

| Screen Edge/Corner | Direction | Vest Cells | Description |
|-------------------|----------|------------|-------------|
| **Left Edge** | Left Side | 0, 1, 2, 3 | All left cells (front + back) |
| **Right Edge** | Right Side | 4, 5, 6, 7 | All right cells (front + back) |
| **Top Edge** | Front | 2, 3, 4, 5 | All front cells |
| **Bottom Edge** | Back | 0, 1, 6, 7 | All back cells |
| **Top-Left Corner** | Front-Left | 2, 3 | Front-Left (Upper + Lower) |
| **Top-Right Corner** | Front-Right | 4, 5 | Front-Right (Upper + Lower) |
| **Bottom-Left Corner** | Back-Left | 0, 1 | Back-Left (Upper + Lower) |
| **Bottom-Right Corner** | Back-Right | 6, 7 | Back-Right (Upper + Lower) |

**Refined Mapping (from screenshot):**
- The screenshot shows red tint on **left side** when hit from left
- This suggests the indicator covers the **entire edge**, not just a corner
- We may need to detect which edge has the strongest red tint
- Or detect if it's a corner (diagonal) vs edge (straight) hit

**Vest Cell Layout Reference:**
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

### Intensity Scaling

The red filter intensity likely correlates with damage amount:
- **Light red** = Low damage → Intensity 2-4
- **Medium red** = Medium damage → Intensity 5-7
- **Heavy red** = High damage → Intensity 8-10

### Other Events (If Detectable)

| Game Event | Vest Response | Cells | Intensity | Notes |
|------------|---------------|-------|-----------|-------|
| **Player Death** | Full body pulse | All 8 | 10 (max) | May need separate detection |
| **Player Spawn** | Light pulse | All 8 | 2 | Respawn feedback |
| **Vehicle Entry** | Medium pulse | All 8 | 4 | Contextual feedback |
| **Vehicle Exit** | Light pulse | All 8 | 2 | Contextual feedback |
| **Explosion Nearby** | Wide impact | All 8 | 6 | Environmental (if detectable) |

---

## Comparison with Other Games

| Game | Engine | Modding | Event Hooking | Our Status |
|------|--------|---------|---------------|------------|
| **HL:Alyx** | Source 2 | Lua scripts | ✅ Easy (ListenToGameEvent) | ✅ Implemented |
| **SWBF2 2005** | Pandemic | Lua scripts | ✅ Easy (OnCharacterDeath) | 📋 Planned |
| **EA BF2 2017** | Frostbite | Frosty Mod | ❓ Unknown | 🔬 Research |
| **Mordhau** | UE4 | Blueprints | ⚠️ Complex | 🔬 Research |

**Key Difference:** Frostbite is a closed engine with limited modding support compared to Source 2 or Pandemic engines.

---

## Challenges & Limitations

### 1. Frostbite Engine Restrictions

- **Closed-source** - No official modding API
- **Limited scripting** - May not support event hooks
- **Asset-focused** - Mods primarily change assets, not logic

### 2. Anti-Cheat Concerns

- **FairFight/EAC** - May detect memory reading
- **Online play** - Mods may be restricted to offline
- **Ban risk** - Need to be careful with implementation

### 3. Documentation Gaps

- **Limited official docs** - Community-driven documentation
- **Reverse engineering** - May need to reverse-engineer game systems
- **Learning curve** - Frosty Editor has steep learning curve

---

## Alternative: SimHub Integration

If direct modding proves too difficult, consider:

1. **SimHub Plugin** - Create a SimHub plugin that reads game state
2. **Shared Memory** - If game exposes shared memory (unlikely)
3. **UDP Telemetry** - If game has telemetry output (unlikely)

**Note:** EA Battlefront 2 (2017) is not officially supported by SimHub.

---

## Resources

### Tools

- **Frosty Tool Suite**: [frostytoolsuitedev.gitlab.io](https://frostytoolsuitedev.gitlab.io/downloads)
- **Frosty Editor**: Part of Frosty Tool Suite
- **Frosty Mod Manager**: Part of Frosty Tool Suite

### Documentation

- **SWBF2 Frosty Editor Wiki**: [swbf2frosty.wiki.gg](https://swbf2frosty.wiki.gg/)
- **Battlefront Modding Server Wiki**: [battlefront-modding-server.fandom.com](https://battlefront-modding-server.fandom.com/wiki/Frosty_Tool_Suite)

### Community

- **Nexus Mods**: [nexusmods.com/starwarsbattlefront22017](https://www.nexusmods.com/starwarsbattlefront22017/mods)
- **ModDB**: [moddb.com/games/star-wars-battlefront-ii-2017](https://www.moddb.com/games/star-wars-battlefront-ii-2017)
- **Frosty Modding Discord** (if available)

### Example Mods

- **NoAutoZoom.fbmod** - UI modification example
- **BetterHitmarkers.fbmod** - UI/HUD modification example
- **Debugger mod** - Shows game state (coordinates, speed)

---

## Next Steps

- [ ] **Download Frosty Tool Suite** - Get familiar with the tools
- [ ] **Analyze existing mods** - Understand how they work
- [ ] **Check Frosty Editor docs** - See if scripting is supported
- [ ] **Test log files** - Check for gameplay events
- [ ] **Join modding community** - Ask about event hooking
- [ ] **Create test mod** - Try to write to file from mod
- [ ] **Evaluate feasibility** - Decide if integration is possible

---

## Verdict

| Factor | Assessment |
|--------|------------|
| **Technical Feasibility** | UNCERTAIN - Needs more research |
| **Learning Curve** | HIGH - Frosty Editor is complex |
| **Development Time** | 30-50+ hours estimated (if feasible) |
| **Existing Resources** | MEDIUM - Some mods exist, limited docs |
| **Community Support** | MEDIUM - Active but specialized community |

### Recommendation

**Screen capture approach is HIGHLY RECOMMENDED!** This is much simpler and more reliable than modding.

**Priority Actions:**
1. **⭐⭐⭐ Implement screen capture prototype** - Use `mss` to capture edge pixels
2. **Test red detection** - Analyze RGB values, calibrate thresholds
3. **Test edge detection** - Verify we can detect which edge has red
4. **Create event writer** - Write damage events to file
5. **Build Python integration** - File watcher + daemon integration

**Advantages of screen capture:**
- ✅ **No game modification** - Works with any version
- ✅ **No modding knowledge needed** - Much simpler
- ✅ **Universal approach** - Can work for other games
- ✅ **Easy to test** - Just run Python script
- ✅ **Non-invasive** - Doesn't touch game files
- ✅ **Fast to implement** - Can have prototype in hours, not days

**If screen capture doesn't work well:**
- **Frosty mod approach** - Hook into damage indicator rendering
- **SimHub plugin** - If game exposes telemetry
- **Memory reading** - Risky, may trigger anti-cheat

---

## Local Resources

We have example mods in:
```
misc-documentations/bhaptics-svg-24-nov/star-wars-battlefront-2-2017/
├── README.md
├── NoAutoZoom/
│   └── NoAutoZoom.fbmod
└── BetterHitmarkers v1.0-7620-1-0-1642740933/
    └── BetterHitmarkers - v1.0.fbmod
```

These can be analyzed to understand Frosty mod structure and capabilities.

