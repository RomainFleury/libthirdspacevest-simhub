# EA Star Wars Battlefront 2 (2017) - Haptic Integration Research

> **Focus:** EA Battlefront 2 (2017) using Frostbite engine and Frosty Mod

## Game Information

- **Engine:** Frostbite Engine (DICE)
- **Mod Tool:** Frosty Tool Suite (Editor + Mod Manager)
- **Mod Format:** `.fbmod` archives
- **Modding Complexity:** HIGH - Frostbite is a closed engine with limited modding support

## Resources

### Modding Tools

- **Frosty Tool Suite**: [frostytoolsuitedev.gitlab.io](https://frostytoolsuitedev.gitlab.io/downloads)
- **Frosty Mod Manager**: Part of Frosty Tool Suite
- **Frosty Editor**: Part of Frosty Tool Suite (for creating mods)

### Documentation

- **SWBF2 Frosty Editor Wiki**: [swbf2frosty.wiki.gg](https://swbf2frosty.wiki.gg/)
- **Battlefront Modding Server Wiki**: [battlefront-modding-server.fandom.com](https://battlefront-modding-server.fandom.com/wiki/Frosty_Tool_Suite)

### Mod Repositories

- **Nexus Mods**: [nexusmods.com/starwarsbattlefront22017](https://www.nexusmods.com/starwarsbattlefront22017/mods)
- **ModDB**: [moddb.com/games/star-wars-battlefront-ii-2017](https://www.moddb.com/games/star-wars-battlefront-ii-2017/mods)

## Visual Reference

### Damage Indicator Screenshot
- **File:** `vf-2-damage.PNG`
- **Shows:** Red tint/overlay on left side of screen when taking damage from left
- **Observations:**
  - Red filter is a screen-space overlay effect
  - Appears on the edge where damage comes from
  - Intensity likely correlates with damage amount
  - Not just a corner widget - covers the entire edge

## Example Mods in This Folder

### Debugger Mod
- **Source**: [Nexus Mods](https://www.nexusmods.com/starwarsbattlefront22017/images/896)
- **Function**: Shows coordinates and speed on screen
- **Files Modified**:
  - `ui/ingame/hud/soldier/screens/defaultsoldierhudwidget`
  - `addons/mode1/mode1/ui/ingame/hud/gamemodes/conquest/groundphasehudwidget`
  - `addons/mode1/mode1/ui/ingame/hud/gamemodes/titanphase/titanphasehudwidget`

### NoAutoZoom Mod
- **Source**: [ModDB](https://www.moddb.com/mods/no-auto-zoom)
- **Function**: Disables auto-zoom
- **File**: `NoAutoZoom/NoAutoZoom.fbmod`

### BetterHitmarkers Mod
- **Source**: Nexus Mods
- **Function**: Improved hitmarker visuals
- **File**: `BetterHitmarkers v1.0-7620-1-0-1642740933/BetterHitmarkers - v1.0.fbmod`

## Research Findings

### Current Status

- ❌ **No haptic mods found** - No existing haptic feedback integrations
- ❌ **No telemetry mods found** - No mods that expose game events
- ✅ **UI mods exist** - Mods can modify HUD elements
- ❓ **Scripting unknown** - Need to verify if Frosty Editor supports event hooks

### Key Challenges

1. **Frostbite Engine Limitations**
   - Closed-source engine
   - Limited modding API
   - Primarily asset-focused modding

2. **Event Hooking**
   - Unknown if Frosty Editor supports C# scripting
   - No clear way to hook into game events
   - May need to monitor UI elements instead

3. **Anti-Cheat**
   - FairFight/EAC may detect memory reading
   - Mods may be restricted to offline play

## Integration Strategy

See full strategy document: `docs-external-integrations-ideas/EA_BATTLEFRONT2_2017_INTEGRATION.md`

### Potential Approaches

1. **⭐⭐⭐ Screen Capture + Pixel Analysis** (HIGHLY RECOMMENDED)
   - Capture screen edges using Python (`mss` library)
   - Analyze pixels for red tint (damage indicator)
   - Detect which edge has red = damage direction
   - Measure intensity = damage amount
   - Write events to file
   - Python daemon watches file
   - **Advantages:** 
     - No game modification needed
     - Works with any game version
     - Much simpler than modding
     - Universal approach (can work for other games)
   - **Prototype:** See `screen_capture_prototype.py`

2. **Frosty Mod - Damage Indicator Hook** (Alternative)
   - Hook into red damage filter via Frosty mod
   - Edge position = damage direction
   - Intensity = damage amount
   - Write events to file
   - Python daemon watches file
   - **Advantage:** Uses existing game feature, provides direction automatically

2. **UI Overlay + File Output** (Alternative)
   - Monitor health bar changes via UI
   - Write events to file
   - Python daemon watches file

3. **Log File Watching** (If Available)
   - Check if game outputs gameplay events to logs
   - Similar to HL:Alyx approach

4. **Memory Reading** (Not Recommended)
   - Read player health from memory
   - Risky, may trigger anti-cheat

## Next Steps

- [ ] Download and explore Frosty Tool Suite
- [ ] Analyze existing mods to understand structure
- [ ] Check if Frosty Editor supports C# scripting
- [ ] Test log files for gameplay events
- [ ] Join modding community for guidance
- [ ] Create test mod to verify file I/O capabilities

## Notes

- Most mods are UI/asset modifications, not event-driven
- Frostbite engine is notoriously difficult to mod
- May need to reverse-engineer UI element access
- Community documentation is limited but available
