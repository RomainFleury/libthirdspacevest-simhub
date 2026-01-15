## Phase B — schema: presets + metadata

This file locks down the **preset profile** and **metadata** structure for Phase B.

---

## 1) Stored profile wrapper (Electron user storage)

Electron persists installed/editable profiles with metadata and timestamps.

```json
{
  "id": "sh_...",
  "name": "Cyberpunk 2077 (Red vignette)",
  "createdAt": "2026-01-08T12:00:00.000Z",
  "updatedAt": "2026-01-08T12:30:00.000Z",
  "profile": { "...": "daemon profile JSON (below)" }
}
```

Notes:
- The daemon only receives `profile`.
- The UI edits this stored profile “in place”.

---

## 2) Preset definition (bundled in the app)

Recommended representation (TypeScript objects):

```json
{
  "preset_id": "cp2077_red_vignette_v1",
  "display_name": "Cyberpunk 2077 — Red vignette (v1)",
  "profile": { "...": "daemon profile JSON (below)" }
}
```

Installation rule:
- Installing a preset creates/updates a stored profile whose `profile.meta.preset_id` matches the preset’s `preset_id`.

---

## 3) Daemon profile JSON (schema_version 0) + required `meta`

### Required top-level keys
- `schema_version`: number (Phase B uses `0`)
- `name`: string
- `capture`: object
- `detectors`: array
- `meta`: object (ignored by daemon; required for presets)

### `capture` (Phase B)
- `source`: `"monitor"`
- `monitor_index`: integer (1-based)
- `tick_ms`: integer

### `meta` (required fields for presets)
All presets must include:
- `preset_id`: string (stable, unique)
- `game_name`: string
- `preset_version`: integer (start at 1)
- `last_verified_at`: ISO string (or null if unverified)
- `recommended`:
  - `resolution`: string (e.g. `"1920x1080"`)
  - `aspect_ratio`: string (e.g. `"16:9"`)
  - `hud_scale`: string (free text, e.g. `"100%"`)
  - `display_mode`: `"borderless"` (Phase A/B assumption)
- `hints`: string[] (user-facing troubleshooting tips)

Optional meta fields:
- `notes`: string
- `game_version`: string
- `source_url`: string

### Example (minimal preset profile)
```json
{
  "schema_version": 0,
  "name": "Cyberpunk 2077 — Red vignette",
  "meta": {
    "preset_id": "cp2077_red_vignette_v1",
    "game_name": "Cyberpunk 2077",
    "preset_version": 1,
    "last_verified_at": "2026-01-08T12:00:00.000Z",
    "recommended": {
      "resolution": "1920x1080",
      "aspect_ratio": "16:9",
      "hud_scale": "100%",
      "display_mode": "borderless"
    },
    "hints": [
      "Use borderless/windowed mode.",
      "Disable color filters that change reds.",
      "Re-capture screenshot if HUD scale changes."
    ]
  },
  "capture": { "source": "monitor", "monitor_index": 1, "tick_ms": 50 },
  "detectors": [
    {
      "type": "redness_rois",
      "cooldown_ms": 200,
      "threshold": { "min_score": 0.35 },
      "rois": [
        {
          "name": "left_vignette",
          "direction": "left",
          "rect": { "x": 0.02, "y": 0.30, "w": 0.06, "h": 0.40 }
        }
      ]
    }
  ]
}
```

Direction note:
- `rois[].direction` is optional.
- If omitted, the integration should treat the hit as **random/no-direction** for mapping purposes.

---

## 4) Reset-to-preset defaults

Reset behavior is defined as:
- Replace the stored profile’s `profile` with the bundled preset’s `profile`
- Preserve the stored wrapper `id`, but update `updatedAt`
- Optionally keep a backup copy in UI memory only (not required by schema)

