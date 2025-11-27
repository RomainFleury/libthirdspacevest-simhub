# Cell Mapping Audit

> **Status**: 🔴 **ACTION REQUIRED**
>
> This document audits the cell mapping across our codebase against the
> reverse-engineered hardware specification.

## Reference: Correct Hardware Cell Layout

From Kyle Machulis' reverse engineering and confirmed by Sebastien's testing:

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

### Quick Reference Table

| Position | Front Cell | Back Cell |
|----------|------------|-----------|
| Upper Left | 2 | 1 |
| Upper Right | 5 | 6 |
| Lower Left | 3 | 0 |
| Lower Right | 4 | 7 |

### Constants to Use

```python
# Python
FRONT_UPPER_LEFT = 2
FRONT_UPPER_RIGHT = 5
FRONT_LOWER_LEFT = 3
FRONT_LOWER_RIGHT = 4

BACK_UPPER_LEFT = 1
BACK_UPPER_RIGHT = 6
BACK_LOWER_LEFT = 0
BACK_LOWER_RIGHT = 7

FRONT_CELLS = [2, 5, 3, 4]  # UL, UR, LL, LR
BACK_CELLS = [1, 6, 0, 7]   # UL, UR, LL, LR
ALL_CELLS = [0, 1, 2, 3, 4, 5, 6, 7]

LEFT_SIDE = [2, 3, 1, 0]    # Front upper/lower + Back upper/lower
RIGHT_SIDE = [5, 4, 6, 7]   # Front upper/lower + Back upper/lower
```

---

## Audit Results

### ✅ Fixed by Sebastien (PR #2)

| File | Status | Notes |
|------|--------|-------|
| `web/src/data/effects.ts` | ✅ CORRECT | Cell mapping updated |
| `web/src/components/EffectControls.tsx` | ✅ CORRECT | Grid display updated |
| `legacy_port/thirdspace.py` | ✅ CORRECT | Windows USB API fixes |

**Sebastien's Changes (commit `0a6a826`):**

1. **`thirdspace.py`**:
   - Fixed `detach_kernel_driver()` to handle `NotImplementedError` on Windows
   - Updated PyUSB 1.0+ API calls (`timeout=` keyword)

2. **`effects.ts`**:
   - Changed from sequential `0,1,2,3,4,5,6,7` to correct hardware mapping
   - Front: `2,5,3,4` | Back: `1,6,0,7`

3. **`EffectControls.tsx`**:
   - Updated `FRONT_CELLS` and `BACK_CELLS` constants
   - Grid display now uses correct cell IDs

---

### 🔴 Needs Updating: Game Integrations

These files use hardcoded cell numbers with the **OLD incorrect layout**:

#### 1. `superhot_manager.py`

**Current (WRONG):**
```python
# Line 43-50 - Comment shows wrong layout
#   FRONT          BACK
# │ 0 │ 1 │    │ 4 │ 5 │  Upper
# │ 2 │ 3 │    │ 6 │ 7 │  Lower

# Line 53-58 - Constants use wrong values
LEFT_ARM = [0, 4]       # WRONG
RIGHT_ARM = [1, 5]      # WRONG
LEFT_SIDE = [0, 2, 4, 6]  # WRONG
RIGHT_SIDE = [1, 3, 5, 7] # WRONG
TORSO = [2, 3, 6, 7]      # WRONG
```

**Should Be:**
```python
# Vest cell layout (hardware):
#   FRONT          BACK
# │ 2 │ 5 │    │ 1 │ 6 │  Upper
# │ 3 │ 4 │    │ 0 │ 7 │  Lower

# Hand-specific cell mappings
LEFT_ARM = [2, 1]         # Front upper left + Back upper left
RIGHT_ARM = [5, 6]        # Front upper right + Back upper right
LEFT_SIDE = [2, 3, 1, 0]  # All left cells
RIGHT_SIDE = [5, 4, 6, 7] # All right cells
TORSO = [3, 4, 0, 7]      # Lower cells (front + back)
```

---

#### 2. `alyx_manager.py`

