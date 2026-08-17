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
import chivalry2RedVignette from "./screenHealthPresets/chivalry2_red_vignette";
import starCitizen21_9RedVignette from "./screenHealthPresets/star_citizen_21_9_red_vignette";
import ut2004RedVignette from "./screenHealthPresets/ut2004_red_vignette";

export const SCREEN_HEALTH_PRESETS: ScreenHealthPreset[] = [
  chivalry2RedVignette,
  eaBattlefront2_2017_RedVignette,
  gtavHealthBar,
  starCitizen21_9RedVignette,
  ut2004RedVignette,
];

