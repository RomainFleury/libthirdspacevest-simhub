import { useEffect, useRef, useState } from "react";
import { SCREEN_HEALTH_PRESETS } from "../../../data/screenHealthPresets";
import { ScreenHealthCalibrationProvider } from "./draft/CalibrationContext";
import {
  ScreenHealthHealthBarDraftProvider,
  useScreenHealthHealthBarDraftControls,
} from "./draft/HealthBarDraftContext";
import {
  ScreenHealthHealthNumberDraftProvider,
  useScreenHealthHealthNumberDraftControls,
} from "./draft/HealthNumberDraftContext";
import {
  ScreenHealthProfileDraftProvider,
  useScreenHealthProfileDraftControls,
  useScreenHealthProfileDraft,
} from "./draft/ProfileDraftContext";
import {
  ScreenHealthRednessDraftProvider,
  useScreenHealthRednessDraftControls,
} from "./draft/RednessDraftContext";
import { CalibrationCanvasSection } from "./sections/CalibrationCanvasSection";
import { CaptureSettingsSection } from "./sections/CaptureSettingsSection";
import { DetectorSelectionSection } from "./sections/DetectorSelectionSection";
import { HealthBarSettings } from "./sections/HealthBarSettings";
import { HealthNumberSettings } from "./sections/HealthNumberSettings";
import { PresetProfilesSection } from "./sections/PresetProfilesSection";
import { ProfileControlsSection } from "./sections/ProfileControlsSection";
import { RednessSettings } from "./sections/RednessSettings";
import { RoiListSection } from "./sections/RoiListSection";
import { ScreenshotsSection } from "./sections/ScreenshotsSection";
import { clamp01, clampInt } from "./utils";
import { screenHealthExportProfile, screenHealthLoadProfile, screenHealthTest } from "../../../lib/bridgeApi";

type Props = {
  settings: any;
  updateSettings: (patch: any) => Promise<void>;
  chooseScreenshotsDir: () => Promise<void>;
  openScreenshotsDir?: () => Promise<void> | void;
  clearScreenshots: () => Promise<void>;

  lastCapturedImage: { dataUrl: string; width: number; height: number; filename: string; path: string } | null;
  captureCalibrationScreenshot: (monitorIndex: number) => Promise<any>;
  captureRoiDebugImages: (
    monitorIndex: number,
    rois: Array<{ name: string; rect: { x: number; y: number; w: number; h: number } }>
  ) => Promise<any>;
};

export function ScreenHealthConfigurationPanel(props: Props) {
  const defaultPresetId = SCREEN_HEALTH_PRESETS[0]?.preset_id || "";
  const dataUrl = props.lastCapturedImage?.dataUrl ?? null;
  return (
    <ScreenHealthProfileDraftProvider defaultPresetId={defaultPresetId}>
      <ScreenHealthRednessDraftProvider>
        <ScreenHealthHealthBarDraftProvider>
          <ScreenHealthHealthNumberDraftProvider>
            <ScreenHealthCalibrationProvider dataUrl={dataUrl}>
              <DraftFromSelectedPresetSync presets={SCREEN_HEALTH_PRESETS as any} />
              <ScreenHealthConfigurationPanelInner {...props} />
            </ScreenHealthCalibrationProvider>
          </ScreenHealthHealthNumberDraftProvider>
        </ScreenHealthHealthBarDraftProvider>
      </ScreenHealthRednessDraftProvider>
    </ScreenHealthProfileDraftProvider>
  );
}

function ScreenHealthConfigurationPanelInner(props: Props) {
  const {
    settings,
    updateSettings,
    chooseScreenshotsDir,
    openScreenshotsDir,
    clearScreenshots,
    lastCapturedImage,
    captureCalibrationScreenshot,
    captureRoiDebugImages,
  } = props;

  return (
    <div className="space-y-6">
      <PresetProfilesSection presets={SCREEN_HEALTH_PRESETS as any} />

      <ProfileActionsController presets={SCREEN_HEALTH_PRESETS as any} />

      <CaptureSettingsSection onCapture={captureCalibrationScreenshot} />

      <DetectorSelectionSection />

      <CalibrationCanvasSection lastCapturedImage={lastCapturedImage} />

      <DetectorSettingsSwitch />

      <RoiListSection captureRoiDebugImages={captureRoiDebugImages} />

      <ScreenshotsSection
        settings={settings}
        updateSettings={updateSettings}
        chooseScreenshotsDir={chooseScreenshotsDir}
        openScreenshotsDir={openScreenshotsDir as any}
        clearScreenshots={clearScreenshots}
      />
    </div>
  );
}

