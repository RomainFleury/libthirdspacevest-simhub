export type DetectorType = "redness_rois" | "color_vignette" | "health_bar" | "health_number";

/** Solenoid recoil channel (independent of damage detectors). */
export type RecoilType = "off" | "ammo_number" | "fill_up_bar";

/** Which ROI the calibration canvas drag currently edits. */
export type CanvasEditTarget = "detector" | "recoil";

/** What the next drag on the screenshot creates. */
export type DrawingMaterial = DetectorType | "ammo_number" | "fill_up_bar";

export type RoiRect = { x: number; y: number; w: number; h: number };

export type RoiDraft = {
  name: string;
  direction?: string | null;
  rect: RoiRect;
};

export type HealthBarMode = "color_sampling" | "threshold_fallback";
export type HealthBarFallbackMode = "brightness" | "saturation";

export type HealthNumberTestResult = { value: number | null; digits?: string; reason?: string } | null;

