import { DEFAULT_RECOIL_DRAFT, type RecoilDraftState } from "./draft/RecoilDraftContext";

/** Build recoil draft fields from a daemon profile JSON object. */
export function recoilDraftFromProfile(p: any): Partial<RecoilDraftState> {
  const r = p?.recoil;
  if (!r || typeof r !== "object" || r.type === "off" || !r.type) {
    return {
      recoilType: "off",
      durationMs: DEFAULT_RECOIL_DRAFT.durationMs,
      calibrationError: null,
      testResult: null,
    };
  }

  if (r.type !== "ammo_number") {
    return { recoilType: "off", calibrationError: null, testResult: null };
  }

  return {
    recoilType: "ammo_number",
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
    calibrationError: null,
    testResult: null,
  };
}
