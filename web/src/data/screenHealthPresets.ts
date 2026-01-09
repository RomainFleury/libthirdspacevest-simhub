export type ScreenHealthPreset = {
  preset_id: string;
  display_name: string;
  profile: Record<string, any>;
};

/**
 * Phase B: bundled, game-specific presets.
 *
 * These are templates shipped with the app. On install, they should be copied
 * into user storage as editable profiles.
 *
 * NOTE: Some presets may contain placeholder ROIs; see per-preset meta.notes.
 */
export const SCREEN_HEALTH_PRESETS: ScreenHealthPreset[] = [
  {
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
          threshold: { min_score: 0.35 },
          rois: [
            // Placeholder: left edge vignette-ish area
            {
              name: "left_vignette",
              direction: "left",
              rect: { x: 0.0, y: 0.25, w: 0.06, h: 0.5 },
            },
            // Placeholder: right edge vignette-ish area
            {
              name: "right_vignette",
              direction: "right",
              rect: { x: 0.94, y: 0.25, w: 0.06, h: 0.5 },
            },
          ],
        },
      ],
    },
  },
  {
    preset_id: "gtav_health_bar_v1",
    display_name: "Grand Theft Auto V — Health bar (v1)",
    profile: {
      schema_version: 0,
      name: "Grand Theft Auto V — Health bar",
      meta: {
        preset_id: "gtav_health_bar_v1",
        game_name: "Grand Theft Auto V",
        preset_version: 1,
        last_verified_at: null,
        recommended: {
          resolution: "1920x1080",
          aspect_ratio: "16:9",
          hud_scale: "default",
          display_mode: "borderless",
        },
        hints: [
          "Use borderless/windowed mode for reliable capture.",
          "If your HUD scale differs, capture a screenshot and adjust the ROI.",
          "If detection is noisy, re-sample filled/empty colors and adjust tolerance_l1.",
        ],
        notes: "Calibrated from a 1920x1080 screenshot. Green health bar bottom-left.",
      },
      capture: { source: "monitor", monitor_index: 1, tick_ms: 50 },
      detectors: [
        {
          type: "health_bar",
          name: "health_bar",
          // ROI padded slightly around the bar for robustness (derived from px coords).
          roi: { x: 0.045833, y: 0.940741, w: 0.070833, h: 0.012037 },
          orientation: "horizontal",
          color_sampling: {
            filled_rgb: [105, 157, 93],
            empty_rgb: [42, 64, 37],
            tolerance_l1: 110,
          },
          hit_on_decrease: { min_drop: 0.02, cooldown_ms: 150 },
        },
      ],
    },
  },
];

