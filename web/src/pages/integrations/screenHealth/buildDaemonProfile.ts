import type { DetectorType } from "./draft/types";
import { clamp01, clampInt } from "./utils";

export type ProfileDraftSnapshot = {
  selectedPresetId: string;
  detectorType: DetectorType;
  profileName: string;
  monitorIndex: number;
  tickMs: number;
};

export type RednessDraftSnapshot = {
  minScore: number;
  cooldownMs: number;
  rois: Array<{ name: string; direction: string; rect: { x: number; y: number; w: number; h: number } }>;
};

export type HealthBarDraftSnapshot = {
  roi: { x: number; y: number; w: number; h: number } | null;
  mode: string;
  filledRgb: number[];
  emptyRgb: number[];
  toleranceL1: number;
  fallbackMode: string;
  fallbackMin: number;
  hitMinDrop: number;
  hitCooldownMs: number;
};

export type HealthNumberDraftSnapshot = {
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
  templates: Record<string, unknown>;
};

export type RecoilDraftSnapshot = {
  recoilType: "off" | "ammo_number";
  durationMs: number;
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
  templates: Record<string, unknown>;
};

function attachRecoil(profile: Record<string, any>, recoil?: RecoilDraftSnapshot): Record<string, any> {
  if (!recoil || recoil.recoilType === "off") {
    return profile;
  }
  const roi = recoil.roi ?? { x: 0.85, y: 0.9, w: 0.08, h: 0.04 };
  return {
    ...profile,
    recoil: {
      type: "ammo_number",
      duration_ms: Math.max(25, Math.floor(recoil.durationMs)),
      roi: { x: clamp01(roi.x), y: clamp01(roi.y), w: clamp01(roi.w), h: clamp01(roi.h) },
      digits: Math.max(1, Math.floor(recoil.digits)),
      preprocess: {
        invert: Boolean(recoil.invert),
        threshold: Math.max(0, Math.min(1, recoil.threshold)),
        scale: Math.max(1, Math.floor(recoil.scale)),
      },
      readout: {
        min: Math.floor(recoil.readMin),
        max: Math.floor(recoil.readMax),
        stable_reads: Math.max(1, Math.floor(recoil.stableReads)),
      },
      templates: {
        template_set_id: "learned_v1",
        hamming_max: Math.max(0, Math.floor(recoil.hammingMax)),
        width: recoil.templateSize.w,
        height: recoil.templateSize.h,
        digits: recoil.templates,
      },
      hit_on_decrease: {
        min_drop: Math.max(1, Math.floor(recoil.hitMinDrop)),
        cooldown_ms: Math.max(0, Math.floor(recoil.hitCooldownMs)),
      },
    },
  };
}

/**
 * Build daemon JSON (schema v0) from current draft snapshots. Used for save, export, and ROI evaluation.
 */
export function buildScreenHealthDaemonProfile(args: {
  profileDraft: ProfileDraftSnapshot;
  redness: RednessDraftSnapshot;
  hb: HealthBarDraftSnapshot;
  hn: HealthNumberDraftSnapshot;
  recoil?: RecoilDraftSnapshot;
  presets: Array<{ preset_id: string; profile: { meta?: unknown } }>;
}): Record<string, any> {
  const { profileDraft, redness, hb, hn, recoil, presets } = args;
  const presetMeta = (presets.find((p) => p.preset_id === profileDraft.selectedPresetId)?.profile as any)?.meta;

  if (profileDraft.detectorType === "health_bar") {
    const roi = hb.roi ?? { x: 0.1, y: 0.9, w: 0.3, h: 0.03 };
    return attachRecoil(
      {
        schema_version: 0,
        name: profileDraft.profileName,
        meta: presetMeta,
        capture: { source: "monitor", monitor_index: profileDraft.monitorIndex, tick_ms: profileDraft.tickMs },
        detectors: [
          {
            type: "health_bar",
            name: "health_bar",
            roi: { x: clamp01(roi.x), y: clamp01(roi.y), w: clamp01(roi.w), h: clamp01(roi.h) },
            orientation: "horizontal",
            ...(hb.mode === "color_sampling"
              ? {
                  color_sampling: {
                    filled_rgb: hb.filledRgb.map((v) => clampInt(v, 0, 255)),
                    empty_rgb: hb.emptyRgb.map((v) => clampInt(v, 0, 255)),
                    tolerance_l1: clampInt(hb.toleranceL1, 0, 765),
                  },
                }
              : {
                  threshold_fallback: {
                    mode: hb.fallbackMode,
                    min: Math.max(0, Math.min(1, hb.fallbackMin)),
                  },
                }),
            hit_on_decrease: {
              min_drop: Math.max(0, Math.min(1, hb.hitMinDrop)),
              cooldown_ms: Math.max(0, Math.floor(hb.hitCooldownMs)),
            },
          },
        ],
      },
      recoil
    );
  }

  if (profileDraft.detectorType === "health_number") {
    const roi = hn.roi ?? { x: 0.05, y: 0.9, w: 0.12, h: 0.06 };
    return attachRecoil(
      {
        schema_version: 0,
        name: profileDraft.profileName,
        meta: presetMeta,
        capture: { source: "monitor", monitor_index: profileDraft.monitorIndex, tick_ms: profileDraft.tickMs },
        detectors: [
          {
            type: "health_number",
            name: "health_number",
            roi: { x: clamp01(roi.x), y: clamp01(roi.y), w: clamp01(roi.w), h: clamp01(roi.h) },
            digits: Math.max(1, Math.floor(hn.digits)),
            preprocess: {
              invert: Boolean(hn.invert),
              threshold: Math.max(0, Math.min(1, hn.threshold)),
              scale: Math.max(1, Math.floor(hn.scale)),
            },
            readout: {
              min: Math.floor(hn.readMin),
              max: Math.floor(hn.readMax),
              stable_reads: Math.max(1, Math.floor(hn.stableReads)),
            },
            templates: {
              template_set_id: "learned_v1",
              hamming_max: Math.max(0, Math.floor(hn.hammingMax)),
              width: hn.templateSize.w,
              height: hn.templateSize.h,
              digits: hn.templates,
            },
            hit_on_decrease: {
              min_drop: Math.max(1, Math.floor(hn.hitMinDrop)),
              cooldown_ms: Math.max(0, Math.floor(hn.hitCooldownMs)),
            },
          },
        ],
      },
      recoil
    );
  }

  return attachRecoil(
    {
      schema_version: 0,
      name: profileDraft.profileName,
      meta: presetMeta,
      capture: { source: "monitor", monitor_index: profileDraft.monitorIndex, tick_ms: profileDraft.tickMs },
      detectors: [
        {
          type: "redness_rois",
          cooldown_ms: redness.cooldownMs,
          threshold: { min_score: redness.minScore },
          rois: redness.rois.map((r) => ({
            name: r.name,
            direction: r.direction || undefined,
            rect: {
              x: clamp01(r.rect.x),
              y: clamp01(r.rect.y),
              w: clamp01(r.rect.w),
              h: clamp01(r.rect.h),
            },
          })),
        },
      ],
    },
    recoil
  );
}
