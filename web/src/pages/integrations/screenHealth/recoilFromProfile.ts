import { DEFAULT_RECOIL_DRAFT, type RecoilDraftState } from "./draft/RecoilDraftContext";
import { DEFAULT_AMMO_OCR_ENGINE, normalizeAmmoOcrEngine } from "./ammoOcrEngines";

function rgbFrom(raw: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(raw) || raw.length !== 3) return fallback;
  return [
    Math.max(0, Math.min(255, Number(raw[0]) || 0)),
    Math.max(0, Math.min(255, Number(raw[1]) || 0)),
    Math.max(0, Math.min(255, Number(raw[2]) || 0)),
  ];
}

/** Build recoil draft fields from a daemon profile JSON object. */
export function recoilDraftFromProfile(p: any): Partial<RecoilDraftState> {
  const r = p?.recoil;
  if (!r || typeof r !== "object" || r.type === "off" || !r.type) {
    return {
      recoilType: "off",
      recoilDrawKind: DEFAULT_RECOIL_DRAFT.recoilDrawKind,
      ocrEngine: DEFAULT_AMMO_OCR_ENGINE,
      durationMs: DEFAULT_RECOIL_DRAFT.durationMs,
      roi: null,
      colorPickMode: null,
      calibrationError: null,
      testResult: null,
      fillUpTestResult: null,
    };
  }

  if (r.type === "fill_up_bar") {
    const colors = r.color_sampling && typeof r.color_sampling === "object" ? r.color_sampling : r;
    const fillUp = r.fill_up && typeof r.fill_up === "object" ? r.fill_up : {};
    return {
      recoilType: "fill_up_bar",
      recoilDrawKind: "fill_up_bar",
      durationMs: Number(r.duration_ms ?? DEFAULT_RECOIL_DRAFT.durationMs),
      roi: {
        x: Number(r.roi?.x ?? 0),
        y: Number(r.roi?.y ?? 0),
        w: Number(r.roi?.w ?? 0.16),
        h: Number(r.roi?.h ?? 0.03),
      },
      filledRgb: rgbFrom(colors.filled_rgb, DEFAULT_RECOIL_DRAFT.filledRgb),
      emptyRgb: rgbFrom(colors.empty_rgb, DEFAULT_RECOIL_DRAFT.emptyRgb),
      overheatRgb: rgbFrom(colors.overheat_rgb, DEFAULT_RECOIL_DRAFT.overheatRgb),
      toleranceL1: Number(colors.tolerance_l1 ?? r.tolerance_l1 ?? DEFAULT_RECOIL_DRAFT.toleranceL1),
      minRise: Number(fillUp.min_rise ?? r.min_rise ?? DEFAULT_RECOIL_DRAFT.minRise),
      hitCooldownMs: Number(fillUp.cooldown_ms ?? r.cooldown_ms ?? DEFAULT_RECOIL_DRAFT.hitCooldownMs),
      overheatMinScore: Number(
        fillUp.overheat_min_score ?? r.overheat_min_score ?? DEFAULT_RECOIL_DRAFT.overheatMinScore
      ),
      emptyThreshold: Number(fillUp.empty_threshold ?? r.empty_threshold ?? DEFAULT_RECOIL_DRAFT.emptyThreshold),
      colorPickMode: null,
      calibrationError: null,
      testResult: null,
      fillUpTestResult: null,
    };
  }

  if (r.type !== "ammo_number") {
    return { recoilType: "off", ocrEngine: DEFAULT_AMMO_OCR_ENGINE, calibrationError: null, testResult: null };
  }

  return {
    recoilType: "ammo_number",
    recoilDrawKind: "ammo_number",
    ocrEngine: normalizeAmmoOcrEngine(r.engine),
    durationMs: Number(r.duration_ms ?? DEFAULT_RECOIL_DRAFT.durationMs),
    roi: {
      x: Number(r.roi?.x ?? 0),
      y: Number(r.roi?.y ?? 0),
      w: Number(r.roi?.w ?? 0.08),
      h: Number(r.roi?.h ?? 0.04),
    },
    stableReads: Number(r.readout?.stable_reads ?? 2),
    hitMinDrop: Number(r.hit_on_decrease?.min_drop ?? 1),
    hitCooldownMs: Number(r.hit_on_decrease?.cooldown_ms ?? 50),
    colorPickMode: null,
    calibrationError: null,
    testResult: null,
    fillUpTestResult: null,
  };
}
