import { useEffect, useState } from "react";
import { SCREEN_HEALTH_PRESETS } from "../../../data/screenHealthPresets";
import type { ScreenHealthStoredProfile } from "../../../lib/bridgeApi";
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
import { screenHealthTest } from "../../../lib/bridgeApi";

type Props = {
  profiles: ScreenHealthStoredProfile[];
  activeProfileId: string | null;
  activeProfile: ScreenHealthStoredProfile | null;

  saveProfile: (profile: Partial<ScreenHealthStoredProfile> | Record<string, any>) => Promise<ScreenHealthStoredProfile>;
  deleteProfile: (profileId: string) => Promise<void>;
  setActive: (profileId: string) => Promise<void>;
  exportProfile: (profileId: string) => Promise<any>;
  importProfile: () => Promise<ScreenHealthStoredProfile | null>;

  settings: any;
  updateSettings: (patch: any) => Promise<void>;
  chooseScreenshotsDir: () => Promise<void>;
  screenshots: any[];
  screenshotPreview: { filename: string; dataUrl: string } | null;
  loadScreenshotPreview: (filename: string) => Promise<void>;
  deleteScreenshot: (filename: string) => Promise<void>;
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
              <DraftFromActiveProfileSync activeProfile={props.activeProfile} />
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
    profiles,
    activeProfileId,
    activeProfile,
    saveProfile,
    deleteProfile,
    setActive,
    exportProfile,
    importProfile,
    settings,
    updateSettings,
    chooseScreenshotsDir,
    screenshots,
    screenshotPreview,
    loadScreenshotPreview,
    deleteScreenshot,
    clearScreenshots,
    lastCapturedImage,
    captureCalibrationScreenshot,
    captureRoiDebugImages,
  } = props;

  return (
    <div className="space-y-6">
      <PresetProfilesController
        presets={SCREEN_HEALTH_PRESETS}
        profiles={profiles}
        activeProfileId={activeProfileId}
        activeProfile={activeProfile}
        saveProfile={saveProfile}
        setActive={setActive}
        captureCalibrationScreenshot={captureCalibrationScreenshot}
      />

      <ProfileControlsController
        profiles={profiles}
        activeProfileId={activeProfileId}
        activeProfile={activeProfile}
        saveProfile={saveProfile}
        deleteProfile={deleteProfile}
        setActive={setActive}
        exportProfile={exportProfile}
        importProfile={importProfile}
      />

      <CaptureSettingsSection onCapture={captureCalibrationScreenshot} />

      <DetectorSelectionSection />

      <CalibrationCanvasSection lastCapturedImage={lastCapturedImage} />

      <DetectorSettingsSwitch />

      <RoiListSection captureRoiDebugImages={captureRoiDebugImages} />

      <ScreenshotsSection
        settings={settings}
        updateSettings={updateSettings}
        chooseScreenshotsDir={chooseScreenshotsDir}
        screenshots={screenshots}
        screenshotPreview={screenshotPreview}
        loadScreenshotPreview={loadScreenshotPreview}
        deleteScreenshot={deleteScreenshot}
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

function DraftFromActiveProfileSync(props: { activeProfile: ScreenHealthStoredProfile | null }) {
  const { activeProfile } = props;
  const { replaceAll: replaceProfileDraft, setDetectorType } = useScreenHealthProfileDraftControls();
  const { replaceAll: replaceRednessDraft } = useScreenHealthRednessDraftControls();
  const { replaceAll: replaceHealthBarDraft, setColorPickMode } = useScreenHealthHealthBarDraftControls();
  const { replaceAll: replaceHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();

  useEffect(() => {
    if (!activeProfile?.profile) return;
    const p: any = activeProfile.profile;

    replaceProfileDraft({
      profileName: activeProfile.name || p.name || "Unnamed Profile",
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
  }, [activeProfile]);

  return null;
}

function PresetProfilesController(props: {
  presets: any[];
  profiles: ScreenHealthStoredProfile[];
  activeProfileId: string | null;
  activeProfile: ScreenHealthStoredProfile | null;
  saveProfile: (profile: Partial<ScreenHealthStoredProfile> | Record<string, any>) => Promise<ScreenHealthStoredProfile>;
  setActive: (profileId: string) => Promise<void>;
  captureCalibrationScreenshot: (monitorIndex: number) => Promise<any>;
}) {
  const { presets, profiles, activeProfileId, activeProfile, saveProfile, setActive, captureCalibrationScreenshot } = props;
  const state = useScreenHealthProfileDraft();

  const findInstalledPresetProfileId = (presetId: string): string | null => {
    for (const p of profiles) {
      const pid = (p.profile as any)?.meta?.preset_id;
      if (pid === presetId) return p.id;
    }
    return null;
  };

  const onInstall = async () => {
    const preset = presets.find((p: any) => p.preset_id === state.selectedPresetId);
    if (!preset) return;

    const existingId = findInstalledPresetProfileId(preset.preset_id);
    if (existingId) {
      await setActive(existingId);
      await captureCalibrationScreenshot(
        Number((profiles.find((p) => p.id === existingId)?.profile as any)?.capture?.monitor_index || 1)
      );
      return;
    }

    const saved = await saveProfile({ name: preset.display_name, profile: preset.profile } as any);
    await setActive(saved.id);
    await captureCalibrationScreenshot(Number((preset.profile as any)?.capture?.monitor_index || 1));
  };

  const onResetToDefaults = async () => {
    if (!activeProfileId || !activeProfile?.profile) return;
    const presetId = (activeProfile.profile as any)?.meta?.preset_id;
    if (!presetId) return;
    const preset = presets.find((p: any) => p.preset_id === presetId);
    if (!preset) return;

    await saveProfile({
      id: activeProfileId,
      name: activeProfile.name,
      profile: preset.profile,
      createdAt: activeProfile.createdAt,
    } as any);
    await captureCalibrationScreenshot(Number((preset.profile as any)?.capture?.monitor_index || 1));
  };

  return (
    <PresetProfilesSection
      presets={presets as any}
      onInstall={onInstall}
      onResetToDefaults={onResetToDefaults}
      activeProfileMeta={(activeProfile?.profile as any)?.meta}
    />
  );
}

function ProfileControlsController(props: {
  profiles: ScreenHealthStoredProfile[];
  activeProfileId: string | null;
  activeProfile: ScreenHealthStoredProfile | null;
  saveProfile: (profile: Partial<ScreenHealthStoredProfile> | Record<string, any>) => Promise<ScreenHealthStoredProfile>;
  deleteProfile: (profileId: string) => Promise<void>;
  setActive: (profileId: string) => Promise<void>;
  exportProfile: (profileId: string) => Promise<any>;
  importProfile: () => Promise<ScreenHealthStoredProfile | null>;
}) {
  const { profiles, activeProfileId, activeProfile, saveProfile, deleteProfile, setActive, exportProfile, importProfile } = props;
  const profileState = useScreenHealthProfileDraft();
  const { setProfileName, readDraft: readProfileDraft } = useScreenHealthProfileDraftControls();
  const { readDraft: readRednessDraft } = useScreenHealthRednessDraftControls();
  const { readDraft: readHealthBarDraft } = useScreenHealthHealthBarDraftControls();
  const { readDraft: readHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, any> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const buildDaemonProfile = () => {
    // Snapshot reads: this controller does not subscribe to draft state updates.
    const profileDraft = readProfileDraft();
    const redness = readRednessDraft();
    const hb = readHealthBarDraft();
    const hn = readHealthNumberDraft();

    if (profileDraft.detectorType === "health_bar") {
      const roi = hb.roi ?? { x: 0.1, y: 0.9, w: 0.3, h: 0.03 };
      return {
        schema_version: 0,
        name: profileDraft.profileName,
        meta: (activeProfile?.profile as any)?.meta,
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
        meta: (activeProfile?.profile as any)?.meta,
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
      meta: (activeProfile?.profile as any)?.meta,
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

  const onSave = async () => {
    if (!activeProfileId) return;
    setSaving(true);
    try {
      await saveProfile({
        id: activeProfileId,
        name: profileState.profileName,
        profile: buildDaemonProfile(),
        createdAt: activeProfile?.createdAt,
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const onNew = async () => {
    const saved = await saveProfile({
      name: `Profile ${profiles.length + 1}`,
      profile: buildDaemonProfile(),
    } as any);
    await setActive(saved.id);
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
        profiles={profiles}
        activeProfileId={activeProfileId}
        setActive={(id) => setActive(id)}
        onNew={onNew}
        onExport={() => activeProfileId && exportProfile(activeProfileId)}
        onImport={importProfile}
        onDelete={() => activeProfileId && deleteProfile(activeProfileId)}
        profileName={profileState.profileName}
        setProfileName={setProfileName}
        onSave={onSave}
        saving={saving}
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
    </div>
  );
}

