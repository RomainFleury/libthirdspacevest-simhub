import type { ScreenHealthPreset } from "../screenHealthPresets";

const preset: ScreenHealthPreset = {
  preset_id: "ea_battlefront_2_2017_red_vignette_v1",
  display_name: "EA Battlefront II (2017) — Red damage vignette (v1)",
  profile: {
    schema_version: 0,
    name: "EA Battlefront II (2017) — Red damage vignette",
    meta: {
      preset_id: "ea_battlefront_2_2017_red_vignette_v1",
      game_name: "EA Battlefront II (2017)",
      preset_version: 1,
      last_verified_at: null,
      recommended: {
        resolution: "1920x1080",
        aspect_ratio: "16:9",
        hud_scale: "100%",
        display_mode: "borderless",
      },
      hints: [
        "Use borderless/windowed mode.",
        "Disable color filters that alter reds.",
        "If your HUD scale differs, capture a screenshot and adjust ROIs.",
      ],
      notes: "Placeholder ROI values; needs calibration.",
    },
    capture: { source: "monitor", monitor_index: 1, tick_ms: 50 },
    detectors: [
      {
        type: "redness_rois",
        cooldown_ms: 200,
        threshold: { min_score: 0.20 },
        rois: [
          // Placeholder: left edge vignette-ish area
          {
            name: "left_vignette",
            direction: "left",
            rect: { x: 0.0, y: 0.15, w: 0.03, h: 0.4 },
          },
          // Placeholder: right edge vignette-ish area
          {
            name: "right_vignette",
            direction: "right",
            rect: { x: 0.97, y: 0.15, w: 0.03, h: 0.4 },
          },
        ],
      },
    ],
  },
};

export default preset;

