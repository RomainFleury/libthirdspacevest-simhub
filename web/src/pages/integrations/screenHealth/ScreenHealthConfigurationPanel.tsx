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
  ScreenHealthRecoilDraftProvider,
  useScreenHealthRecoilDraft,
  useScreenHealthRecoilDraftControls,
} from "./draft/RecoilDraftContext";
import {
  ScreenHealthRednessDraftProvider,
  useScreenHealthRednessDraftControls,
} from "./draft/RednessDraftContext";
import { CalibrationCanvasSection } from "./sections/CalibrationCanvasSection";
import { CaptureSettingsSection } from "./sections/CaptureSettingsSection";
import { DetectorSelectionSection } from "./sections/DetectorSelectionSection";
import { AmmoNumberRecoilSettings } from "./sections/AmmoNumberRecoilSettings";
import { HealthBarSettings } from "./sections/HealthBarSettings";
import { HealthNumberSettings } from "./sections/HealthNumberSettings";
import { PresetProfilesSection } from "./sections/PresetProfilesSection";
import { ProfileControlsSection } from "./sections/ProfileControlsSection";
import { RecoilSelectionSection } from "./sections/RecoilSelectionSection";
import { RednessSettings } from "./sections/RednessSettings";
import { RoiListSection } from "./sections/RoiListSection";
import { ScreenshotsSection } from "./sections/ScreenshotsSection";
import { buildScreenHealthDaemonProfile } from "./buildDaemonProfile";
import { recoilDraftFromProfile } from "./recoilFromProfile";
import { clamp01, clampInt } from "./utils";
import { screenHealthExportProfile, screenHealthLoadProfile } from "../../../lib/bridgeApi";

type Props = {
  settings: any;
  updateSettings: (patch: any) => Promise<void>;
  chooseScreenshotsDir: () => Promise<void>;
  openScreenshotsDir?: () => Promise<void> | void;
  clearScreenshots: () => Promise<void>;

  lastCapturedImage: { dataUrl: string; width: number; height: number; filename: string; path: string } | null;
  captureCalibrationScreenshot: (monitorIndex: number) => Promise<any>;
  selectExistingScreenshot?: () => Promise<any>;
  evaluateProfileOnScreenshot: (
    profile: Record<string, any>,
    imagePath: string
  ) => Promise<{ success: boolean; test_result?: Record<string, any> | null; error?: string }>;
  loadFromProfileId?: string;
  profiles?: Array<{ type: "preset" | "local"; id: string; name: string; profile: Record<string, any> }>;
  onSaveProfile?: (
    name: string,
    profile: Record<string, any>,
    options?: { updateId?: string | null }
  ) => Promise<any>;
};

