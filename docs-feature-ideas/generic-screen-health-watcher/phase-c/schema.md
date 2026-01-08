## Phase C — schema: health bar detector + percent calculation

This file locks down the Phase C `health_bar` detector schema and the canonical algorithm for computing `health_percent`.

---

## 1) Detector JSON: `health_bar` (schema_version 0 extension)

### Required fields
- `type`: `"health_bar"`
- `roi`: `{ x, y, w, h }` normalized floats (0..1)
- `orientation`: `"horizontal"` (Phase C constraint)
- `color_sampling`:
  - `filled_rgb`: `[r,g,b]` ints 0..255
  - `empty_rgb`: `[r,g,b]` ints 0..255
  - `tolerance_l1`: int (0..765) — max L1 distance to consider a pixel “matching”
- `hit_on_decrease`:
  - `min_drop`: float (0..1)
  - `cooldown_ms`: int

Optional fields
- `smoothing`:
  - `alpha`: float (0..1) (EMA)
- `threshold_fallback`:
  - `mode`: `"brightness"` | `"saturation"`
  - `min`: float (0..1)

Example:
```json
{
  "type": "health_bar",
  "roi": { "x": 0.10, "y": 0.90, "w": 0.30, "h": 0.03 },
  "orientation": "horizontal",
  "color_sampling": {
    "filled_rgb": [220, 40, 40],
    "empty_rgb": [40, 40, 40],
    "tolerance_l1": 120
  },
  "smoothing": { "alpha": 0.3 },
  "hit_on_decrease": { "min_drop": 0.02, "cooldown_ms": 150 }
}
```

---

## 2) Canonical `health_percent` computation (fast path)

Phase C defines health percent for horizontal bars as follows:

### Assumption (Phase C)
The ROI tightly contains the **entire health bar**, and the filled portion is a **single contiguous region** starting at the **left edge** of the ROI.

### Step A: classify pixels (per-tick, per ROI)
Given a pixel RGB = (r,g,b):
- Compute L1 distance to filled: `df = |r-rf| + |g-gf| + |b-bf|`
- Compute L1 distance to empty: `de = |r-re| + |g-ge| + |b-be|`

A pixel is considered **filled** if:
- `df <= tolerance_l1` AND `df <= de`

(If you want simpler: omit `df <= de`, but canonical Phase C includes it.)

### Step B: reduce to a 1D fill estimate
Let ROI width = W, height = H.
- For each column `x` in [0, W-1], compute:
  - `filled_ratio[x] = filled_pixels_in_column / H`
- A column is considered “filled” if:
  - `filled_ratio[x] >= column_threshold`

Canonical constants:
- `column_threshold = 0.5` (at least half the column matches “filled”)

### Step C: compute bar fill percentage (contiguous-width model)
Compute the **boundary** between filled and empty by scanning from **left → right**:

- Find the smallest `x_boundary` such that:
  - `column_filled[x_boundary] == false`
  - and `column_filled[x] == true` for most `x < x_boundary` (i.e. the left side is filled)

Canonical rule:
- `x_boundary = first x where column_filled[x] == false`
- `health_percent_raw = x_boundary / W`

If no empty column is found (all filled):
- `health_percent_raw = 1.0`

Clamp to [0,1].

### Step D: smoothing (deferred)
If `smoothing.alpha` is present:
- `health_percent = alpha * health_percent_raw + (1-alpha) * prev_health_percent`
Else:
- `health_percent = health_percent_raw`

### Fallback note (non-canonical)
If some games violate the “contiguous filled region” assumption (e.g. segmented bars with gaps), a fallback is:
- `health_percent_raw = filled_columns / W`
but Phase C’s canonical definition is the boundary scan above.

---

## 3) Hit derivation (from health percent)

Maintain `prev_health_percent` (smoothed value).

Emit `hit_recorded` if:
- `prev_health_percent - health_percent >= min_drop`
- AND `cooldown_ms` elapsed since last hit

---

## 4) Why this definition
- It’s fast: integer abs-diffs + per-column counts.
- It’s stable: per-column threshold reduces noise compared to raw filled pixel ratio.
- It matches user expectation: “how much of the bar is filled horizontally”.

