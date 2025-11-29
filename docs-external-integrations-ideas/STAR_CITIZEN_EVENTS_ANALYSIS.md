# Star Citizen Game.log Events Analysis

## Summary

Analysis of Game.log file for player "Maveck" to identify available events for haptic integration.

**Log File**: `S:\StarCitizen\StarCitizen\LIVE\Game.log`

## Available Events

### ✅ Ship Hit Events

**Pattern**: `[OnHandleHit] Hit FROM <attacker> TO <ship>. Being sent to child <player_name>`

**Example**:
```
<2025-11-29T04:03:55.725Z> [Notice] <Debug Hostility Events> [OnHandleHit] Hit FROM Vanduul_Pilot_01_200000309526 TO MISC_Fury_200000309141. Being sent to child Maveck
```

**Details**:
- Logged when player's ship is hit
- Contains attacker name/ID
- Contains ship name/ID
- Player name is mentioned as "child"
- **Direction information**: Not directly available, but could be inferred from attacker position

**Implementation**:
- Parse `[OnHandleHit]` events
- Extract attacker and ship information
- Trigger haptic feedback (could use random direction or front/back based on context)

### ✅ Medpen/Healing Events

**Pattern**: `<AttachmentReceived> Player[<player_name>] Attachment[crlf_consumable_healing_01_...]`

**Example**:
```
<2025-11-29T03:50:10.267Z> [Notice] <AttachmentReceived> Player[Maveck] Attachment[crlf_consumable_healing_01_200000000234, crlf_consumable_healing_01, 200000000234] Status[persistent] Port[medPen_att]
```

**Details**:
- Logged when medpen is attached/equipped
- Multiple types: `crlf_consumable_healing_01` (basic medpen), `crlf_consumable_ea_medicateAll_01` (multi-tool medpen)
- Port indicates where it's attached: `medPen_att`, `weapon_att`, etc.

**Implementation**:
- Parse `<AttachmentReceived>` events with `crlf_consumable_healing` or `crlf_consumable_ea_medicateAll`
- Trigger gentle healing haptic (maybe a soft pulse or warm feeling)
- Could differentiate between basic medpen and multi-tool medpen

### ✅ Death Events (Already Implemented)

**Pattern**: `<Actor Death> CActor::Kill: 'victim_name' ... killed by 'killer_name' ... from direction x: ..., y: ..., z: ...`

**Details**:
- Already parsed and implemented
- Contains directional damage information
- Can identify player death vs kill vs NPC death

### ❌ Direct Player Damage Events

**Status**: **NOT FOUND** in Game.log

**Conclusion**: Star Citizen does not log direct player damage (health loss) to Game.log in a parseable format. The game may track this internally but doesn't expose it in logs.

### ❌ Shield Damage Events

**Status**: **NOT FOUND** in Game.log

**Conclusion**: Shield damage is not logged separately. Only ship hits are logged, which may include shield damage but it's not explicitly stated.

### ❌ Hull Damage Events

**Status**: **NOT FOUND** in Game.log

**Conclusion**: Hull damage is not logged separately. Only ship hits are logged.

### ❌ Health Recovery Events

**Status**: **PARTIALLY AVAILABLE**

**Details**:
- Medpen attachment is logged (when equipped)
- Actual healing/health restoration is NOT logged
- We can infer healing when medpen is used, but don't know the amount or result

## Recommended Implementation

### Phase 1: Ship Hit Events (High Priority)

1. **Parse `[OnHandleHit]` events**
   - Extract attacker and ship information
   - Determine if it's the player's ship
   - Trigger haptic feedback

2. **Haptic Mapping**:
   - Ship hit → Strong vibration on front or back (depending on context)
   - Could use random direction or front/back based on ship type
   - Intensity based on attacker type (NPC vs player)

### Phase 2: Medpen/Healing Events (Medium Priority)

1. **Parse `<AttachmentReceived>` events for medpens**
   - Detect `crlf_consumable_healing_01` (basic medpen)
   - Detect `crlf_consumable_ea_medicateAll_01` (multi-tool medpen)

2. **Haptic Mapping**:
   - Medpen equipped → Gentle warm pulse (front cells, low intensity)
   - Could differentiate between basic and multi-tool medpen

### Phase 3: Enhanced Death Events (Low Priority)

1. **Improve existing death event parsing**
   - Better NPC detection
   - Ship-based death detection
   - Environmental death detection

## Event Patterns Summary

| Event Type | Available | Pattern | Direction Info | Priority |
|------------|-----------|---------|----------------|----------|
| Death | ✅ Yes | `<Actor Death> CActor::Kill` | ✅ Yes (x, y, z) | ✅ Implemented |
| Ship Hit | ✅ Yes | `[OnHandleHit] Hit FROM ... TO ...` | ❌ No | 🔥 High |
| Medpen Use | ✅ Yes | `<AttachmentReceived> ... crlf_consumable_healing` | ❌ No | ⚠️ Medium |
| Player Damage | ❌ No | N/A | N/A | ❌ Not Available |
| Shield Damage | ❌ No | N/A | N/A | ❌ Not Available |
| Hull Damage | ❌ No | N/A | N/A | ❌ Not Available |
| Health Recovery | ⚠️ Partial | Medpen attachment only | N/A | ⚠️ Medium |

## Code Examples

### Ship Hit Pattern
```python
SHIP_HIT_PATTERN = re.compile(
    r"\[OnHandleHit\]\s+Hit\s+FROM\s+(?P<attacker>[^\s]+)\s+TO\s+(?P<ship>[^\s]+)\.\s+Being sent to child\s+(?P<player>[^\s]+)"
)
```

### Medpen Pattern
```python
MEDPEN_PATTERN = re.compile(
    r"<AttachmentReceived>\s+Player\[(?P<player>[^\]]+)\]\s+Attachment\[crlf_consumable_(?:healing|ea_medicateAll)_01[^\]]+\]"
)
```

## Notes

- Star Citizen's Game.log is primarily focused on actor deaths and inventory management
- Real-time damage tracking is not exposed in logs
- Ship hits are logged but without directional information
- Medpen usage can be inferred from attachment events
- Most combat events (damage, shield, hull) are not logged in a parseable format