export function ScreenHealthConfigurationPanel(props: Props) {
  // Use minimal template as default, or load from profile if specified
  const defaultPresetId = props.loadFromProfileId || SCREEN_HEALTH_PRESETS[0]?.preset_id || "";
  const dataUrl = props.lastCapturedImage?.dataUrl ?? null;
  return (
    <ScreenHealthProfileDraftProvider defaultPresetId={defaultPresetId}>
      <ScreenHealthRednessDraftProvider>
        <ScreenHealthHealthBarDraftProvider>
          <ScreenHealthHealthNumberDraftProvider>
            <ScreenHealthRecoilDraftProvider>
              <ScreenHealthCalibrationProvider dataUrl={dataUrl}>
                <DraftFromSelectedPresetSync
                  presets={SCREEN_HEALTH_PRESETS as any}
                  loadFromProfileId={props.loadFromProfileId}
                  profiles={props.profiles}
                />
                <ScreenHealthConfigurationPanelInner {...props} />
              </ScreenHealthCalibrationProvider>
            </ScreenHealthRecoilDraftProvider>
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
    selectExistingScreenshot,
    evaluateProfileOnScreenshot,
  } = props;

  return (
    <div className="space-y-6">
      <PresetProfilesSection 
        presets={SCREEN_HEALTH_PRESETS as any} 
        profiles={props.profiles}
      />

      <ProfileActionsController 
        presets={SCREEN_HEALTH_PRESETS as any} 
        onSaveProfile={props.onSaveProfile}
      />

      <CaptureSettingsSection
        onCapture={captureCalibrationScreenshot}
        onSelectExisting={selectExistingScreenshot}
      />

      <DetectorSelectionSection />

      <CalibrationCanvasSection lastCapturedImage={lastCapturedImage} />

      <DetectorSettingsSwitch />

      <RecoilSelectionSection />
      <RecoilSettingsSwitch
        lastCapturedImage={lastCapturedImage}
        evaluateProfileOnScreenshot={evaluateProfileOnScreenshot}
      />

      <RoiListSection
        lastCapturedImage={lastCapturedImage}
        evaluateProfileOnScreenshot={evaluateProfileOnScreenshot}
      />

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

function RecoilSettingsSwitch(props: {
  lastCapturedImage: { path: string } | null;
  evaluateProfileOnScreenshot: (
    profile: Record<string, any>,
    imagePath: string
  ) => Promise<{ success: boolean; test_result?: Record<string, any> | null; error?: string }>;
}) {
  const recoil = useScreenHealthRecoilDraft();
  if (recoil.recoilType !== "ammo_number") return null;
  return (
    <AmmoNumberRecoilSettings
      lastCapturedImage={props.lastCapturedImage}
      evaluateProfileOnScreenshot={props.evaluateProfileOnScreenshot}
    />
  );
}

function DraftFromSelectedPresetSync(props: { 
  presets: Array<{ preset_id: string; display_name: string; profile: any }>;
  loadFromProfileId?: string;
  profiles?: Array<{ type: "preset" | "local"; id: string; name: string; profile: Record<string, any> }>;
}) {
  const { presets, loadFromProfileId, profiles } = props;
  const profileState = useScreenHealthProfileDraft();
  const {
    replaceAll: replaceProfileDraft,
    setDetectorType,
    setSelectedPresetId,
    setEditingLocalProfileId,
  } = useScreenHealthProfileDraftControls();
  const { replaceAll: replaceRednessDraft } = useScreenHealthRednessDraftControls();
  const { replaceAll: replaceHealthBarDraft, setColorPickMode } = useScreenHealthHealthBarDraftControls();
  const { replaceAll: replaceHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();
  const { replaceAll: replaceRecoilDraft } = useScreenHealthRecoilDraftControls();
  const lastAppliedPresetIdRef = useRef<string | null>(null);
  const hasLoadedFromIdRef = useRef(false);

  const applyRecoil = (p: any) => {
    replaceRecoilDraft(recoilDraftFromProfile(p));
  };

  // Load from profile ID on mount if specified
  useEffect(() => {
    if (loadFromProfileId && profiles && !hasLoadedFromIdRef.current) {
      const profile = profiles.find((p) => p.id === loadFromProfileId);
      if (profile) {
        hasLoadedFromIdRef.current = true;
        setEditingLocalProfileId(profile.type === "local" ? profile.id : null);
        // Load the profile similar to onLoad in ProfileActionsController
        const p: any = profile.profile;
        replaceProfileDraft({
          selectedPresetId: "__custom__",
          profileName: profile.name || "Loaded Profile",
          monitorIndex: Number(p.capture?.monitor_index || 1),
          tickMs: Number(p.capture?.tick_ms || 50),
        });
        // Continue with detector loading below...
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
          applyRecoil(p);
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
          applyRecoil(p);
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
        applyRecoil(p);
        setColorPickMode(null);
      }
    }
  }, [loadFromProfileId, profiles, replaceProfileDraft, setDetectorType, replaceHealthNumberDraft, replaceHealthBarDraft, replaceRednessDraft, replaceRecoilDraft, setColorPickMode]);

  useEffect(() => {
    const presetId = profileState.selectedPresetId;
    if (!presetId || presetId === "__custom__") return;
    if (lastAppliedPresetIdRef.current === presetId) return;

    // Check if it's a local profile first
    if (profiles) {
      const localProfile = profiles.find((p) => p.id === presetId && p.type === "local");
      if (localProfile) {
        lastAppliedPresetIdRef.current = presetId;
        setEditingLocalProfileId(localProfile.id);
        const p: any = localProfile.profile;
        replaceProfileDraft({
          selectedPresetId: "__custom__",
          profileName: localProfile.name || "Loaded Profile",
          monitorIndex: Number(p.capture?.monitor_index || 1),
          tickMs: Number(p.capture?.tick_ms || 50),
        });
        // Load detector data (same logic as below)
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
          applyRecoil(p);
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
          applyRecoil(p);
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
        applyRecoil(p);
        setColorPickMode(null);
        return;
      }
    }

    // Check if it's a preset
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
      applyRecoil(p);
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
      applyRecoil(p);
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
    applyRecoil(p);
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
    replaceRecoilDraft,
    setEditingLocalProfileId,
  ]);

  return null;
}

function ProfileActionsController(props: {
  presets: Array<{ preset_id: string; profile: any }>;
  onSaveProfile?: (
    name: string,
    profile: Record<string, any>,
    options?: { updateId?: string | null }
  ) => Promise<any>;
}) {
  const { presets, onSaveProfile } = props;
  const profileState = useScreenHealthProfileDraft();
  const {
    setProfileName,
    readDraft: readProfileDraft,
    replaceAll: replaceProfileDraft,
    setEditingLocalProfileId,
    setDetectorType,
  } = useScreenHealthProfileDraftControls();
  const { readDraft: readRednessDraft } = useScreenHealthRednessDraftControls();
  const { readDraft: readHealthBarDraft, replaceAll: replaceHealthBarDraft, setColorPickMode } = useScreenHealthHealthBarDraftControls();
  const { readDraft: readHealthNumberDraft, replaceAll: replaceHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();
  const { replaceAll: replaceRednessDraft } = useScreenHealthRednessDraftControls();
  const { readDraft: readRecoilDraft, replaceAll: replaceRecoilDraft } = useScreenHealthRecoilDraftControls();

  const applyRecoil = (p: any) => {
    replaceRecoilDraft(recoilDraftFromProfile(p));
  };

  const [exportError, setExportError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessKind, setSaveSuccessKind] = useState<"none" | "update" | "new">("none");

  const buildDaemonProfile = () =>
    buildScreenHealthDaemonProfile({
      profileDraft: readProfileDraft(),
      redness: readRednessDraft(),
      hb: readHealthBarDraft(),
      hn: readHealthNumberDraft(),
      recoil: readRecoilDraft(),
      presets,
    });

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

      setEditingLocalProfileId(null);
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
        applyRecoil(p);
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
        applyRecoil(p);
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
      applyRecoil(p);
      setColorPickMode(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load profile");
    }
  };

  const runSave = async (kind: "update" | "new") => {
    if (!onSaveProfile) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccessKind("none");
    try {
      const profile = buildDaemonProfile();
      const name = profileState.profileName.trim();
      if (!name) {
        setSaveError("Profile name is required");
        return;
      }
      const updateId = kind === "update" ? profileState.editingLocalProfileId : null;
      if (kind === "update" && !updateId) {
        setSaveError("Nothing to update — open a local profile or pick one from Local Profiles.");
        return;
      }
      const saved = await onSaveProfile(name, profile, updateId ? { updateId } : undefined);
      if (saved) {
        setSaveSuccessKind(kind);
        window.setTimeout(() => setSaveSuccessKind("none"), kind === "update" ? 8000 : 4000);
      } else {
        setSaveError("Failed to save profile");
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const isPresetSelected = presets.some((p) => p.preset_id === profileState.selectedPresetId);
  const canUpdateLocal = Boolean(profileState.editingLocalProfileId);
  const showUpdate = Boolean(onSaveProfile && canUpdateLocal && !isPresetSelected);
  const showSaveNewCopy = Boolean(onSaveProfile);

  return (
    <div className="space-y-3">
      <ProfileControlsSection
        onLoad={onLoad}
        onExport={onExport}
        onUpdateProfile={showUpdate ? () => runSave("update") : undefined}
        onSaveNewCopy={showSaveNewCopy ? () => runSave("new") : undefined}
        saveNewCopyLabel="Save a new copy"
        saving={saving}
        profileName={profileState.profileName}
        setProfileName={setProfileName}
      />

      {exportError && <div className="text-xs text-rose-300">{exportError}</div>}
      {loadError && <div className="text-xs text-rose-300">{loadError}</div>}
      {saveError && <div className="text-xs text-rose-300">{saveError}</div>}
      {saveSuccessKind === "update" && (
        <div className="text-xs text-emerald-300 space-y-1">
          <div>Profile updated.</div>
          <div className="text-slate-400">
            If Screen Health is running with this profile, stop it on the integration page and start it again to load
            changes (no automatic restart).
          </div>
        </div>
      )}
      {saveSuccessKind === "new" && (
        <div className="text-xs text-emerald-300">New local profile saved (separate copy).</div>
      )}
    </div>
  );
}

