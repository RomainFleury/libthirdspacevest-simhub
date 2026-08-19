import { recoilDraftFromProfile } from "./recoilFromProfile";
import type { DetectorType, RoiDraft } from "./draft/types";
import { clampInt } from "./utils";

function roisFromDetector(d: any): RoiDraft[] {
  return (Array.isArray(d?.rois) ? d.rois : []).map((r: any, idx: number) => ({
    name: String(r.name || `roi_${idx}`),
    direction: r.direction || "",
    rect: {
      x: Number(r.rect?.x ?? 0),
      y: Number(r.rect?.y ?? 0),
      w: Number(r.rect?.w ?? 0.1),
      h: Number(r.rect?.h ?? 0.1),
    },
  }));
}

function rgbFrom(raw: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(raw) || raw.length !== 3) return fallback;
  return [
    clampInt(Number(raw[0]), 0, 255),
    clampInt(Number(raw[1]), 0, 255),
    clampInt(Number(raw[2]), 0, 255),
  ];
}

export type ApplyDetectorsCtx = {
  setDetectorType: (v: DetectorType) => void;
  replaceRednessDraft: (next: Record<string, unknown>) => void;
  replaceColorVignetteDraft: (next: Record<string, unknown>) => void;
  replaceHealthBarDraft: (next: Record<string, unknown>) => void;
  replaceHealthNumberDraft: (next: Record<string, unknown>) => void;
  replaceRecoilDraft: (next: ReturnType<typeof recoilDraftFromProfile>) => void;
  setColorPickMode: (v: null) => void;
};

/** Load hit + ammo drafts from a daemon profile. Clears unused hit types. */
export function applyDetectorsFromProfile(p: any, ctx: ApplyDetectorsCtx): void {
  const detectors: any[] = Array.isArray(p.detectors) ? p.detectors : [];
  const hbD = detectors.find((d: any) => d.type === "health_bar");
  const hnD = detectors.find((d: any) => d.type === "health_number");
  const cvD = detectors.find((d: any) => d.type === "color_vignette");
  const redD = detectors.find((d: any) => d.type === "redness_rois");

  ctx.replaceRednessDraft({ rois: [] });
  ctx.replaceColorVignetteDraft({ rois: [], pickingColor: false });
  ctx.replaceHealthBarDraft({ roi: null, colorPickMode: null });
  ctx.replaceHealthNumberDraft({ roi: null });
  ctx.setColorPickMode(null);

  if (hnD) {
    ctx.setDetectorType("health_number");
    ctx.replaceHealthNumberDraft({
      roi: {
        x: Number(hnD.roi?.x ?? 0),
        y: Number(hnD.roi?.y ?? 0),
        w: Number(hnD.roi?.w ?? 0.12),
        h: Number(hnD.roi?.h ?? 0.06),
      },
      digits: Number(hnD.digits ?? 3),
      invert: Boolean(hnD.preprocess?.invert ?? false),
      threshold: Number(hnD.preprocess?.threshold ?? 0.6),
      scale: Number(hnD.preprocess?.scale ?? 2),
      readMin: Number(hnD.readout?.min ?? 0),
      readMax: Number(hnD.readout?.max ?? 300),
      stableReads: Number(hnD.readout?.stable_reads ?? 2),
      hitMinDrop: Number(hnD.hit_on_decrease?.min_drop ?? 1),
      hitCooldownMs: Number(hnD.hit_on_decrease?.cooldown_ms ?? 150),
      hammingMax: Number(hnD.templates?.hamming_max ?? 120),
      templateSize: {
        w: Number(hnD.templates?.width ?? 16),
        h: Number(hnD.templates?.height ?? 24),
      },
      templates: (hnD.templates?.digits && typeof hnD.templates.digits === "object" ? hnD.templates.digits : {}) as Record<
        string,
        unknown
      >,
      calibrationError: null,
      testResult: null,
    });
  } else if (hbD) {
    ctx.setDetectorType("health_bar");
    ctx.replaceHealthBarDraft({
      roi: {
        x: Number(hbD.roi?.x ?? 0),
        y: Number(hbD.roi?.y ?? 0),
        w: Number(hbD.roi?.w ?? 0.3),
        h: Number(hbD.roi?.h ?? 0.03),
      },
      mode: hbD.color_sampling ? "color_sampling" : hbD.threshold_fallback ? "threshold_fallback" : "color_sampling",
      filledRgb: rgbFrom(hbD.color_sampling?.filled_rgb, [220, 40, 40]),
      emptyRgb: rgbFrom(hbD.color_sampling?.empty_rgb, [40, 40, 40]),
      toleranceL1: clampInt(Number(hbD.color_sampling?.tolerance_l1 ?? 120), 0, 765),
      fallbackMode: (hbD.threshold_fallback?.mode as string) || "brightness",
      fallbackMin: Number(hbD.threshold_fallback?.min ?? 0.5),
      hitMinDrop: Number(hbD.hit_on_decrease?.min_drop ?? 0.02),
      hitCooldownMs: Number(hbD.hit_on_decrease?.cooldown_ms ?? 150),
      colorPickMode: null,
    });
  } else if (cvD) {
    ctx.setDetectorType("color_vignette");
    ctx.replaceColorVignetteDraft({
      minScore: Number(cvD.threshold?.min_score ?? 0.35),
      cooldownMs: Number(cvD.cooldown_ms ?? 200),
      targetRgb: rgbFrom(cvD.target_rgb ?? cvD.color_rgb ?? cvD.target, [220, 40, 40]),
      toleranceL1: clampInt(Number(cvD.tolerance_l1 ?? 120), 0, 765),
      pickingColor: false,
      rois: roisFromDetector(cvD),
    });
  } else {
    ctx.setDetectorType("redness_rois");
    ctx.replaceRednessDraft({
      minScore: Number(redD?.threshold?.min_score ?? 0.35),
      cooldownMs: Number(redD?.cooldown_ms ?? 200),
      rois: roisFromDetector(redD),
    });
  }

  ctx.replaceRecoilDraft(recoilDraftFromProfile(p));
}
