# Third Space Haptics - Blueprint Implementation Guide

This document provides step-by-step instructions for implementing the damage detection Blueprint in the MORDHAU Editor (MSDK).

## Prerequisites

1. **MORDHAU Editor** - Download free from [Epic Games Store](https://store.epicgames.com/en-US/p/mordhau--editor)
2. **Basic Blueprint knowledge** - Understanding of Unreal Engine 4 Blueprints

## Overview

The mod consists of two main Blueprints:

1. **BP_ThirdSpaceCore** - The main actor that spawns on map load and manages everything
2. **BP_DamageListener** - Component that hooks into player damage events

## Step 1: Create the Project Structure

1. Open MORDHAU Editor
2. Create a new Plugin:
   - Go to `Edit > Plugins > New Plugin`
   - Choose "Content Only"
   - Name: `ThirdSpaceHaptics`

3. Your folder structure should look like:
```
ThirdSpaceHaptics/
├── ThirdSpaceHaptics.uplugin
├── Content/
│   ├── BP_ThirdSpaceCore.uasset
│   └── BP_DamageListener.uasset
└── Resources/
    └── Icon128.png
```

## Step 2: Create BP_ThirdSpaceCore (Server Actor)

This Blueprint spawns when the map loads and sets up damage detection.

### 2.1 Create the Blueprint

1. Right-click in Content Browser → Blueprint Class → Actor
2. Name it `BP_ThirdSpaceCore`

### 2.2 Add Variables

| Variable Name | Type | Default Value | Description |
|--------------|------|---------------|-------------|
| `LogFilePath` | String | `haptic_events.log` | Log file name |
| `bIsInitialized` | Boolean | false | Initialization flag |
| `LastHealth` | Float | 100.0 | Previous health value |
| `LocalPlayerController` | PlayerController (Ref) | None | Cached player reference |

### 2.3 Event Graph - BeginPlay

```
Event BeginPlay
    │
    ├──► Get Game Instance (Cast to MordhauGameInstance)
    │
    ├──► Get Local Player Controller
    │       │
    │       └──► Set LocalPlayerController variable
    │
    ├──► Get Controlled Pawn (Cast to MordhauCharacter)
    │       │
    │       └──► Get Health → Set LastHealth
    │
    ├──► Bind to OnTakeAnyDamage Event
    │       │
    │       └──► Connect to Custom Event: OnPlayerDamaged
    │
    └──► Set bIsInitialized = true
```

### 2.4 Custom Event: OnPlayerDamaged

This is the key event that fires when the player takes damage.

```
Custom Event: OnPlayerDamaged
    │
    │   Inputs:
    │   - DamageAmount (Float)
    │   - DamageType (DamageType Class)
    │   - InstigatedBy (Actor)
    │   - DamageCauser (Actor)
    │
    ├──► Calculate Angle to Damage Source
    │       │
    │       ├──► Get Player Location (from LocalPlayerController → GetPawn → GetActorLocation)
    │       │
    │       ├──► Get Damage Source Location (DamageCauser → GetActorLocation)
    │       │       │
    │       │       └──► If DamageCauser is None, use InstigatedBy location
    │       │
    │       ├──► Get Player Forward Vector (from Pawn → GetActorForwardVector)
    │       │
    │       ├──► Calculate Direction Vector (DamageSourceLocation - PlayerLocation → Normalize)
    │       │
    │       └──► Calculate Angle (0-360°)
    │               │
    │               ├──► DotProduct = Forward · Direction
    │               ├──► CrossProduct = Forward × Direction (Z component)
    │               ├──► BaseAngle = ArcCos(DotProduct) → degrees
    │               └──► If CrossProduct < 0: Angle = 360 - BaseAngle
    │                    Else: Angle = BaseAngle
    │
    │       Angle Convention (player's perspective):
    │           0°   = Front (damage from ahead)
    │           90°  = Right (damage from right)
    │           180° = Back (damage from behind)
    │           270° = Left (damage from left)
    │
    ├──► Determine Zone from Angle (for logging, optional)
    │       │
    │       ├──► 337.5° - 22.5°  → "front"
    │       ├──► 22.5° - 67.5°   → "front-right"
    │       ├──► 67.5° - 112.5°  → "right"
    │       ├──► 112.5° - 157.5° → "back-right"
    │       ├──► 157.5° - 202.5° → "back"
    │       ├──► 202.5° - 247.5° → "back-left"
    │       ├──► 247.5° - 292.5° → "left"
    │       └──► 292.5° - 337.5° → "front-left"
    │
    ├──► Get Damage Type String
    │       │
    │       ├──► If contains "Slash" → "slash"
    │       ├──► If contains "Stab" or "Pierce" → "stab"
    │       ├──► If contains "Blunt" → "blunt"
    │       ├──► If contains "Arrow" or "Bolt" → "projectile"
    │       └──► Else → "unknown"
    │
    ├──► Calculate Intensity (0-100)
    │       │
    │       └──► Clamp(DamageAmount, 0, 100)
    │
    └──► Call Function: WriteToLogFile
            │
            └──► Format: "{timestamp}|DAMAGE|{angle}|{zone}|{damage_type}|{intensity}"
```

### 2.4.1 Angle Calculation Blueprint Nodes

Here's the detailed Blueprint for calculating the damage angle:

```
[Get Player Pawn] → [GetActorLocation] → PlayerLocation
[DamageCauser] → [GetActorLocation] → DamageLocation

[DamageLocation] - [PlayerLocation] → DirectionVector
[DirectionVector] → [Normalize] → NormalizedDirection

[Get Player Pawn] → [GetActorForwardVector] → ForwardVector

[ForwardVector] · [NormalizedDirection] → DotProduct (using Dot Product node)
[ForwardVector] × [NormalizedDirection] → CrossProduct (using Cross Product node)

[DotProduct] → [Acos] → [RadiansToDegrees] → BaseAngle

[CrossProduct] → [Break Vector] → Z component

Branch: If Z < 0
    True:  Angle = 360 - BaseAngle
    False: Angle = BaseAngle
```

### 2.4.2 Zone from Angle (Helper Function)

Create a Blueprint Function to convert angle to zone string:

```
Function: AngleToZone
Input: Angle (Float)
Output: Zone (String)

Logic:
    Normalize Angle to 0-360 (Angle % 360)
    
    Select based on ranges:
        Default: "front"
        22.5 - 67.5: "front-right"
        67.5 - 112.5: "right"
        112.5 - 157.5: "back-right"
        157.5 - 202.5: "back"
        202.5 - 247.5: "back-left"
        247.5 - 292.5: "left"
        292.5 - 337.5: "front-left"
```

### 2.5 Function: WriteToLogFile

```
Function: WriteToLogFile
    │
    │   Inputs:
    │   - EventType (String)
    │   - Angle (Float)        ← NEW: Precise angle 0-360°
    │   - Zone (String)        ← Human-readable zone (front-left, back-right, etc.)
    │   - DamageType (String)
    │   - Intensity (Integer)
    │
    ├──► Get Current Time (Platform Time → Seconds) → Multiply by 1000 (for milliseconds)
    │
    ├──► Format String
    │       │
    │       └──► "{timestamp}|{EventType}|{angle}|{zone}|{damage_type}|{intensity}"
    │
    │       Example: "1704067200000|DAMAGE|45.5|front-right|slash|75"
    │
    ├──► Get Log File Path
    │       │
    │       └──► FPaths::ProjectSavedDir() + "ThirdSpaceHaptics/" + LogFilePath
    │
    └──► Append String to File
            │
            └──► Use "Append String to File" node with newline
```

### 2.6 Event: OnPlayerDeath

```
Custom Event: OnPlayerDeath
    │
    └──► Call WriteToLogFile
            │
            ├──► EventType = "DEATH"
            ├──► Zone = "all"
            ├──► DamageType = "death"
            └──► Intensity = 100
```

### 2.7 Tick Event - Health Monitoring (Alternative Method)

If direct damage binding doesn't work, use tick-based health monitoring:

```
Event Tick
    │
    ├──► Check bIsInitialized
    │       │
    │       └──► If false → Return
    │
    ├──► Get Player Pawn → Cast to MordhauCharacter
    │
    ├──► Get Current Health
    │
    ├──► Compare with LastHealth
    │       │
    │       └──► If CurrentHealth < LastHealth
    │               │
    │               ├──► Calculate Damage = LastHealth - CurrentHealth
    │               │
    │               ├──► Call OnPlayerDamaged (with estimated values)
    │               │       │
    │               │       ├──► DamageAmount = calculated damage
    │               │       └──► Direction = "unknown" (can't determine from health alone)
    │               │
    │               └──► Update LastHealth = CurrentHealth
    │
    └──► If CurrentHealth <= 0 AND LastHealth > 0
            │
            └──► Call OnPlayerDeath
```

## Step 3: Mordhau-Specific Classes

### MordhauCharacter Properties

When casting to `MordhauCharacter`, you have access to:

```cpp
// Health-related
float Health                    // Current health (0-100)
float MaxHealth                 // Maximum health
bool bIsDead                    // Death state

// Combat-related
bool bIsBlocking               // Currently blocking
bool bIsAttacking              // Currently attacking
bool bIsParrying               // Parry window active
```

### Damage Types in Mordhau

Common damage type classes you may encounter:

- `DamageType_Slash` - Sword slashes, axe swings
- `DamageType_Stab` - Thrusting attacks
- `DamageType_Blunt` - Maces, hammers, fists
- `DamageType_Pierce` - Arrows, bolts
- `DamageType_Fire` - Fire damage
- `DamageType_Fall` - Fall damage

### Hit Direction (Advanced)

For precise hit direction, access the `HitResult` from damage events:

```
FHitResult:
    - ImpactPoint        // Where the hit landed
    - ImpactNormal       // Direction of impact
    - BoneName           // Which body part was hit (head, torso, arm, leg)
    - PhysMaterial       // Physical material (can indicate armor)
```

## Step 4: Log File Location

The mod writes to:
```
%LOCALAPPDATA%\Mordhau\Saved\ThirdSpaceHaptics\haptic_events.log
```

Or on Windows:
```
C:\Users\{Username}\AppData\Local\Mordhau\Saved\ThirdSpaceHaptics\haptic_events.log
```

## Step 5: Log Format

Each line follows this format (v2 with angle):
```
{timestamp}|{event_type}|{angle}|{zone}|{damage_type}|{intensity}
```

### Examples:
```
1704067200000|DAMAGE|0.0|front|slash|45
1704067200100|DAMAGE|45.5|front-right|slash|60
1704067200200|DAMAGE|135.0|back-right|stab|75
1704067200300|DAMAGE|225.0|back-left|blunt|50
1704067200500|DAMAGE|270.0|left|projectile|30
1704067200600|DAMAGE|315.0|front-left|slash|40
1704067201000|DEATH|-1|all|death|100
```

### Field Descriptions:

| Field | Description | Values |
|-------|-------------|--------|
| timestamp | Unix timestamp in milliseconds | Integer |
| event_type | Type of event | `DAMAGE`, `DEATH`, `BLOCK`, `PARRY` |
| angle | Direction angle in degrees | `0.0` to `360.0`, or `-1` for unknown/all |
| zone | Human-readable zone (8 zones) | See zone table below |
| damage_type | Weapon/damage type | `slash`, `stab`, `blunt`, `projectile`, `unknown` |
| intensity | Damage intensity (0-100) | Integer |

### Angle Convention

The angle is from the **player's perspective**:

```
                    0° (Front)
                       │
                       │
    315° (Front-Left)  │  45° (Front-Right)
              ╲        │        ╱
               ╲       │       ╱
                ╲      │      ╱
    270° (Left) ───────●─────── 90° (Right)
                ╱      │      ╲
               ╱       │       ╲
              ╱        │        ╲
    225° (Back-Left)   │  135° (Back-Right)
                       │
                       │
                   180° (Back)
```

### Zone Table (8 Zones)

| Zone | Angle Range | Vest Cells |
|------|-------------|------------|
| front | 337.5° - 22.5° | 2, 3, 4, 5 (all front) |
| front-right | 22.5° - 67.5° | 4, 5 (front-right) |
| right | 67.5° - 112.5° | 4, 5, 6, 7 (right side) |
| back-right | 112.5° - 157.5° | 6, 7 (back-right) |
| back | 157.5° - 202.5° | 0, 1, 6, 7 (all back) |
| back-left | 202.5° - 247.5° | 0, 1 (back-left) |
| left | 247.5° - 292.5° | 0, 1, 2, 3 (left side) |
| front-left | 292.5° - 337.5° | 2, 3 (front-left) |
| all | -1 (special) | 0-7 (all cells) |

## Step 6: Server Actor Registration

To make the mod load automatically, it needs to be registered as a Server Actor.

### For Client-Side Only:

The mod auto-loads on the client. No special configuration needed.

### For Servers (Optional):

Add to `Game.ini`:
```ini
[/Script/Mordhau.MordhauGameMode]
SpawnServerActorsOnMapLoad=/ThirdSpaceHaptics/BP_ThirdSpaceCore.BP_ThirdSpaceCore_C
```

## Step 7: Packaging the Mod

1. In MORDHAU Editor, go to `File > Package Project > Windows`
2. Wait for cooking to complete
3. Find the `.pak` file in `Saved/Cooked/WindowsNoEditor/ThirdSpaceHaptics/Content/Paks/`
4. Rename to `ThirdSpaceHapticsWindowsClient.pak`
5. Install to game's `CustomPaks` folder

## Troubleshooting

### Mod Doesn't Load
- Verify .pak file is in correct location
- Check file naming (must end with `WindowsClient.pak` for client mods)
- Verify mod was cooked for correct platform

### No Damage Events Detected
- Check if Blueprint properly binds to damage events
- Try the Tick-based health monitoring as fallback
- Verify player pawn cast is succeeding

### Log File Not Created
- Check write permissions for save directory
- Verify path construction is correct
- Check for Blueprint errors in Output Log

### Direction Detection Issues
- Verify damage causer location is valid
- Check if damage source actor exists
- Fall back to "unknown" if calculation fails

## Alternative: Simpler Visual Indicator Approach

If Blueprint file I/O is problematic, consider the **Hybrid Approach**:

1. Create a simpler mod that shows a visual indicator on damage
2. Use screen capture (already implemented) to detect the indicator
3. This avoids file system complexity in Blueprints

See `PLAN_B_README.md` for the screen capture implementation.

## Testing

1. Launch Mordhau
2. Join a local match or training mode
3. Take damage from various sources
4. Check log file for events
5. Verify direction and damage type accuracy

## Next Steps

After the mod is working:
1. Connect to the Third Space Vest daemon (already implemented in `mordhau_manager.py`)
2. Map damage events to vest cells
3. Test haptic feedback in-game
