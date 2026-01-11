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
import eaBattlefront2_2017_RedVignette from "./screenHealthPresets/ea_battlefront_2_2017_red_vignette";
import gtavHealthBar from "./screenHealthPresets/gtav_health_bar";

export const SCREEN_HEALTH_PRESETS: ScreenHealthPreset[] = [eaBattlefront2_2017_RedVignette, gtavHealthBar];

