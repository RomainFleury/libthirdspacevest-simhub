import type { DetectorType } from "./draft/types";

export type DrawnSetup = {
  hasRedness: boolean;
  hasColorVignette: boolean;
  hasHealthBar: boolean;
  hasHealthNumber: boolean;
  hasAmmo: boolean;
  hitCount: number;
};

export function getDrawnSetup(args: {
  rednessRois: unknown[];
  colorVignetteRois?: unknown[];
  healthBarRoi: unknown;
  healthNumberRoi: unknown;
  ammoRoi: unknown;
}): DrawnSetup {
  const hasRedness = args.rednessRois.length > 0;
  const hasColorVignette = (args.colorVignetteRois?.length ?? 0) > 0;
  const hasHealthBar = Boolean(args.healthBarRoi);
  const hasHealthNumber = Boolean(args.healthNumberRoi);
  const hasAmmo = Boolean(args.ammoRoi);
  return {
    hasRedness,
    hasColorVignette,
    hasHealthBar,
    hasHealthNumber,
    hasAmmo,
    hitCount:
      Number(hasRedness) + Number(hasColorVignette) + Number(hasHealthBar) + Number(hasHealthNumber),
  };
}

/** Which hit detector is locked, if any boxes of that kind exist. */
export function lockedHitDetectorType(drawn: DrawnSetup): DetectorType | null {
  if (drawn.hasHealthBar) return "health_bar";
  if (drawn.hasHealthNumber) return "health_number";
  if (drawn.hasColorVignette) return "color_vignette";
  if (drawn.hasRedness) return "redness_rois";
  return null;
}