function DetectorSettingsSwitch() {
  const state = useScreenHealthProfileDraft();
  if (state.detectorType === "redness_rois") return <RednessSettings />;
  if (state.detectorType === "health_bar") return <HealthBarSettings />;
  return <HealthNumberSettings />;
}

function DraftFromSelectedPresetSync(props: { presets: Array<{ preset_id: string; display_name: string; profile: any }> }) {
  const { presets } = props;
  const profileState = useScreenHealthProfileDraft();
  const { replaceAll: replaceProfileDraft, setDetectorType } = useScreenHealthProfileDraftControls();
  const { replaceAll: replaceRednessDraft } = useScreenHealthRednessDraftControls();
  const { replaceAll: replaceHealthBarDraft, setColorPickMode } = useScreenHealthHealthBarDraftControls();
  const { replaceAll: replaceHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();
  const lastAppliedPresetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const presetId = profileState.selectedPresetId;
    if (!presetId) return;
    if (lastAppliedPresetIdRef.current === presetId) return;

    const preset = presets.find((p) => p.preset_id === presetId);
    if (!preset) return;

    const p: any = preset.profile;

    replaceProfileDraft({
      profileName: preset.display_name || p.name || "Unnamed Profile",
      monitorIndex: Number(p.capture?.monitor_index || 1),
      tickMs: Number(p.capture?.tick_ms || 50),
    });
    // Mark applied early to avoid loops (even if we return in a branch below).
    lastAppliedPresetIdRef.current = presetId;

    const detectors: any[] = Array.isArray(p.detectors) ? p.detectors : [];
    const hbD = detectors.find((d: any) => d.type === "health_bar");
    const hnD = detectors.find((d: any) => d.type === "health_number");
    const redD = detectors.find((d: any) => d.type === "redness_rois");

    if (hnD) {
      setDetectorType("health_number");
      replaceHealthNumberDraft({
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
        templates: (hnD.templates?.digits && typeof hnD.templates.digits === "object" ? hnD.templates.digits : {}) as any,
        calibrationError: null,
        testResult: null,
      });
      setColorPickMode(null);
      return;
    }

    if (hbD) {
      setDetectorType("health_bar");
      replaceHealthBarDraft({
        roi: {
          x: Number(hbD.roi?.x ?? 0),
          y: Number(hbD.roi?.y ?? 0),
          w: Number(hbD.roi?.w ?? 0.3),
          h: Number(hbD.roi?.h ?? 0.03),
        },
        mode: hbD.color_sampling ? "color_sampling" : hbD.threshold_fallback ? "threshold_fallback" : "color_sampling",
        filledRgb: Array.isArray(hbD.color_sampling?.filled_rgb)
          ? [
              clampInt(Number(hbD.color_sampling.filled_rgb[0]), 0, 255),
              clampInt(Number(hbD.color_sampling.filled_rgb[1]), 0, 255),
              clampInt(Number(hbD.color_sampling.filled_rgb[2]), 0, 255),
            ]
          : [220, 40, 40],
        emptyRgb: Array.isArray(hbD.color_sampling?.empty_rgb)
          ? [
              clampInt(Number(hbD.color_sampling.empty_rgb[0]), 0, 255),
              clampInt(Number(hbD.color_sampling.empty_rgb[1]), 0, 255),
              clampInt(Number(hbD.color_sampling.empty_rgb[2]), 0, 255),
            ]
          : [40, 40, 40],
        toleranceL1: clampInt(Number(hbD.color_sampling?.tolerance_l1 ?? 120), 0, 765),
        fallbackMode: (hbD.threshold_fallback?.mode as any) || "brightness",
        fallbackMin: Number(hbD.threshold_fallback?.min ?? 0.5),
        hitMinDrop: Number(hbD.hit_on_decrease?.min_drop ?? 0.02),
        hitCooldownMs: Number(hbD.hit_on_decrease?.cooldown_ms ?? 150),
        colorPickMode: null,
      });
      return;
    }

    setDetectorType("redness_rois");
    replaceRednessDraft({
      minScore: Number(redD?.threshold?.min_score ?? 0.35),
      cooldownMs: Number(redD?.cooldown_ms ?? 200),
      rois: (Array.isArray(redD?.rois) ? redD.rois : []).map((r: any, idx: number) => ({
        name: String(r.name || `roi_${idx}`),
        direction: r.direction || "",
        rect: {
          x: Number(r.rect?.x ?? 0),
          y: Number(r.rect?.y ?? 0),
          w: Number(r.rect?.w ?? 0.1),
          h: Number(r.rect?.h ?? 0.1),
        },
      })),
    });
    setColorPickMode(null);
  }, [
    presets,
    profileState.selectedPresetId,
    replaceProfileDraft,
    setDetectorType,
    replaceRednessDraft,
    replaceHealthBarDraft,
    setColorPickMode,
    replaceHealthNumberDraft,
  ]);

  return null;
}

