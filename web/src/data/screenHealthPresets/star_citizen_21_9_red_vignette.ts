import type { ScreenHealthPreset } from "../screenHealthPresets";
import exampleScreenshotUrl from "./star_citizen_21_9.png";
import calibrationScreenshot from "./star_citizen_21_9_calibration_screenshot.json";

const preset: ScreenHealthPreset = {
  preset_id: "star_citizen_21_9_red_vignette_v2",
  display_name: "Star Citizen — Red vignette + ammo (21:9)",
  exampleScreenshotUrl,
  profile: {
    schema_version: 0,
    name: "Star Citizen 21:9",
    meta: {
      preset_id: "star_citizen_21_9_red_vignette_v2",
      calibration_screenshot: calibrationScreenshot,
      game_name: "Star Citizen",
      preset_version: 2,
      last_verified_at: null,
      recommended: {
        resolution: "ultrawide",
        aspect_ratio: "21:9",
        hud_scale: "default",
        display_mode: "borderless",
      },
      hints: [
        "Calibrated for 21:9. Recapture and redraw boxes if your HUD scale or resolution differs.",
        "Use borderless/windowed mode for reliable capture.",
        "Red vignette uses thin left/right/top/bottom edge boxes; ammo is the magazine counter.",
      ],
      notes: "User-calibrated 21:9 v2 profile: four-edge redness ROIs plus ammo-number recoil.",
    },
    capture: { source: "monitor", monitor_index: 1, tick_ms: 30 },
    detectors: [
      {
        type: "redness_rois",
        cooldown_ms: 200,
        threshold: { min_score: 0.35 },
        rois: [
          {
            name: "left",
            direction: "left",
            rect: { x: 0, y: 0.3, w: 0.01, h: 0.3 },
          },
          {
            name: "right",
            direction: "right",
            rect: { x: 0.99, y: 0.3, w: 0.01, h: 0.3 },
          },
          {
            name: "roi_3",
            rect: { x: 0.3, y: 0, w: 0.3, h: 0.01 },
          },
          {
            name: "roi_4",
            rect: { x: 0.3, y: 0.99, w: 0.3, h: 0.01 },
          },
        ],
      },
    ],
    recoil: {
      type: "ammo_number",
      engine: "daemon",
      duration_ms: 40,
      roi: { x: 0.710041, y: 0.822427, w: 0.035861, h: 0.053849 },
      digits: 3,
      readout: { min: 0, max: 999, stable_reads: 2 },
      hit_on_decrease: { min_drop: 1, cooldown_ms: 50 },
    },
  },
};

export default preset;