**Current (WRONG) - Lines 180-240:**
```python
# Line 183-184: Recoil uses cells 0,1 (should be 2,5)
commands.append((0, speed))
commands.append((1, speed))

# Line 190-191: Heartbeat uses 0,2 (should be 2,3)
commands.append((0, 3))
commands.append((2, 3))

# Line 195-196: Heal uses 0,1,2,3 (should be 2,5,3,4)
for cell in [0, 1, 2, 3]:

# Line 210: Barnacle uses 4,5 (should be 1,6)
for cell in [4, 5]:

# Line 233: Backpack uses 4,5 (should be 1,6)
cell = 4 if left else 5  # Should be: cell = 1 if left else 6
```

---

#### 3. `cs2_manager.py`

**Current (WRONG) - Lines 389-440:**
```python
# Line 395-396: Light damage uses 0,1 (should be 2,5)
self._trigger(0, speed)
self._trigger(1, speed)

# Line 398: Medium damage uses 0,1,2,3 (should be 2,5,3,4)
for cell in [0, 1, 2, 3]:

# Line 414: Flash uses 0,1,4,5 (should be 2,5,1,6 for upper cells)
for cell in [0, 1, 4, 5]:

# Line 420: Bomb planted uses 2,3,6,7 (should be 3,4,0,7 for lower/torso)
for cell in [2, 3, 6, 7]:

# Line 438-439: Kill feedback uses 0,1 (should be 2,5)
self._trigger(0, 5)
self._trigger(1, 5)
```

---

### 🟡 Other Files to Check

| File | Status | Notes |
|------|--------|-------|
| `simhub-plugin/TelemetryMapper.cs` | 🟡 CHECK | May have hardcoded cells |
| Game mod documentation | 🟡 CHECK | Update haptic mapping tables |

---

## Recommended Fix

### Option 1: Create Central Constants File (Recommended)

Create `modern-third-space/src/modern_third_space/vest/cell_layout.py`:

```python
"""
Third Space Vest cell layout constants.

Hardware cell mapping (from reverse engineering):

      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R
"""

# Individual cells by position
class Cell:
    FRONT_UPPER_LEFT = 2
    FRONT_UPPER_RIGHT = 5
    FRONT_LOWER_LEFT = 3
    FRONT_LOWER_RIGHT = 4
    
    BACK_UPPER_LEFT = 1
    BACK_UPPER_RIGHT = 6
    BACK_LOWER_LEFT = 0
    BACK_LOWER_RIGHT = 7

# Groups
FRONT_CELLS = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT, 
               Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT]
BACK_CELLS = [Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT,
              Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT]
ALL_CELLS = list(range(8))

# Hand-specific (for VR games)
LEFT_ARM = [Cell.FRONT_UPPER_LEFT, Cell.BACK_UPPER_LEFT]
RIGHT_ARM = [Cell.FRONT_UPPER_RIGHT, Cell.BACK_UPPER_RIGHT]
LEFT_SIDE = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_LOWER_LEFT,
             Cell.BACK_UPPER_LEFT, Cell.BACK_LOWER_LEFT]
RIGHT_SIDE = [Cell.FRONT_UPPER_RIGHT, Cell.FRONT_LOWER_RIGHT,
              Cell.BACK_UPPER_RIGHT, Cell.BACK_LOWER_RIGHT]

# Torso (lower cells)
TORSO = [Cell.FRONT_LOWER_LEFT, Cell.FRONT_LOWER_RIGHT,
         Cell.BACK_LOWER_LEFT, Cell.BACK_LOWER_RIGHT]

# Upper cells (shoulders/chest)
UPPER = [Cell.FRONT_UPPER_LEFT, Cell.FRONT_UPPER_RIGHT,
         Cell.BACK_UPPER_LEFT, Cell.BACK_UPPER_RIGHT]
```

### Option 2: Quick Fix

Just update the hardcoded values in each file using the correct mapping.

---

## Action Items

- [ ] Create `cell_layout.py` constants module
- [ ] Update `superhot_manager.py` to use correct cells
- [ ] Update `alyx_manager.py` to use correct cells
- [ ] Update `cs2_manager.py` to use correct cells
- [ ] Update `simhub-plugin/TelemetryMapper.cs` if needed
- [ ] Update integration documentation with correct cell references
- [ ] Add unit tests to verify cell mapping

---

## Credits

- **Kyle Machulis (qDot)** - Original reverse engineering
- **Sebastien (Estyaah)** - Windows fixes and UI cell mapping correction (PR #2)

---

**Document Created**: November 2025  
**Last Updated**: November 2025