function ProfileActionsController(props: { presets: Array<{ preset_id: string; profile: any }> }) {
  const { presets } = props;
  const profileState = useScreenHealthProfileDraft();
  const { setProfileName, readDraft: readProfileDraft, replaceAll: replaceProfileDraft } = useScreenHealthProfileDraftControls();
  const { readDraft: readRednessDraft } = useScreenHealthRednessDraftControls();
  const { readDraft: readHealthBarDraft, replaceAll: replaceHealthBarDraft, setColorPickMode } = useScreenHealthHealthBarDraftControls();
  const { readDraft: readHealthNumberDraft, replaceAll: replaceHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();
  const { replaceAll: replaceRednessDraft } = useScreenHealthRednessDraftControls();
  const { setDetectorType } = useScreenHealthProfileDraftControls();

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, any> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const buildDaemonProfile = () => {
    // Snapshot reads: this controller does not subscribe to draft state updates.
    const profileDraft = readProfileDraft();
    const redness = readRednessDraft();
    const hb = readHealthBarDraft();
    const hn = readHealthNumberDraft();
    const presetMeta = (presets.find((p) => p.preset_id === profileDraft.selectedPresetId)?.profile as any)?.meta;

    if (profileDraft.detectorType === "health_bar") {
      const roi = hb.roi ?? { x: 0.1, y: 0.9, w: 0.3, h: 0.03 };
      return {
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
      };
    }

    if (profileDraft.detectorType === "health_number") {
      const roi = hn.roi ?? { x: 0.05, y: 0.9, w: 0.12, h: 0.06 };
      return {
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
      };
    }

    return {
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
    };
  };

  const onExport = async () => {
    setExportError(null);
    try {
      const profile = buildDaemonProfile();
      const result = await screenHealthExportProfile(profile);
      if (!result.success && !result.canceled) throw new Error(result.error || "Failed to export profile");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Failed to export profile");
    }
  };

  const onLoad = async () => {
    setLoadError(null);
    try {
      const result = await screenHealthLoadProfile();
      if (!result.success) {
        if (result.canceled) return;
        throw new Error(result.error || "Failed to load profile");
      }
      const raw: any = result.profile;
      const p: any = raw?.profile && typeof raw.profile === "object" ? raw.profile : raw;
      if (!p || typeof p !== "object") throw new Error("Invalid profile JSON");

      // Mark as "custom" so preset auto-sync doesn't overwrite user edits.
      replaceProfileDraft({
        selectedPresetId: "__custom__",
        profileName: String(raw?.name || p.name || "Loaded Profile"),
        monitorIndex: Number(p.capture?.monitor_index || 1),
        tickMs: Number(p.capture?.tick_ms || 50),
      });

      const detectors: any[] = Array.isArray(p.detectors) ? p.detectors : [];
      const hbD = detectors.find((d: any) => d.type === "health_bar");
      const hnD = detectors.find((d: any) => d.type === "health_number");
      const redD = detectors.find((d: any) => d.type === "redness_rois");

      if (hnD) {
        setDetectorType("health_number");
        replaceHealthNumberDraft({
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
          templates: (hnD.templates?.digits && typeof hnD.templates.digits === "object" ? hnD.templates.digits : {}) as any,
          calibrationError: null,
          testResult: null,
        });
        setColorPickMode(null);
        return;
      }

      if (hbD) {
        setDetectorType("health_bar");
        replaceHealthBarDraft({
          roi: {
            x: Number(hbD.roi?.x ?? 0),
            y: Number(hbD.roi?.y ?? 0),
            w: Number(hbD.roi?.w ?? 0.3),
            h: Number(hbD.roi?.h ?? 0.03),
          },
          mode: hbD.color_sampling ? "color_sampling" : hbD.threshold_fallback ? "threshold_fallback" : "color_sampling",
          filledRgb: Array.isArray(hbD.color_sampling?.filled_rgb)
            ? [
                clampInt(Number(hbD.color_sampling.filled_rgb[0]), 0, 255),
                clampInt(Number(hbD.color_sampling.filled_rgb[1]), 0, 255),
                clampInt(Number(hbD.color_sampling.filled_rgb[2]), 0, 255),
              ]
            : [220, 40, 40],
          emptyRgb: Array.isArray(hbD.color_sampling?.empty_rgb)
            ? [
                clampInt(Number(hbD.color_sampling.empty_rgb[0]), 0, 255),
                clampInt(Number(hbD.color_sampling.empty_rgb[1]), 0, 255),
                clampInt(Number(hbD.color_sampling.empty_rgb[2]), 0, 255),
              ]
            : [40, 40, 40],
          toleranceL1: clampInt(Number(hbD.color_sampling?.tolerance_l1 ?? 120), 0, 765),
          fallbackMode: (hbD.threshold_fallback?.mode as any) || "brightness",
          fallbackMin: Number(hbD.threshold_fallback?.min ?? 0.5),
          hitMinDrop: Number(hbD.hit_on_decrease?.min_drop ?? 0.02),
          hitCooldownMs: Number(hbD.hit_on_decrease?.cooldown_ms ?? 150),
          colorPickMode: null,
        });
        setColorPickMode(null);
        return;
      }

      setDetectorType("redness_rois");
      replaceRednessDraft({
        minScore: Number(redD?.threshold?.min_score ?? 0.35),
        cooldownMs: Number(redD?.cooldown_ms ?? 200),
        rois: (Array.isArray(redD?.rois) ? redD.rois : []).map((r: any, idx: number) => ({
          name: String(r.name || `roi_${idx}`),
          direction: r.direction || "",
          rect: {
            x: Number(r.rect?.x ?? 0),
            y: Number(r.rect?.y ?? 0),
            w: Number(r.rect?.w ?? 0.1),
            h: Number(r.rect?.h ?? 0.1),
          },
        })),
      });
      setColorPickMode(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load profile");
    }
  };

  const onTest = async () => {
    setTesting(true);
    setTestError(null);
    try {
      const profile = buildDaemonProfile();
      const result = await screenHealthTest(profile);
      if (!result.success) {
        setTestError(result.error || "Test failed");
        setTestResult(null);
      } else {
        setTestResult(result.test_result || null);
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test failed");
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <ProfileControlsSection
        onLoad={onLoad}
        onExport={onExport}
        profileName={profileState.profileName}
        setProfileName={setProfileName}
        onTest={onTest}
        testing={testing}
      />

      {(testError || testResult) && (
        <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-white/5 text-sm">
          <div className="text-white font-medium mb-1">Daemon test result</div>
          {testError && <div className="text-rose-300 text-xs">{testError}</div>}
          {testResult && (
            <div className="text-xs text-slate-300 space-y-1">
              <div className="font-mono text-slate-400">
                total_ms={typeof testResult.total_ms === "number" ? testResult.total_ms.toFixed(2) : "?"} output_dir=
                {typeof testResult.output_dir === "string" ? testResult.output_dir : "(none)"}
              </div>
              {Array.isArray(testResult.detectors) && (
                <div className="space-y-1">
                  {testResult.detectors.slice(0, 8).map((d: any, idx: number) => (
                    <div key={idx} className="font-mono text-slate-400">
                      {d.type}:{d.name}{" "}
                      {typeof d.score === "number" ? `score=${d.score.toFixed(3)}` : ""}
                      {typeof d.percent === "number" ? ` percent=${(d.percent * 100).toFixed(1)}%` : ""}
                      {typeof d.read === "number" ? ` read=${d.read}` : d.read === null ? " read=null" : ""}
                      {typeof d.image_path === "string" ? ` file=${d.image_path}` : ""}
                      {typeof d.capture_ms === "number" ? ` cap=${d.capture_ms.toFixed(2)}ms` : ""}
                      {typeof d.eval_ms === "number" ? ` eval=${d.eval_ms.toFixed(2)}ms` : ""}
                    </div>
                  ))}
                </div>
              )}
              {Array.isArray(testResult.errors) && testResult.errors.length > 0 && (
                <div className="text-amber-200/80">
                  {testResult.errors.slice(0, 3).map((e: string, i: number) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {exportError && <div className="text-xs text-rose-300">{exportError}</div>}
      {loadError && <div className="text-xs text-rose-300">{loadError}</div>}
    </div>
  );
}

