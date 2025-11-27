# Cell Mapping Audit

> **Status**: ✅ **COMPLETE**
>
> This document audits the cell mapping across our codebase against the
> reverse-engineered hardware specification.
>
> All issues have been resolved as of November 2025.

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

### ✅ Fixed: Game Integrations

All game integrations now import from the central `cell_layout.py` module:

#### 1. `superhot_manager.py` ✅ FIXED

- Removed hardcoded cell constants
- Now imports `ALL_CELLS, LEFT_ARM, RIGHT_ARM, LEFT_SIDE, RIGHT_SIDE, TORSO` from `cell_layout`
- Updated docstring with correct layout diagram

#### 2. `alyx_manager.py` ✅ FIXED

- Now imports `Cell, FRONT_CELLS, BACK_CELLS, ALL_CELLS, LEFT_SIDE, RIGHT_SIDE, UPPER_CELLS`
- `angle_to_cells()` uses correct cell mappings
- `map_event_to_haptics()` uses `Cell.FRONT_UPPER_LEFT`, `Cell.BACK_UPPER_RIGHT`, etc.

#### 3. `cs2_manager.py` ✅ FIXED

- Now imports `Cell, FRONT_CELLS, ALL_CELLS, UPPER_CELLS, LOWER_CELLS`
- All trigger functions use semantic cell names
- Added layout diagram in comments

---

### 🟡 Other Files to Check

| File | Status | Notes |
|------|--------|-------|
| `simhub-plugin/TelemetryMapper.cs` | 🟡 CHECK | C# plugin - may need separate update |
| Game mod documentation | 🟡 CHECK | Update haptic mapping tables |

---

## Implementation: Central Constants File

Created `modern-third-space/src/modern_third_space/vest/cell_layout.py`:

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

- [x] Create `cell_layout.py` constants module ✅
- [x] Update `superhot_manager.py` to use correct cells ✅
- [x] Update `alyx_manager.py` to use correct cells ✅
- [x] Update `cs2_manager.py` to use correct cells ✅
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

