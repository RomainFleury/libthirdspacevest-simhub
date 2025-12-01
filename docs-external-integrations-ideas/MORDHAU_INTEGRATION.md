# Mordhau Haptic Integration

> **Status: ✅ MULTIPLE APPROACHES IDENTIFIED - READY FOR TESTING**
>
> **SOLUTIONS FOUND:**
> 1. ⭐⭐⭐ **Hybrid Approach** - Custom indicator mod + screen capture (RECOMMENDED)
> 2. ⭐⭐ **Screen Capture** - Detect existing red arch around crosshair
> 3. ⭐ **Full Blueprint Mod** - Direct event hooks with file I/O
>
> **PROGRESS:**
> - ✅ Tested client-side logging - No damage events found
> - ✅ Discovered red arch indicator around crosshair
> - ✅ Found existing screen capture prototype (EA Battlefront 2)
> - ✅ Created detailed implementation plans for each approach
> - 🔬 **NEXT:** Try approaches in order (Plan B → Plan A → Plan C)

## 🔍 NEW INVESTIGATION: Client-Side Logging Configuration

**Discovery:** The [Mordhau Fandom Server Configuration](https://mordhau.fandom.com/wiki/Server_Configuration) page reveals extensive logging configuration options that might work on the client side too!

**Key Finding:** Server-side `Engine.ini` supports logging categories like:
- `LogMordhauPlayerController` - **Potentially logs player actions including damage!**
- `LogMordhauGameInstance` - Game state changes
- `LogMordhauGameSession` - Session events

**Hypothesis:** If client-side `Engine.ini` supports the same logging categories, we can enable verbose logging and capture damage/combat events **without needing a Blueprint mod**!

**This would make the integration similar to HL:Alyx** - just configure logging and watch log files. See "Approach 2: Log File Watching" below for details.

---

## ⚠️ Key Differences from Other Integrations

| Aspect | Unity Games (Superhot, Pistol Whip) | Mordhau (UE4) |
|--------|-------------------------------------|---------------|
| **Engine** | Unity | Unreal Engine 4 |
| **Mod Framework** | MelonLoader / BepInEx | MSDK (Mordhau SDK) |
| **Mod Language** | C# with Harmony patches | Blueprints (visual scripting) |
| **Mod Format** | .dll files | .pak files |
| **Injection** | Runtime C# injection | Packaged asset loading |
| **Learning Curve** | Moderate (C#) | High (UE4 editor + Blueprints) |
| **Integration Method** | Log watching (if client logging works) / Blueprint mod (if not) |

## What are .pak Files?

`.pak` files are **Unreal Engine package files** - compressed binary archives containing:
- Blueprint assets (visual scripts)
- Textures, meshes, materials
- Configuration data

They are **NOT** text files and cannot be edited directly. They must be:
1. Created using Unreal Engine 4 editor with MSDK
2. Packaged ("cooked") for the target platform
3. Placed in the game's `CustomPaks` folder

## Mordhau Modding Ecosystem

### MORDHAU Editor (Official SDK)

Triternion provides an **official Unreal Engine 4 Editor** tailored for Mordhau mod creation:

**Download:** [Epic Games Store - MORDHAU Editor](https://store.epicgames.com/en-US/p/mordhau--editor)

This is the proper development environment for creating Mordhau mods, containing:
- Mordhau's game classes and structures
- Blueprint nodes for game events
- Tools for packaging mods into .pak files

### Community Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **mod.io Mordhau** | [mod.io/g/mordhau](https://mod.io/g/mordhau) | Official mod repository |
| **Mordhau Community** | [mordhaucommunity.org](https://mordhaucommunity.org/docs/en/about-mordhau/) | Community documentation |
| **MordhauBuddy** | [shmew.github.io/MordhauBuddy](https://shmew.github.io/MordhauBuddy/index.html) | Mod management tool |
| **MSDK DictionaryLib** | [GitHub](https://github.com/thePeacey/MSDK-DictionaryLib-Kit) | Example mod kit |

### Mod Installation

Mods are placed in:
```
SteamLibrary\steamapps\common\Mordhau\Mordhau\Content\CustomPaks\
```

### Types of Mods

| Type | Description | Use Case |
|------|-------------|----------|
| **Client-side** | Runs on player's machine only | UI, visual effects, **haptics** |
| **Server-side** | Runs on server | Game rules, spawning |
| **Mutators** | Server gameplay modifiers | Custom game modes |

For haptics, we need a **client-side mod** that can detect player damage events.

---

## Integration Approaches

### Approach 1: Hybrid - Custom Indicator Mod + Screen Capture (RECOMMENDED ⭐⭐⭐)

**Complexity: LOW-MEDIUM** | **Feasibility: VERY HIGH**

**Status: ✅ BEST OF BOTH WORLDS** - Simple mod creates easy-to-detect indicator, screen capture detects it!

**Key Insight:** Create a **simple Blueprint mod** that displays a distinctive visual indicator when damage occurs, then use **screen capture** to detect it. This is easier than detecting the existing red arch!

**How it works:**
1. **Blueprint mod** - Detects damage events via MSDK hooks
2. **Visual indicator** - Displays distinctive marker (bright color, specific pattern, fixed position)
3. **Screen capture** - Detects the custom indicator (much easier than existing red arch)
4. **Event processing** - Python daemon processes detected events

**Advantages:**
- ✅ **Simpler mod** - Just add visual indicator, no file I/O needed
- ✅ **Easier detection** - Indicator designed specifically for screen capture
- ✅ **More reliable** - Can use unique color/pattern that won't appear elsewhere
- ✅ **Directional support** - Can encode direction in indicator position/color
- ✅ **Proven approach** - Screen capture already works (EA Battlefront 2 prototype)

**What the mod needs to do:**
1. Hook into player damage events (via MSDK Blueprint nodes)
2. Display visual indicator when damage occurs:
   - **Position:** Fixed location (e.g., top-left corner, or around crosshair)
   - **Color:** Unique, easy-to-detect (e.g., bright cyan #00FFFF, or specific RGB)
   - **Pattern:** Distinctive shape (square, circle, specific pattern)
   - **Duration:** Brief flash (0.1-0.3 seconds)
   - **Direction encoding:** Different position/color for different directions (optional)

**What makes a good indicator for detection:**
- **Unique color** - RGB values that rarely appear in game (e.g., pure cyan #00FFFF)
- **Fixed position** - Always in same location (easier to detect)
- **Distinctive pattern** - Specific shape/size that's easy to recognize
- **High contrast** - Stands out from game visuals
- **Brief duration** - Appears/disappears quickly (prevents false positives)

**Example indicator designs:**
- **Option A:** Small bright cyan square in top-left corner (10x10px)
  - Simple, easy to detect
  - Fixed position = reliable detection
  - Unique color = no false positives
- **Option B:** Colored border around crosshair (different colors for directions)
  - Encodes direction in color
  - More complex but provides directional feedback
- **Option C:** Specific pattern (e.g., 4-pixel pattern in corner)
  - Very distinctive, unlikely to appear naturally
  - Can encode direction in pattern position
- **Option D:** Color-coded indicator (red=front, blue=back, green=left, yellow=right)
  - Direction encoded in color
  - Single indicator position, color changes

**Recommended: Option A (Simple Cyan Square)**
- Easiest to implement in Blueprint
- Easiest to detect via screen capture
- Can add direction later by using multiple squares (one per direction)

**Mod Implementation (Conceptual):**
```
Blueprint Logic:
  On Player Damage Event:
    → Get damage amount
    → Get damage direction (if available)
    → Show indicator widget:
       - Position: Top-left corner (fixed)
       - Color: Cyan (#00FFFF)
       - Size: 10x10 pixels
       - Duration: 0.2 seconds
       - Fade out animation
```

**Screen Capture Detection:**
- Capture small region (e.g., 20x20px) in top-left corner
- Check for cyan pixels (R=0, G=255, B=255)
- If detected → damage event occurred
- Write to log file for daemon processing

### Approach 1B: Screen Capture + Existing Red Arch Detection (Alternative)

**Complexity: LOW-MEDIUM** | **Feasibility: MEDIUM**

**Status: ✅ PROVEN APPROACH** - We have a working prototype for EA Battlefront 2 that we can adapt!

**Key Discovery:** Mordhau displays a **red arch around the crosshair** when taking damage. We can detect this visually using screen capture - no game modification needed!

**How it works:**
1. **Screen capture** - Capture crosshair region (center of screen)
2. **Pixel analysis** - Detect red arch pattern around crosshair
3. **Direction detection** - If arch has directional properties, detect angle
4. **Intensity detection** - Measure red intensity = damage amount
5. **Write to file** - Output damage events
6. **Python watches file** - Daemon processes events

**Reference Implementation:**
- `misc-documentations/bhaptics-svg-24-nov/star-wars-battlefront-2-2017/screen_capture_prototype.py`
- Already implements screen capture, red detection, and event writing
- Can be adapted for crosshair detection instead of edge detection

**Advantages:**
- ✅ **No game modification** - Works with any version
- ✅ **No Blueprint modding** - Much simpler than MSDK approach
- ✅ **Proven approach** - Already working for EA Battlefront 2
- ✅ **Fast to implement** - Can adapt existing prototype
- ✅ **Non-invasive** - Doesn't touch game files

**What we need for accurate detection (Custom Indicator):**
1. **Indicator position** - Fixed location (e.g., top-left corner, configurable)
2. **Unique color** - RGB values for custom indicator (e.g., cyan #00FFFF)
3. **Pattern recognition** - Detect specific shape/size
4. **Direction encoding** - If using directional indicators (position or color)
5. **Cooldown period** - Prevent duplicate detections from same hit

**What we need for accurate detection (Existing Red Arch):**
1. **Crosshair position** - Usually center of screen, but may need detection
2. **Arch radius** - How far from center the red arch appears
3. **Red color threshold** - RGB values for the damage indicator red
4. **Arch shape detection** - Circular/arc pattern vs simple red pixels
5. **Direction detection** - If arch has directional properties (which side is redder)
6. **Cooldown period** - Prevent duplicate detections from same hit

**Next Steps:**
1. Adapt BF2 screen capture prototype for crosshair detection
2. Test with Mordhau to capture red arch appearance
3. Calibrate detection thresholds
4. Implement direction detection (if arch is directional)
5. Integrate with daemon

### Approach 2: Blueprint Mod with TCP/File Output (Alternative)

**Complexity: HIGH** | **Feasibility: MEDIUM**

Create a Blueprint mod using MSDK that:
1. Hooks into player damage events via Blueprint event binding
2. Writes event data to a local file OR sends via TCP
3. Our Python daemon monitors the file/receives TCP

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mordhau Game       │     │  Blueprint Mod   │     │  Python Daemon  │
│  (Player damaged)   │────▶│  (Detects event) │────▶│  (Reads output) │
└─────────────────────┘     │  Writes to file  │     │  Triggers vest  │
                            └──────────────────┘     └─────────────────┘
```

**Challenges:**
- Requires learning Unreal Engine + Blueprints
- MSDK may have limited documentation
- Blueprint TCP/file I/O is limited

**What we'd need:**
1. Install Unreal Engine 4 (matching Mordhau's version)
2. Install MSDK
3. Create a Blueprint Actor that:
   - Binds to player damage events
   - Writes to a text file (simpler) or sends TCP (harder)
4. Package as .pak file

### Approach 2: Screen Capture + Crosshair Detection (NEW DISCOVERY ⭐⭐⭐)

**Complexity: LOW-MEDIUM** | **Feasibility: VERY HIGH**

**Key Discovery:** Mordhau displays a **red arch around the crosshair** when the player takes damage! We can detect this visually using screen capture, similar to our EA Battlefront 2 integration.

**How it works:**
1. **Screen capture** - Capture crosshair region (center of screen)
2. **Pixel analysis** - Detect red arch pattern around crosshair
3. **Direction detection** - If arch has directional properties, detect angle
4. **Intensity detection** - Measure red intensity = damage amount
5. **Write to file** - Output damage events
6. **Python watches file** - Daemon processes events

**Advantages:**
- ✅ **No game modification needed** - Works with any game version
- ✅ **No Blueprint modding required** - Much simpler than MSDK approach
- ✅ **Universal approach** - Can work for other games too
- ✅ **Easy to test** - Just capture screen and analyze
- ✅ **Non-invasive** - Doesn't modify game files
- ✅ **Works with any game version** - Not affected by updates
- ✅ **Precise detection** - Crosshair is always centered, less false positives

**Implementation:**
- Use existing screen capture prototype (from EA Battlefront 2) as base
- Adapt to capture crosshair region instead of edges
- Detect red arch pattern (circular/arc shape around center)
- Monitor continuously (30-60 FPS)
- Write events to log file for daemon to process

**Libraries (already used in BF2 prototype):**
- `mss` - Fast screen capture
- `PIL/Pillow` - Image processing
- `numpy` - Array operations for pixel analysis
- `opencv-python` - Advanced image processing (for arch shape detection)

**Challenges:**
- Need to identify game window (handle resolution changes)
- Crosshair position may vary (need to detect or assume center)
- May need to filter out other red UI elements
- Performance - screen capture has overhead
- Arch shape detection (circular pattern vs simple red pixels)

### Approach 3: Log File Watching (TESTED ❌)

**Complexity: LOW** | **Feasibility: ❌ NOT VIABLE (Client-side logging doesn't output damage events)**

**New Finding:** The [Mordhau Fandom Server Configuration](https://mordhau.fandom.com/wiki/Server_Configuration) page reveals extensive logging configuration options in `Engine.ini`:

**Server-side logging categories:**
- `LogMordhauGameInstance` (default: Verbose)
- `LogMordhauGameSession` (default: Verbose)
- `LogMordhauPlayerController` (default: Verbose) ⭐ **Potentially contains damage/combat events!**
- `LogMordhauWebAPI` (default: Verbose)
- `LogPlayFabAPI` (default: Verbose)
- `LogMatchmaking` (default: Verbose)

**Key Insight:** If client-side `Engine.ini` supports similar logging configuration, we might be able to enable verbose logging for `LogMordhauPlayerController` and capture damage/combat events in the client log files!

**Investigation Steps:**
1. ✅ Found server config documentation with logging options
2. ✅ Located client-side `Engine.ini` file location
3. ✅ Added verbose logging configuration to client `Engine.ini`
4. ✅ Tested gameplay with VeryVerbose logging enabled
5. ❌ **RESULT:** No damage/combat events found in logs

**Test Results:**
- ✅ `LogMordhauGameInstance` entries appear (version, matchmaking, party changes)
- ❌ **No `LogMordhauPlayerController` entries found** (even at VeryVerbose)
- ❌ No damage, hit, combat, or health-related events in logs
- ✅ Match was played (FFA_Highlands map, match state changes logged)

**Conclusion:**
Client-side logging does NOT output damage/combat events, even with VeryVerbose settings. The `LogMordhauPlayerController` category either:
- Doesn't exist on client-side (server-only)
- Doesn't log damage events even at maximum verbosity
- Is disabled/limited on client builds

**Verdict:** Log-watching approach is **NOT VIABLE** for client-side damage detection. A Blueprint mod is required.

**Client Config Location (CONFIRMED ✅):**
- ✅ **Found:** `%LOCALAPPDATA%\Mordhau\Saved\Config\WindowsClient\Engine.ini`
- Current state: Only contains `[Core.System]` paths section
- **No logging configuration present** - we can add it!

**Previous Finding (May be outdated):**
Previously checked Mordhau logs at `%LOCALAPPDATA%\Mordhau\Saved\Logs\`:
- Only contained engine startup information
- No gameplay events (damage, health, hits)
- **BUT:** This was with default logging settings - we haven't tested with verbose logging enabled!

**If this works:** This would be the simplest integration approach (similar to HL:Alyx), requiring only:
1. Configure `Engine.ini` with verbose logging
2. Watch log files for damage events
3. Parse and map to haptic feedback

**If this doesn't work:** A Blueprint mod could be created that WRITES to a log file when damage occurs, then we watch that custom log. This is essentially Approach 1 with file output.

### Approach 3: Memory Reading (Not Recommended)

**Complexity: EXTREME** | **Feasibility: LOW**

Read player health values directly from game memory using tools like Cheat Engine.

**Problems:**
- Breaks with every game update
- May trigger anti-cheat (EAC)
- Extremely fragile
- Ethical concerns

---

## Research Needed

### 1. Check for Log Output (UPDATED - NEW PATH TO INVESTIGATE)

**Priority: HIGH** - This could be the simplest integration method!

#### Step 1: Locate Client Config Files

```powershell
# Check for client-side Engine.ini
$clientConfigPaths = @(
    "$env:LOCALAPPDATA\Mordhau\Saved\Config\WindowsClient\Engine.ini",
    "$env:LOCALAPPDATA\Mordhau\Saved\Config\Windows\Engine.ini",
    "C:\Program Files (x86)\Steam\steamapps\common\Mordhau\Mordhau\Saved\Config\WindowsClient\Engine.ini"
)

foreach ($path in $clientConfigPaths) {
    if (Test-Path $path) {
        Write-Host "Found: $path"
        Get-Content $path | Select-String -Pattern "LogMordhau|Core.Log" -Context 2
    }
}
```

#### Step 2: Test Verbose Logging Configuration

**✅ Client-side `Engine.ini` confirmed to exist!** Add logging configuration:

**Location:** `%LOCALAPPDATA%\Mordhau\Saved\Config\WindowsClient\Engine.ini`

**Add these sections to the file:**

```ini
[LogFiles]
PurgeLogsDays=5
MaxLogFilesOnDisk=10
LogTimes=True

[Core.Log]
LogMordhauPlayerController=VeryVerbose
LogMordhauGameInstance=VeryVerbose
LogMordhauGameSession=VeryVerbose
LogMordhauWebAPI=VeryVerbose
LogPlayFabAPI=VeryVerbose
LogMatchmaking=VeryVerbose
```

**Note:** The current `Engine.ini` only contains `[Core.System]` paths - we can safely add the logging sections without conflicts.

#### Step 3: Test Gameplay and Check Logs

```powershell
# Play a match, take damage, then check logs
Get-ChildItem "$env:LOCALAPPDATA\Mordhau\Saved\Logs\" -Recurse | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1 | 
    Get-Content -Tail 100 | 
    Select-String -Pattern "damage|hurt|hit|health|combat" -CaseSensitive:$false
```

#### Step 4: Check for Damage Events

Look for patterns like:
- Damage amounts
- Hit locations
- Weapon types
- Player names
- Health values

**Reference:** Server config shows these log categories exist - we need to verify if they work on client-side too!

### 2. Investigate Existing Mods

The "Heartbeat Mod" example we have might provide clues:
- Does it read player health?
- How does it detect health changes?
- Can we decompile/inspect the Blueprint?

**Tools for inspecting .pak files:**
- [UE4 Pak Unpacker](https://github.com/AcidDeathTV/UE4PakUnpacker)
- [UnrealPak](https://docs.unrealengine.com/4.27/en-US/SharingAndReleasing/Patching/GeneralPatching/UnrealPak/)
- [FModel](https://github.com/4sval/FModel) - Asset viewer

### 3. MSDK Documentation

- Find MSDK tutorials/documentation
- Understand available Blueprint nodes
- Check Discord servers for modding help

---

## Event Mapping (If Integration Possible)

If we can detect events, here's the proposed mapping:

| Game Event | Vest Response | Cells | Intensity |
|------------|---------------|-------|-----------|
| **Slash damage (front)** | Front impact | 2, 3, 4, 5 | Based on damage |
| **Slash damage (back)** | Back impact | 0, 1, 6, 7 | Based on damage |
| **Stab damage** | Point impact | Directional | High |
| **Blunt damage** | Wide impact | All on side | Medium |
| **Archer hit** | Quick point | Directional | Medium |
| **Death** | Full body | All 8 | Maximum |
| **Kill (optional)** | Satisfaction pulse | All | Low |
| **Block/Parry (optional)** | Light feedback | Arms? | Low |

### Directional Mapping

Mordhau has 360° combat - ideal for directional feedback:

```
Damage from Front-Left  → Cells 2, 3 (Front-Left)
Damage from Front-Right → Cells 4, 5 (Front-Right)
Damage from Back-Left   → Cells 0, 1 (Back-Left)
Damage from Back-Right  → Cells 6, 7 (Back-Right)
```

---

## Existing Haptic Mods Research

### bHaptics

**Status: No known mod found**

Searched:
- GitHub: No results for "mordhau bhaptics"
- mod.io: No haptic mods
- bHaptics Notion: Mordhau not listed

### OWO

**Status: No known mod found**

Searched:
- OWO Games page: Mordhau not listed
- GitHub OWODevelopers: No Mordhau repo

### Conclusion

**No existing haptic mods exist for Mordhau.** This would be a first-of-its-kind integration.

---

## Implementation Plan

### Phase 0: Feasibility Study (Current)

1. **Check log files** - Look for damage events in Mordhau logs
2. **Inspect HeartbeatMod** - Understand how it detects health
3. **Research MSDK** - Evaluate learning curve
4. **Find community help** - Mordhau modding Discord

### Phase 1: Prototype (If Feasible)

1. Set up UE4 + MSDK environment
2. Create minimal Blueprint that logs to file on damage
3. Test Python daemon file watcher
4. Validate end-to-end flow

### Phase 2: Full Implementation

1. Implement directional damage detection
2. Add intensity scaling based on damage amount
3. Package and test .pak mod
4. Create installation instructions

---

## Resources

### Mordhau Modding

- [mod.io Mordhau](https://mod.io/g/mordhau)
- [MSDK DictionaryLib](https://github.com/thePeacey/MSDK-DictionaryLib-Kit)
- [Where to Place Mods](https://mod.io/g/mordhau/r/where-to-place-mods)

### Unreal Engine

- [UE4 Documentation](https://docs.unrealengine.com/4.27/en-US/)
- [Blueprint Basics](https://docs.unrealengine.com/4.27/en-US/ProgrammingAndScripting/Blueprints/)

### Tools

- [FModel](https://github.com/4sval/FModel) - View UE4 assets
- [UE4 Pak Tools](https://github.com/AcidDeathTV/UE4PakUnpacker)

---

## Local Resources

We have the following in the repository:

```
misc-documentations/bhaptics-svg-24-nov/mordhau/
├── README.md                              # Research notes
├── exampleMod/heartbeatmod/
│   └── HeartbeatModWindowsClient.pak      # Packaged client-side mod
├── modManager/autoloaderwindowsclient/
│   └── AutoLoaderWindowsClient.pak        # Mod loader
└── Mods/DictionaryLib/                    # ⭐ UNPACKED MOD SOURCE!
    ├── DictionaryLib.uplugin              # Plugin descriptor (JSON)
    ├── Content/
    │   ├── BP_DLib_Core.uasset            # Main Blueprint
    │   ├── BFL_DLib_Library.uasset        # Blueprint Function Library
    │   ├── DLib_Actor.uasset              # Actor class
    │   ├── ICON_DLib.uasset               # Icon
    │   └── NewBlueprint.uasset            # Another Blueprint
    └── Resources/
        └── Icon128.png                    # Plugin icon
```

### Key Discovery: DictionaryLib Source Structure

The `DictionaryLib` folder contains an **unpacked Unreal Engine plugin** - this is the actual mod source BEFORE it's cooked into a .pak file. This is exactly the structure we'd need to create for a haptic mod!

**Plugin descriptor (`.uplugin`):**
```json
{
  "FileVersion": 3,
  "Version": 1,
  "VersionName": "1.0",
  "FriendlyName": "DictionaryLib",
  "CreatedBy": "the_Peacey",
  "CanContainContent": true
}
```

**Asset types:**
- `BP_*.uasset` - Blueprints (visual scripts)
- `BFL_*.uasset` - Blueprint Function Libraries
- `*_Actor.uasset` - Actor classes (spawnable in-game)

---

## Log File Analysis

### Initial Finding (Default Settings)

**Result: ❌ No gameplay events logged by default**

Checked `C:\Users\...\AppData\Local\Mordhau\Saved\Logs\Mordhau.log`:
- Contains only engine initialization (GPU, memory, drivers)
- No damage, health, hit, or combat events
- **BUT:** This was with default logging settings!

### New Investigation Path (Server Config Discovery)

**Status: 🔬 INVESTIGATING**

**Key Discovery:** [Mordhau Fandom Server Configuration](https://mordhau.fandom.com/wiki/Server_Configuration) reveals extensive logging options:

**Server-side logging categories:**
- `LogMordhauPlayerController=Verbose` - **Potentially logs player actions including damage!**
- `LogMordhauGameInstance=Verbose`
- `LogMordhauGameSession=Verbose`
- `LogMordhauWebAPI=Verbose`
- `LogPlayFabAPI=Verbose`
- `LogMatchmaking=Verbose`

**Hypothesis:** If client-side `Engine.ini` supports the same logging categories, we can enable verbose logging and potentially capture damage/combat events without needing a Blueprint mod!

**Next Steps:**
1. Locate client-side `Engine.ini` file
2. Test if `LogMordhauPlayerController=VeryVerbose` works on client
3. Play a match and check if damage events appear in logs
4. If successful, this becomes the simplest integration approach (similar to HL:Alyx)

**If this doesn't work:** A Blueprint mod is still required - we cannot use the simpler log-watching method like HL:Alyx.

---

## Verdict

| Factor | Assessment |
|--------|------------|
| **Technical Feasibility** | UNCERTAIN - needs more research |
| **Learning Curve** | HIGH - UE4 + Blueprints required |
| **Development Time** | HIGH - 20-40+ hours estimated |
| **Existing Resources** | LOW - no haptic mods to learn from |
| **Community Support** | MEDIUM - active modding community |

### Recommendation

Before investing significant time:

1. **Check Mordhau logs** for damage events (easy, quick)
2. **Inspect HeartbeatMod** to understand how it reads health
3. **Ask Mordhau modding community** if damage event hooks exist

If log-based approach is possible, implementation becomes much simpler (similar to HL:Alyx). If Blueprint mod is required, this is a significant undertaking that requires UE4 expertise.

---

## Next Steps

### Priority 1: Hybrid Approach - Custom Indicator Mod + Screen Capture (RECOMMENDED ⭐⭐⭐)

- [x] Found server config documentation with logging options
- [x] Tested client-side logging - No damage events found
- [x] **Discovered red arch around crosshair** when taking damage
- [x] **Found existing screen capture prototype** (EA Battlefront 2)
- [x] **NEW IDEA:** Custom indicator mod + screen capture (hybrid approach)
- [ ] **NEXT:** Research MSDK Blueprint nodes for damage events
- [ ] **NEXT:** Create simple Blueprint mod with visual indicator
- [ ] **NEXT:** Adapt screen capture prototype for indicator detection
- [ ] **NEXT:** Test end-to-end (mod → indicator → screen capture → daemon)
- [ ] **NEXT:** Add directional support (if needed)

### Priority 2: Pure Screen Capture (Existing Red Arch) - Alternative

- [ ] **NEXT:** Adapt screen capture prototype for crosshair detection
- [ ] **NEXT:** Test with Mordhau - capture red arch appearance
- [ ] **NEXT:** Calibrate detection thresholds (red color, arch radius)
- [ ] **NEXT:** Implement direction detection (if arch is directional)
- [ ] **NEXT:** Integrate with daemon (file watcher + event processing)

### Priority 2: Blueprint Mod Development (If Logging Fails)

- [x] Analyze DictionaryLib mod structure → **Got unpacked mod source!**
- [ ] Install FModel and inspect HeartbeatMod.pak to see how it reads health
- [ ] Find Mordhau modding Discord/community for help
- [ ] Download and set up MSDK (Mordhau SDK)
- [ ] Determine if MSDK has damage event Blueprint nodes
- [ ] Create prototype Blueprint that writes damage events to file
- [ ] Test Python daemon watching the output file

### Reference: Server Config Logging Options

From [Mordhau Fandom Server Configuration](https://mordhau.fandom.com/wiki/Server_Configuration):

**Logging verbosity levels (in order):**
- `Fatal` (most severe)
- `Error`
- `Warning`
- `Display`
- `Log`
- `Verbose`
- `VeryVerbose` (most detailed)
- `NoLogging` (disable)

**Key log categories to test:**
- `LogMordhauPlayerController` - Player actions, damage, combat
- `LogMordhauGameInstance` - Game state changes
- `LogMordhauGameSession` - Session events

## Mod Development Approach

Based on the DictionaryLib example, here's how we'd create a haptic mod:

### 1. Set Up Development Environment
```
1. Download MORDHAU Editor from Epic Games Store (free with game ownership)
   https://store.epicgames.com/en-US/p/mordhau--editor
2. Install and launch the editor
3. Create new project using Mordhau template
4. Set up project structure like DictionaryLib example
```

### 2. Create Haptic Mod Structure
```
ThirdSpaceHaptics/
├── ThirdSpaceHaptics.uplugin          # Plugin descriptor
├── Content/
│   ├── BP_HapticCore.uasset           # Main Blueprint
│   ├── BP_DamageListener.uasset       # Listens for damage events
│   └── BFL_HapticLib.uasset           # Helper functions
└── Resources/
    └── Icon128.png
```

### 3. Blueprint Logic (Conceptual)
```
On Player Damage Event:
  → Get damage amount
  → Get damage direction (angle)
  → Get damage type (slash/stab/blunt)
  → Write to file: "DAMAGE|45|front_left|slash|25"

On Player Death:
  → Write to file: "DEATH|0|all|none|100"
```

### 4. Python Daemon Watches File
```python
# Similar to Alyx integration
async def watch_mordhau_output():
    path = Path(os.environ["LOCALAPPDATA"]) / "Mordhau" / "haptic_events.log"
    async for line in tail_file(path):
        event_type, angle, zone, damage_type, amount = line.split("|")
        await process_haptic_event(event_type, angle, zone, damage_type, amount)
```

