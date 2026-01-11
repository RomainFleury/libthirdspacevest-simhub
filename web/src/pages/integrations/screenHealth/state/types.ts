export type DetectorType = "redness_rois" | "health_bar" | "health_number";

export type RoiDraft = {
  name: string;
  direction?: string | null;
  rect: { x: number; y: number; w: number; h: number };
};

export type HealthBarMode = "color_sampling" | "threshold_fallback";
export type HealthBarFallbackMode = "brightness" | "saturation";

export type HealthNumberTestResult = { value: number | null; digits?: string; reason?: string } | null;

export type ScreenHealthDraftState = {
  // UI
  selectedPresetId: string;
  detectorType: DetectorType;
  colorPickMode: null | "filled" | "empty";

  // Profile
  profileName: string;
  monitorIndex: number;
  tickMs: number;

  // Redness
  redness: {
    minScore: number;
    cooldownMs: number;
    rois: RoiDraft[];
  };

  // Health bar
  healthBar: {
    roi: { x: number; y: number; w: number; h: number } | null;
    mode: HealthBarMode;
    filledRgb: [number, number, number];
    emptyRgb: [number, number, number];
    toleranceL1: number;
    fallbackMode: HealthBarFallbackMode;
    fallbackMin: number;
    hitMinDrop: number;
    hitCooldownMs: number;
  };

  // Health number OCR
  healthNumber: {
    roi: { x: number; y: number; w: number; h: number } | null;
    digits: number;
    invert: boolean;
    threshold: number;
    scale: number;
    readMin: number;
    readMax: number;
    stableReads: number;
    hitMinDrop: number;
    hitCooldownMs: number;
    hammingMax: number;
    templateSize: { w: number; h: number };
    templates: Record<string, string>;
    learnValue: string;
    calibrationError: string | null;
    testResult: HealthNumberTestResult;
  };
};

