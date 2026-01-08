## Phase D — schema: digits-only health number OCR (fast, per-tick)

This file locks down the Phase D `health_number` detector schema and strict assumptions for per-tick performance.

---

## 1) Strict assumptions (required)
- Digits only: `0-9`
- Fixed font / stable glyphs (no font switching)
- Fixed digit layout:
  - fixed digit count `digits`
  - fixed per-digit cell width (uniform split of ROI)
- No localization text in ROI (only digits)

If a game cannot meet these assumptions, it should not use Phase D; prefer Phase C or redness ROIs.

---

## 2) Detector JSON: `health_number`

### Required fields
- `type`: `"health_number"`
- `roi`: `{ x, y, w, h }` normalized floats (0..1)
- `digits`: integer (e.g. 3 for 0–999)
- `readout`:
  - `min`: integer
  - `max`: integer
  - `stable_reads`: integer (>= 1)
- `preprocess`:
  - `invert`: boolean
  - `threshold`: float (0..1) (binarization threshold)
  - `scale`: integer (>= 1) (nearest-neighbor upscaling before binarization)
- `hit_on_decrease`:
  - `min_drop`: integer (>= 1)
  - `cooldown_ms`: int

Optional fields
- `templates`:
  - `template_set_id`: string (versioned identifier)
  - `hamming_max`: int (max bit-diff allowed per digit)

Example:
```json
{
  "type": "health_number",
  "roi": { "x": 0.05, "y": 0.90, "w": 0.12, "h": 0.06 },
  "digits": 3,
  "preprocess": { "invert": false, "threshold": 0.6, "scale": 2 },
  "templates": { "template_set_id": "digits_7seg_v1", "hamming_max": 120 },
  "readout": { "min": 0, "max": 300, "stable_reads": 2 },
  "hit_on_decrease": { "min_drop": 1, "cooldown_ms": 150 }
}
```

---

## 3) Canonical per-tick recognition algorithm (fast path)

### Step A: preprocess ROI
Per tick:
- Crop ROI
- Nearest-neighbor scale by `scale`
- Convert to grayscale (integer)
- Apply threshold to produce a binary bitmap (0/1)

### Step B: fixed digit segmentation
Split the ROI into `digits` equal-width vertical slices:
- digit_i rect = `[i * (W/digits), 0, (W/digits), H]`

### Step C: template matching (Hamming distance)
For each digit slice:
- Resize/canonicalize to the template size (e.g. WxH fixed)
- Compute Hamming distance to each template 0–9
- Choose best match if distance <= `hamming_max`; otherwise mark “unknown”

### Step D: parse + validate
- If any digit is unknown → reject this read
- Parse integer value and clamp/validate against `readout.min/max`

### Step E: stability filtering
Maintain last N accepted reads and only update `health_value` when:
- same value seen `stable_reads` times (consecutive), OR
- another deterministic rule you choose, but Phase D requires stability

---

## 4) Hit derivation (from health_value)
Maintain `prev_health_value`.

Emit `hit_recorded` if:
- `prev_health_value - health_value >= min_drop`
- AND `cooldown_ms` elapsed since last hit

---

## 5) Template set/versioning
Template sets must be versioned and referenced by id:
- `templates.template_set_id`

This allows:
- per-game template sets (if needed)
- future improvements without breaking older profiles

