export type DetectorType = "redness_rois" | "health_bar" | "health_number";

export type RoiRect = { x: number; y: number; w: number; h: number };

export type RoiDraft = {
  name: string;
  direction?: string | null;
  rect: RoiRect;
};

export type HealthBarMode = "color_sampling" | "threshold_fallback";
export type HealthBarFallbackMode = "brightness" | "saturation";

export type HealthNumberTestResult = { value: number | null; digits?: string; reason?: string } | null;

