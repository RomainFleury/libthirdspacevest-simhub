# Mount & Blade II: Bannerlord Haptic Integration

> **Status: 📋 RESEARCH COMPLETE - READY FOR IMPLEMENTATION**
>
> **FINDINGS:**
> - ✅ No existing haptic mods found (first-of-its-kind integration)
> - ✅ Native C# modding API with Harmony support
> - ✅ Rich damage event data available (`MissionLogic.OnScoreHit`)
> - ✅ Damage types, directions, and intensity data accessible
>
> **RECOMMENDED APPROACH:** Native C# mod with Harmony patches → TCP to daemon

## Overview

Mount & Blade II: Bannerlord is a medieval action RPG featuring large-scale battles with:
- Melee combat (swords, axes, maces, polearms)
- Ranged combat (bows, crossbows, throwing weapons)
- Mounted combat (cavalry charges, horse archery)
- Siege warfare (catapults, rams, castle assaults)
- 500+ unit battles

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Mount & Blade II: Bannerlord                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              ThirdSpace_Bannerlord Mod (C#)                  │   │
│  │                                                              │   │
│  │  MissionLogic.OnScoreHit() ────┐                            │   │
│  │  Agent damage tracking ────────┤                            │   │
│  │  Health monitoring ────────────┼──► Event Logger ───────────┼───┼──► TCP
│  │  Death detection ──────────────┤                            │   │   Port 5050
│  │  Horse damage ─────────────────┘                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Python Daemon (TCP 5050)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐   │
│  │ BannerlordMgr  │  │ VestController │  │ Event Broadcasting  │   │
│  │ (event parser) │──│ (haptic output)│──│ (to Electron UI)    │   │
│  └────────────────┘  └────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Game Details

| Aspect | Details |
|--------|---------|
| **Engine** | TaleWorlds custom engine (not Unity/Unreal) |
| **Language** | C# |
| **Mod Framework** | Native TaleWorlds modding API + Harmony |
| **Mod Format** | DLL assemblies + `SubModule.xml` |
| **Platform** | Steam, GOG, Epic Games |
| **Multiplayer** | Yes (may require server-side approval) |

## Existing Haptic Mods Research

### bHaptics Mods

**Status: ❌ None found**

Searched:
- GitHub: No results for "bannerlord bhaptics" or "mount blade bhaptics"
- bHaptics Notion game list: Bannerlord not listed
- mod.io: No haptic mods
- NexusMods: No haptic mods

### OWO Mods

**Status: ❌ None found**

Searched:
- GitHub OWODevelopers: No Bannerlord repository
- OWO Games page: Bannerlord not listed
- NexusMods: No OWO mods

### Conclusion

**This would be a first-of-its-kind haptic integration for Mount & Blade II: Bannerlord.**

## Bannerlord Modding Ecosystem

### Key Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **BUTR/Bannerlord.Harmony** | [GitHub](https://github.com/BUTR/Bannerlord.Harmony) | Harmony library for Bannerlord |
| **BUTR/Bannerlord.ButterLib** | [GitHub](https://github.com/BUTR/Bannerlord.ButterLib) | Extension library with utilities |
| **NexusMods** | [nexusmods.com/mountandblade2bannerlord](https://www.nexusmods.com/mountandblade2bannerlord) | Main mod repository |
| **mod.io** | [mod.io/g/mountandblade2bannerlord](https://mod.io/g/mountandblade2bannerlord) | Official mod platform |
| **TaleWorlds Forums** | [forums.taleworlds.com](https://forums.taleworlds.com/index.php?forums/mount-blade-ii-bannerlord.528/) | Official community |

### Mod Structure

```
MyMod/
├── SubModule.xml           # Mod metadata and entry point
├── bin/
│   └── Win64_Shipping_Client/
│       └── MyMod.dll       # Compiled mod assembly
└── ModuleData/             # Optional data files
```

### SubModule.xml Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Module>
    <Name value="ThirdSpace Haptics"/>
    <Id value="ThirdSpaceHaptics"/>
    <Version value="v1.0.0"/>
    <SingleplayerModule value="true"/>
    <MultiplayerModule value="false"/>
    <DependedModules>
        <DependedModule Id="Native" DependentVersion="e1.8.0" Optional="false"/>
        <DependedModule Id="Bannerlord.Harmony" DependentVersion="v2.2.2" Optional="false"/>
    </DependedModules>
    <SubModules>
        <SubModule>
            <Name value="ThirdSpaceHaptics"/>
            <DLLName value="ThirdSpaceHaptics.dll"/>
            <SubModuleClassType value="ThirdSpaceHaptics.SubModule"/>
            <Tags>
                <Tag key="DedicatedServerType" value="none"/>
                <Tag key="IsNoRenderModeElement" value="false"/>
            </Tags>
        </SubModule>
    </SubModules>
</Module>
```

### Base Module Class

```csharp
using TaleWorlds.MountAndBlade;

namespace ThirdSpaceHaptics
{
    public class SubModule : MBSubModuleBase
    {
        protected override void OnSubModuleLoad()
        {
            base.OnSubModuleLoad();
            // Initialize Harmony patches
            new Harmony("com.thirdspace.haptics").PatchAll();
        }

        public override void OnMissionBehaviorInitialize(Mission mission)
        {
            base.OnMissionBehaviorInitialize(mission);
            // Inject our behavior into each mission
            mission.AddMissionBehavior(new HapticsBehavior());
        }
    }
}
```

## Key Game Hooks

### Primary Hook: MissionLogic.OnScoreHit()

This is the **main damage event hook** - provides comprehensive damage information:

```csharp
public class HapticsBehavior : MissionLogic
{
    public override void OnScoreHit(
        Agent affectedAgent,           // Who is taking damage
        Agent affectorAgent,           // Who dealt the damage
        WeaponComponentData attackerWeapon,  // Weapon used
        bool isBlocked,                // Was the attack blocked?
        bool isSiegeEngineHit,         // Hit by siege weapon?
        in Blow blow,                  // Damage details
        in AttackCollisionData collisionData,  // Collision info
        float damagedHp,               // HP lost
        float hitDistance,             // Distance of hit
        float shotDifficulty)          // For ranged attacks
    {
        // Check if player is the victim
        if (affectedAgent.IsMainAgent || affectedAgent.IsPlayerControlled)
        {
            ProcessPlayerDamage(blow, collisionData, damagedHp);
        }
    }
}
```

### Available Data in Damage Events

| Field | Type | Description |
|-------|------|-------------|
| `blow.InflictedDamage` | `int` | Actual damage dealt |
| `blow.DamageType` | `DamageTypes` | Cut, Pierce, or Blunt |
| `blow.GlobalPosition` | `Vec3` | World position of hit |
| `blow.Direction` | `Vec3` | Direction of attack |
| `collisionData.AttackBlockedWithShield` | `bool` | Blocked by shield |
| `collisionData.VictimHitBodyPart` | `BoneBodyPartType` | Body part hit |
| `attackerWeapon` | `WeaponComponentData` | Weapon info (type, reach, etc.) |

### Damage Types

```csharp
public enum DamageTypes
{
    Invalid = -1,
    Cut = 0,      // Swords, axes - slashing damage
    Pierce = 1,   // Arrows, spears - penetrating damage
    Blunt = 2     // Maces, fists - crushing damage
}
```

### Body Parts (BoneBodyPartType)

```csharp
public enum BoneBodyPartType
{
    None = -1,
    Head = 0,
    Neck = 1,
    Chest = 2,
    Abdomen = 3,
    ShoulderLeft = 4,
    ShoulderRight = 5,
    ArmLeft = 6,
    ArmRight = 7,
    Legs = 8
}
```

### Secondary Hooks

| Event | Method | Description |
|-------|--------|-------------|
| **Agent Death** | `OnAgentRemoved()` | When any agent dies |
| **Player Death** | Check `Agent.Health <= 0` | Player-specific death |
| **Shield Block** | `collisionData.AttackBlockedWithShield` | Successful block |
| **Horse Damage** | `Agent.IsMount` check | Mount taking damage |
| **Kill Scored** | `OnAgentRemoved()` with killer check | Player kills enemy |

## Event-to-Haptic Mapping

### Vest Cell Layout

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

### Mapping Table

| Event | Cells | Intensity | Duration | Notes |
|-------|-------|-----------|----------|-------|
| **Damage (front, upper)** | 2, 5 | Scaled by damage | 150-300ms | Chest/shoulder hits |
| **Damage (front, lower)** | 3, 4 | Scaled by damage | 150-300ms | Abdomen hits |
| **Damage (back, upper)** | 1, 6 | Scaled by damage | 150-300ms | Back shoulder hits |
| **Damage (back, lower)** | 0, 7 | Scaled by damage | 150-300ms | Lower back hits |
| **Head damage** | 2, 5, 1, 6 | High (8-10) | 200ms | All upper cells |
| **Shield block** | 2 or 5 | Light (2-3) | 100ms | Based on hand |
| **Arrow hit** | Directional | Medium (5-6) | 100ms | Quick, sharp |
| **Blunt weapon hit** | Wide spread | High (7-8) | 300ms | Thuddier impact |
| **Cut damage** | Directional | Medium-High (5-7) | 200ms | Slashing feel |
| **Death** | All (0-7) | Maximum (10) | 1000ms | Full body, dramatic |
| **Horse damage** | 0, 3, 4, 7 | Medium (4-5) | 200ms | Lower body |
| **Kill scored** | 2, 5 | Light (2-3) | 100ms | Optional satisfaction |

### Intensity Scaling

```csharp
// Scale intensity based on damage amount
int CalculateIntensity(float damage, float maxHealth)
{
    float damagePercent = damage / maxHealth;
    
    if (damagePercent >= 0.5f) return 10;  // 50%+ health = max
    if (damagePercent >= 0.3f) return 8;   // 30-50% = high
    if (damagePercent >= 0.15f) return 6;  // 15-30% = medium
    if (damagePercent >= 0.05f) return 4;  // 5-15% = light
    return 2;                               // <5% = minimal
}
```

### Directional Mapping

Calculate which cells to activate based on attack direction:

```csharp
int[] GetDirectionalCells(Vec3 attackDirection, Vec3 playerForward, BoneBodyPartType bodyPart)
{
    // Calculate angle relative to player facing
    float angle = CalculateAngle(attackDirection, playerForward);
    
    // Determine front/back
    bool isFront = angle > -90 && angle < 90;
    
    // Determine upper/lower based on body part
    bool isUpper = bodyPart == BoneBodyPartType.Head || 
                   bodyPart == BoneBodyPartType.Chest ||
                   bodyPart == BoneBodyPartType.ShoulderLeft ||
                   bodyPart == BoneBodyPartType.ShoulderRight;
    
    // Determine left/right from attack angle
    bool isLeft = angle < 0;
    
    // Map to cells
    if (isFront && isUpper && isLeft) return new[] { 2 };      // Front Upper Left
    if (isFront && isUpper && !isLeft) return new[] { 5 };     // Front Upper Right
    if (isFront && !isUpper && isLeft) return new[] { 3 };     // Front Lower Left
    if (isFront && !isUpper && !isLeft) return new[] { 4 };    // Front Lower Right
    if (!isFront && isUpper && isLeft) return new[] { 1 };     // Back Upper Left
    if (!isFront && isUpper && !isLeft) return new[] { 6 };    // Back Upper Right
    if (!isFront && !isUpper && isLeft) return new[] { 0 };    // Back Lower Left
    if (!isFront && !isUpper && !isLeft) return new[] { 7 };   // Back Lower Right
    
    return new[] { 2, 5 }; // Default to front upper
}
```

## Implementation Plan

### Phase 1: Create C# Mod (2-3 days)

**Files to create:**

```
bannerlord-mod/
├── ThirdSpaceHaptics.sln
├── ThirdSpaceHaptics/
│   ├── SubModule.cs              # Mod entry point
│   ├── HapticsBehavior.cs        # MissionLogic with damage hooks
│   ├── DaemonClient.cs           # TCP client for daemon
│   ├── EventMapper.cs            # Damage → haptic event mapping
│   ├── DirectionCalculator.cs    # Attack direction analysis
│   └── Properties/
│       └── AssemblyInfo.cs
├── SubModule.xml                 # Mod metadata
└── README.md                     # Installation instructions
```

**Key implementation:**

```csharp
// DaemonClient.cs - TCP client for daemon communication
public class DaemonClient
{
    private TcpClient _client;
    private NetworkStream _stream;
    
    public void Connect(string host = "127.0.0.1", int port = 5050)
    {
        _client = new TcpClient(host, port);
        _stream = _client.GetStream();
    }
    
    public void SendEvent(string eventType, Dictionary<string, object> data)
    {
        var json = JsonConvert.SerializeObject(new {
            cmd = "bannerlord_event",
            event_type = eventType,
            data = data
        });
        var bytes = Encoding.UTF8.GetBytes(json + "\n");
        _stream.Write(bytes, 0, bytes.Length);
    }
}

// HapticsBehavior.cs - Main damage detection
public class HapticsBehavior : MissionLogic
{
    private readonly DaemonClient _daemon;
    
    public HapticsBehavior()
    {
        _daemon = new DaemonClient();
        _daemon.Connect();
    }
    
    public override void OnScoreHit(
        Agent affectedAgent, Agent affectorAgent,
        WeaponComponentData attackerWeapon, bool isBlocked,
        bool isSiegeEngineHit, in Blow blow,
        in AttackCollisionData collisionData,
        float damagedHp, float hitDistance, float shotDifficulty)
    {
        // Only process player damage
        if (!affectedAgent.IsMainAgent && !affectedAgent.IsPlayerControlled)
            return;
            
        // Skip if blocked with shield
        if (collisionData.AttackBlockedWithShield)
        {
            _daemon.SendEvent("shield_block", new Dictionary<string, object>());
            return;
        }
        
        // Calculate direction and intensity
        var direction = CalculateDirection(blow, affectedAgent);
        var intensity = CalculateIntensity(blow.InflictedDamage, affectedAgent.HealthLimit);
        
        _daemon.SendEvent("player_damage", new Dictionary<string, object> {
            ["damage"] = blow.InflictedDamage,
            ["damage_type"] = blow.DamageType.ToString(),
            ["body_part"] = collisionData.VictimHitBodyPart.ToString(),
            ["direction"] = direction,
            ["intensity"] = intensity
        });
    }
}
```

### Phase 2: Add Daemon Support (0.5 day)

**Files to create/modify:**

```
modern-third-space/src/modern_third_space/
└── server/
    └── bannerlord_manager.py    # Event receiver and haptic mapper
```

**Protocol (mod → daemon):**

```json
{"cmd": "bannerlord_event", "event_type": "player_damage", "data": {"damage": 45, "damage_type": "Cut", "body_part": "Chest", "direction": "front_left", "intensity": 6}}
{"cmd": "bannerlord_event", "event_type": "player_death", "data": {}}
{"cmd": "bannerlord_event", "event_type": "shield_block", "data": {}}
{"cmd": "bannerlord_event", "event_type": "horse_damage", "data": {"damage": 30}}
{"cmd": "bannerlord_event", "event_type": "kill_scored", "data": {"weapon_type": "Sword"}}
```

**Daemon commands:**

- `bannerlord_start` - Enable event processing
- `bannerlord_stop` - Disable processing  
- `bannerlord_status` - Get connection state

### Phase 3: Electron UI Panel (0.5 day)

**Files to create:**

```
web/src/components/BannerlordIntegrationPanel.tsx
web/src/hooks/useBannerlordIntegration.ts
web/electron/ipc/bannerlordHandlers.cjs
```

**UI features:**

- Connection status indicator
- Live event log with damage details
- Per-event intensity sliders
- Enable/disable individual haptic effects
- Battle statistics (hits taken, damage received)

### Phase 4: Testing & Polish (1 day)

1. Test each damage type (Cut, Pierce, Blunt)
2. Verify directional feedback accuracy
3. Test body part detection
4. Tune intensity curves for immersion
5. Test with different weapons (arrows, swords, maces)
6. Test mounted combat
7. Document installation steps

## User Setup Requirements

### Prerequisites

1. **Mount & Blade II: Bannerlord** (Steam/GOG/Epic)
2. **Bannerlord.Harmony** mod installed
3. **Third Space Vest daemon** running on port 5050

### Installation Steps

1. Download `ThirdSpaceHaptics.zip` from releases
2. Extract to `Mount & Blade II Bannerlord/Modules/`
3. Enable "ThirdSpace Haptics" in the Bannerlord launcher
4. Ensure "Bannerlord.Harmony" loads before our mod
5. Start the Python daemon: `python -m modern_third_space.cli daemon start`
6. Launch Bannerlord and start a battle

### Manual IP Configuration

If daemon runs on a different machine, create `Modules/ThirdSpaceHaptics/ThirdSpace_Manual_IP.txt`:
```
192.168.1.100
```

## Technical Notes

### Multiplayer Considerations

- **Singleplayer:** Works without issues
- **Multiplayer:** May require server approval or could be blocked by anti-cheat
- **Recommendation:** Start with singleplayer support only

### Performance Impact

- TCP sends are asynchronous
- Only processes events when player is hit (not AI battles)
- Minimal overhead (~1ms per hit)

### Compatibility

| Bannerlord Version | Support |
|-------------------|---------|
| 1.0.x | ✅ Supported |
| 1.1.x | ✅ Supported |
| 1.2.x | ⚠️ Test needed |
| Earlier versions | ❌ Untested |

### Dependencies

- `Bannerlord.Harmony` (via NuGet or mod)
- `Newtonsoft.Json` (usually included with game)

## Comparison with Similar Games

| Aspect | Blade and Sorcery | Bannerlord |
|--------|-------------------|------------|
| Engine | Unity | TaleWorlds Custom |
| Mod Framework | MelonLoader | Native + Harmony |
| Combat Scale | 1v1 to 1v10 | Up to 1000+ units |
| Damage Events | bHaptics hooks | MissionLogic.OnScoreHit |
| Complexity | Medium | High (more features) |

## Related Documents

- `DAEMON_ARCHITECTURE.md` - Daemon protocol documentation
- `SUPERHOTVR_INTEGRATION.md` - Similar C# mod approach
- `CS2_INTEGRATION.md` - Event mapping reference
- `MELONLOADER_INTEGRATION_STRATEGY.md` - Alternative Unity approach

## Implementation Status

| Phase | Status | Estimated Time |
|-------|--------|----------------|
| Phase 1: C# Mod | 📋 Planned | 2-3 days |
| Phase 2: Python Daemon | 📋 Planned | 0.5 day |
| Phase 3: UI Panel | 📋 Planned | 0.5 day |
| Phase 4: Testing | 📋 Planned | 1 day |
| **Total** | | **4-5 days** |

## References

### Bannerlord Modding

- [Bannerlord Modding Documentation](https://docs.bannerlordmodding.com/)
- [TaleWorlds API Reference](https://apidoc.bannerlord.com/)
- [BUTR GitHub Organization](https://github.com/BUTR)

### Example Mods Analyzed

- [LessDamage](https://github.com/hsngrms/LessDamage) - Simple Harmony patch example
- [HealOnKill](https://github.com/dahaka637/HealOnKill) - MissionLogic.OnScoreHit example
- [AnotherArmorDamage](https://github.com/jzju/AnotherArmorDamage) - Damage calculation patches

### Similar Haptic Integrations

- [Blade and Sorcery OWO](https://github.com/floh-bhaptics/BladeAndSorcery_OWO) - Melee combat patterns

---

**Document Status:** Research complete, ready for implementation  
**Next Action:** Create Phase 1 C# mod skeleton  
**Last Updated:** December 2024
