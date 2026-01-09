import type {
  DetectorType,
  HealthBarFallbackMode,
  HealthBarMode,
  HealthNumberTestResult,
  RoiDraft,
  ScreenHealthDraftState,
} from "./types";

export type ScreenHealthDraftAction =
  | { type: "setSelectedPresetId"; value: string }
  | { type: "setDetectorType"; value: DetectorType }
  | { type: "setColorPickMode"; value: null | "filled" | "empty" }
  | { type: "setProfileName"; value: string }
  | { type: "setMonitorIndex"; value: number }
  | { type: "setTickMs"; value: number }
  | { type: "setRednessMinScore"; value: number }
  | { type: "setRednessCooldownMs"; value: number }
  | { type: "setRednessRois"; value: RoiDraft[] }
  | { type: "updateRednessRoi"; index: number; patch: Partial<RoiDraft> }
  | { type: "removeRednessRoi"; index: number }
  | { type: "setHealthBarRoi"; value: ScreenHealthDraftState["healthBar"]["roi"] }
  | { type: "setHealthBarMode"; value: HealthBarMode }
  | { type: "setHealthBarFilledRgb"; value: [number, number, number] }
  | { type: "setHealthBarEmptyRgb"; value: [number, number, number] }
  | { type: "setHealthBarToleranceL1"; value: number }
  | { type: "setHealthBarFallbackMode"; value: HealthBarFallbackMode }
  | { type: "setHealthBarFallbackMin"; value: number }
  | { type: "setHealthBarHitMinDrop"; value: number }
  | { type: "setHealthBarHitCooldownMs"; value: number }
  | { type: "setHealthNumberRoi"; value: ScreenHealthDraftState["healthNumber"]["roi"] }
  | { type: "setHealthNumberDigits"; value: number }
  | { type: "setHealthNumberInvert"; value: boolean }
  | { type: "setHealthNumberThreshold"; value: number }
  | { type: "setHealthNumberScale"; value: number }
  | { type: "setHealthNumberReadMin"; value: number }
  | { type: "setHealthNumberReadMax"; value: number }
  | { type: "setHealthNumberStableReads"; value: number }
  | { type: "setHealthNumberHitMinDrop"; value: number }
  | { type: "setHealthNumberHitCooldownMs"; value: number }
  | { type: "setHealthNumberHammingMax"; value: number }
  | { type: "setHealthNumberTemplateSize"; value: { w: number; h: number } }
  | { type: "setHealthNumberTemplates"; value: Record<string, string> }
  | { type: "setHealthNumberLearnValue"; value: string }
  | { type: "setHealthNumberCalibrationError"; value: string | null }
  | { type: "setHealthNumberTestResult"; value: HealthNumberTestResult }
  | { type: "initFromActiveProfile"; value: any; wrapperName?: string };

export function createInitialDraftState(defaultPresetId: string): ScreenHealthDraftState {
  return {
    selectedPresetId: defaultPresetId,
    detectorType: "redness_rois",
    colorPickMode: null,
    profileName: "Default",
    monitorIndex: 1,
    tickMs: 50,
    redness: { minScore: 0.35, cooldownMs: 200, rois: [] },
    healthBar: {
      roi: null,
      mode: "color_sampling",
      filledRgb: [220, 40, 40],
      emptyRgb: [40, 40, 40],
      toleranceL1: 120,
      fallbackMode: "brightness",
      fallbackMin: 0.5,
      hitMinDrop: 0.02,
      hitCooldownMs: 150,
    },
    healthNumber: {
      roi: null,
      digits: 3,
      invert: false,
      threshold: 0.6,
      scale: 2,
      readMin: 0,
      readMax: 300,
      stableReads: 2,
      hitMinDrop: 1,
      hitCooldownMs: 150,
      hammingMax: 120,
      templateSize: { w: 16, h: 24 },
      templates: {},
      learnValue: "",
      calibrationError: null,
      testResult: null,
    },
  };
}

