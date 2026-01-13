import type { ScreenHealthPreset } from "../screenHealthPresets";

const preset: ScreenHealthPreset = {
  preset_id: "chivalry2_red_vignette_v1",
  display_name: "Chivalry 2 — Red damage vignette (v1)",
  profile: {
    schema_version: 0,
    name: "Chivalry 2 — Red damage vignette",
    meta: {
      preset_id: "chivalry2_red_vignette_v1",
      game_name: "Chivalry 2",
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
        threshold: { min_score: 0.25 },
        rois: [
          
          {
            name: "front-left",
            direction: "front_left",
            rect: { x: 0.0, y: 0.0, w: 0.1, h: 0.02 },
          },
          {
            name: "front-center",
            direction: "front",
            rect: { x: 0.30, y: 0.0, w: 0.1, h: 0.1 },
          },
          {
            name: "front-right",
            direction: "front_right",
            rect: { x: 0.8, y: 0.0, w: 0.2, h: 0.02 },
          },
          {
            name: "left",
            direction: "left",
            rect: { x: 0.0, y: 0.1, w: 0.02, h: 0.8 },
          },
          {
            name: "right",
            direction: "right",
            rect: { x: 0.98, y: 0.1, w: 0.02, h: 0.8 },
          },
          
          {
            name: "back-left",
            direction: "back_left",
            rect: { x: 0.0, y: 0.98, w: 0.2, h: 0.02 },
          },
          {
            name: "back",
            direction: "back",
            rect: { x: 0.4, y: 0.98, w: 0.2, h: 0.02 },
          },
          {
            name: "back-right",
            direction: "back_right",
            rect: { x: 0.8, y: 0.98, w: 0.2, h: 0.02 },
          },
        ],
      },
    ],
  },
};

export default preset;