export function screenHealthDraftReducer(state: ScreenHealthDraftState, action: ScreenHealthDraftAction): ScreenHealthDraftState {
  switch (action.type) {
    case "setSelectedPresetId":
      return { ...state, selectedPresetId: action.value };
    case "setDetectorType":
      return { ...state, detectorType: action.value };
    case "setColorPickMode":
      return { ...state, colorPickMode: action.value };
    case "setProfileName":
      return { ...state, profileName: action.value };
    case "setMonitorIndex":
      return { ...state, monitorIndex: action.value };
    case "setTickMs":
      return { ...state, tickMs: action.value };
    case "setRednessMinScore":
      return { ...state, redness: { ...state.redness, minScore: action.value } };
    case "setRednessCooldownMs":
      return { ...state, redness: { ...state.redness, cooldownMs: action.value } };
    case "setRednessRois":
      return { ...state, redness: { ...state.redness, rois: action.value } };
    case "updateRednessRoi":
      return {
        ...state,
        redness: {
          ...state.redness,
          rois: state.redness.rois.map((r, i) => (i === action.index ? { ...r, ...action.patch } : r)),
        },
      };
    case "removeRednessRoi":
      return { ...state, redness: { ...state.redness, rois: state.redness.rois.filter((_, i) => i !== action.index) } };

    case "setHealthBarRoi":
      return { ...state, healthBar: { ...state.healthBar, roi: action.value } };
    case "setHealthBarMode":
      return { ...state, healthBar: { ...state.healthBar, mode: action.value } };
    case "setHealthBarFilledRgb":
      return { ...state, healthBar: { ...state.healthBar, filledRgb: action.value } };
    case "setHealthBarEmptyRgb":
      return { ...state, healthBar: { ...state.healthBar, emptyRgb: action.value } };
    case "setHealthBarToleranceL1":
      return { ...state, healthBar: { ...state.healthBar, toleranceL1: action.value } };
    case "setHealthBarFallbackMode":
      return { ...state, healthBar: { ...state.healthBar, fallbackMode: action.value } };
    case "setHealthBarFallbackMin":
      return { ...state, healthBar: { ...state.healthBar, fallbackMin: action.value } };
    case "setHealthBarHitMinDrop":
      return { ...state, healthBar: { ...state.healthBar, hitMinDrop: action.value } };
    case "setHealthBarHitCooldownMs":
      return { ...state, healthBar: { ...state.healthBar, hitCooldownMs: action.value } };

    case "setHealthNumberRoi":
      return { ...state, healthNumber: { ...state.healthNumber, roi: action.value } };
    case "setHealthNumberDigits":
      return { ...state, healthNumber: { ...state.healthNumber, digits: action.value } };
    case "setHealthNumberInvert":
      return { ...state, healthNumber: { ...state.healthNumber, invert: action.value } };
    case "setHealthNumberThreshold":
      return { ...state, healthNumber: { ...state.healthNumber, threshold: action.value } };
    case "setHealthNumberScale":
      return { ...state, healthNumber: { ...state.healthNumber, scale: action.value } };
    case "setHealthNumberReadMin":
      return { ...state, healthNumber: { ...state.healthNumber, readMin: action.value } };
    case "setHealthNumberReadMax":
      return { ...state, healthNumber: { ...state.healthNumber, readMax: action.value } };
    case "setHealthNumberStableReads":
      return { ...state, healthNumber: { ...state.healthNumber, stableReads: action.value } };
    case "setHealthNumberHitMinDrop":
      return { ...state, healthNumber: { ...state.healthNumber, hitMinDrop: action.value } };
    case "setHealthNumberHitCooldownMs":
      return { ...state, healthNumber: { ...state.healthNumber, hitCooldownMs: action.value } };
    case "setHealthNumberHammingMax":
      return { ...state, healthNumber: { ...state.healthNumber, hammingMax: action.value } };
    case "setHealthNumberTemplateSize":
      return { ...state, healthNumber: { ...state.healthNumber, templateSize: action.value } };
    case "setHealthNumberTemplates":
      return { ...state, healthNumber: { ...state.healthNumber, templates: action.value } };
    case "setHealthNumberLearnValue":
      return { ...state, healthNumber: { ...state.healthNumber, learnValue: action.value } };
    case "setHealthNumberCalibrationError":
      return { ...state, healthNumber: { ...state.healthNumber, calibrationError: action.value } };
    case "setHealthNumberTestResult":
      return { ...state, healthNumber: { ...state.healthNumber, testResult: action.value } };

    case "initFromActiveProfile": {
      const p: any = action.value || {};
      const wrapperName = action.wrapperName;

      const next: ScreenHealthDraftState = {
        ...state,
        profileName: wrapperName || p.name || state.profileName,
        monitorIndex: Number(p.capture?.monitor_index || state.monitorIndex),
        tickMs: Number(p.capture?.tick_ms || state.tickMs),
      };

      const detectors: any[] = Array.isArray(p.detectors) ? p.detectors : [];
      const hb = detectors.find((d: any) => d.type === "health_bar");
      const hn = detectors.find((d: any) => d.type === "health_number");
      const red = detectors.find((d: any) => d.type === "redness_rois");

      if (hn) {
        next.detectorType = "health_number";
        next.healthNumber.roi = {
          x: Number(hn.roi?.x ?? 0),
          y: Number(hn.roi?.y ?? 0),
          w: Number(hn.roi?.w ?? 0.12),
          h: Number(hn.roi?.h ?? 0.06),
        };
        next.healthNumber.digits = Number(hn.digits ?? next.healthNumber.digits);
        next.healthNumber.invert = Boolean(hn.preprocess?.invert ?? next.healthNumber.invert);
        next.healthNumber.threshold = Number(hn.preprocess?.threshold ?? next.healthNumber.threshold);
        next.healthNumber.scale = Number(hn.preprocess?.scale ?? next.healthNumber.scale);
        next.healthNumber.readMin = Number(hn.readout?.min ?? next.healthNumber.readMin);
        next.healthNumber.readMax = Number(hn.readout?.max ?? next.healthNumber.readMax);
        next.healthNumber.stableReads = Number(hn.readout?.stable_reads ?? next.healthNumber.stableReads);
        next.healthNumber.hitMinDrop = Number(hn.hit_on_decrease?.min_drop ?? next.healthNumber.hitMinDrop);
        next.healthNumber.hitCooldownMs = Number(hn.hit_on_decrease?.cooldown_ms ?? next.healthNumber.hitCooldownMs);
        next.healthNumber.hammingMax = Number(hn.templates?.hamming_max ?? next.healthNumber.hammingMax);
        next.healthNumber.templateSize = {
          w: Number(hn.templates?.width ?? next.healthNumber.templateSize.w),
          h: Number(hn.templates?.height ?? next.healthNumber.templateSize.h),
        };
        const digitsMap = hn.templates?.digits;
        const tmpl: Record<string, string> = {};
        if (digitsMap && typeof digitsMap === "object") {
          for (const k of Object.keys(digitsMap)) {
            const v = (digitsMap as any)[k];
            if (typeof v === "string") tmpl[String(k)] = v;
          }
        }
        next.healthNumber.templates = tmpl;
        next.healthNumber.calibrationError = null;
        next.healthNumber.testResult = null;
        next.colorPickMode = null;
        return next;
      }

      if (hb) {
        next.detectorType = "health_bar";
        next.healthBar.roi = {
          x: Number(hb.roi?.x ?? 0),
          y: Number(hb.roi?.y ?? 0),
          w: Number(hb.roi?.w ?? 0.3),
          h: Number(hb.roi?.h ?? 0.03),
        };
        const cs = hb.color_sampling;
        const fb = hb.threshold_fallback;
        if (cs) next.healthBar.mode = "color_sampling";
        else if (fb) next.healthBar.mode = "threshold_fallback";
        if (Array.isArray(cs?.filled_rgb) && cs.filled_rgb.length === 3) {
          next.healthBar.filledRgb = [Number(cs.filled_rgb[0]), Number(cs.filled_rgb[1]), Number(cs.filled_rgb[2])] as any;
        }
        if (Array.isArray(cs?.empty_rgb) && cs.empty_rgb.length === 3) {
          next.healthBar.emptyRgb = [Number(cs.empty_rgb[0]), Number(cs.empty_rgb[1]), Number(cs.empty_rgb[2])] as any;
        }
        next.healthBar.toleranceL1 = Number(cs?.tolerance_l1 ?? next.healthBar.toleranceL1);
        if (fb) {
          next.healthBar.fallbackMode = (fb.mode as HealthBarFallbackMode) || next.healthBar.fallbackMode;
          next.healthBar.fallbackMin = Number(fb.min ?? next.healthBar.fallbackMin);
        }
        next.healthBar.hitMinDrop = Number(hb.hit_on_decrease?.min_drop ?? next.healthBar.hitMinDrop);
        next.healthBar.hitCooldownMs = Number(hb.hit_on_decrease?.cooldown_ms ?? next.healthBar.hitCooldownMs);
        next.colorPickMode = null;
        return next;
      }

      next.detectorType = "redness_rois";
      next.redness.minScore = Number(red?.threshold?.min_score ?? next.redness.minScore);
      next.redness.cooldownMs = Number(red?.cooldown_ms ?? next.redness.cooldownMs);
      const srcRois: any[] = Array.isArray(red?.rois) ? red.rois : [];
      next.redness.rois = srcRois.map((r, idx) => ({
        name: String(r.name || `roi_${idx}`),
        direction: r.direction || "",
        rect: {
          x: Number(r.rect?.x ?? 0),
          y: Number(r.rect?.y ?? 0),
          w: Number(r.rect?.w ?? 0.1),
          h: Number(r.rect?.h ?? 0.1),
        },
      }));
      return next;
    }
    default:
      return state;
  }
}

