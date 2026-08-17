import { useEffect, useRef, useState } from "react";
import { SCREEN_HEALTH_PRESETS } from "../../../data/screenHealthPresets";
import { ScreenHealthCalibrationProvider } from "./draft/CalibrationContext";
import {
  ScreenHealthHealthBarDraftProvider,
  useScreenHealthHealthBarDraft,
  useScreenHealthHealthBarDraftControls,
} from "./draft/HealthBarDraftContext";
import {
  ScreenHealthHealthNumberDraftProvider,
  useScreenHealthHealthNumberDraft,
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
  ScreenHealthColorVignetteDraftProvider,
  useScreenHealthColorVignetteDraft,
  useScreenHealthColorVignetteDraftControls,
} from "./draft/ColorVignetteDraftContext";
import {
  ScreenHealthRednessDraftProvider,
  useScreenHealthRednessDraft,
  useScreenHealthRednessDraftControls,
} from "./draft/RednessDraftContext";
import { CalibrationCanvasSection } from "./sections/CalibrationCanvasSection";
import { CaptureSettingsSection } from "./sections/CaptureSettingsSection";
import { DrawingMaterialSection } from "./sections/DrawingMaterialSection";
import { AmmoNumberRecoilSettings } from "./sections/AmmoNumberRecoilSettings";
import { ColorVignetteSettings } from "./sections/ColorVignetteSettings";
import { HealthBarSettings } from "./sections/HealthBarSettings";
import { HealthNumberSettings } from "./sections/HealthNumberSettings";
import { PresetProfilesSection } from "./sections/PresetProfilesSection";
import { ProfileControlsSection } from "./sections/ProfileControlsSection";
import { RednessSettings } from "./sections/RednessSettings";
import { RoiListSection } from "./sections/RoiListSection";
import { ScreenshotsSection } from "./sections/ScreenshotsSection";
import { applyDetectorsFromProfile } from "./applyProfileDraft";
import { buildScreenHealthDaemonProfile } from "./buildDaemonProfile";
import { getDrawnSetup } from "./drawnSetup";
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
        <ScreenHealthColorVignetteDraftProvider>
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
        </ScreenHealthColorVignetteDraftProvider>
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

      <DrawingMaterialSection />
      <CalibrationCanvasSection lastCapturedImage={lastCapturedImage} />

      <DrawnSettings
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

function DrawnSettings(props: {
  lastCapturedImage: { path: string } | null;
  evaluateProfileOnScreenshot: (
    profile: Record<string, any>,
    imagePath: string
  ) => Promise<{ success: boolean; test_result?: Record<string, any> | null; error?: string }>;
}) {
  const redness = useScreenHealthRednessDraft();
  const colorVignette = useScreenHealthColorVignetteDraft();
  const hb = useScreenHealthHealthBarDraft();
  const hn = useScreenHealthHealthNumberDraft();
  const recoil = useScreenHealthRecoilDraft();
  const drawn = getDrawnSetup({
    rednessRois: redness.rois,
    colorVignetteRois: colorVignette.rois,
    healthBarRoi: hb.roi,
    healthNumberRoi: hn.roi,
    ammoRoi: recoil.roi,
  });
  const hasAny =
    drawn.hasRedness || drawn.hasColorVignette || drawn.hasHealthBar || drawn.hasHealthNumber || drawn.hasAmmo;

  return (
    <div className="space-y-4 rounded-xl ring-1 ring-white/10 bg-slate-900/30 p-4">
      <h3 className="text-sm font-semibold text-white">Settings</h3>
      {!hasAny && (
        <p className="text-sm text-slate-500">
          Draw a box first. Hit detection is one type; ammo is optional and separate.
        </p>
      )}
      {drawn.hitCount > 1 && (
        <p className="text-xs text-amber-200/90">
          More than one hit type is drawn. Clear the extra boxes — only one hit type is used.
        </p>
      )}
      {drawn.hasRedness && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Red vignette</h4>
          <RednessSettings />
        </div>
      )}
      {drawn.hasColorVignette && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Color vignette</h4>
          <ColorVignetteSettings />
        </div>
      )}
      {drawn.hasHealthBar && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Health bar</h4>
          <HealthBarSettings />
        </div>
      )}
      {drawn.hasHealthNumber && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Health number</h4>
          <HealthNumberSettings
            lastCapturedImage={props.lastCapturedImage}
            evaluateProfileOnScreenshot={props.evaluateProfileOnScreenshot}
          />
        </div>
      )}
      {drawn.hasAmmo && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Ammo recoil</h4>
          <AmmoNumberRecoilSettings
            lastCapturedImage={props.lastCapturedImage}
            evaluateProfileOnScreenshot={props.evaluateProfileOnScreenshot}
          />
        </div>
      )}
    </div>
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
    setEditingLocalProfileId,
  } = useScreenHealthProfileDraftControls();
  const { replaceAll: replaceRednessDraft } = useScreenHealthRednessDraftControls();
  const { replaceAll: replaceColorVignetteDraft } = useScreenHealthColorVignetteDraftControls();
  const { replaceAll: replaceHealthBarDraft, setColorPickMode } = useScreenHealthHealthBarDraftControls();
  const { replaceAll: replaceHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();
  const { replaceAll: replaceRecoilDraft } = useScreenHealthRecoilDraftControls();
  const lastAppliedPresetIdRef = useRef<string | null>(null);
  const hasLoadedFromIdRef = useRef(false);

  const applyDetectors = (p: any) =>
    applyDetectorsFromProfile(p, {
      setDetectorType,
      replaceRednessDraft,
      replaceColorVignetteDraft,
      replaceHealthBarDraft,
      replaceHealthNumberDraft,
      replaceRecoilDraft,
      setColorPickMode,
    });

  // Load from profile ID on mount if specified
  useEffect(() => {
    if (loadFromProfileId && profiles && !hasLoadedFromIdRef.current) {
      const profile = profiles.find((p) => p.id === loadFromProfileId);
      if (profile) {
        hasLoadedFromIdRef.current = true;
        setEditingLocalProfileId(profile.type === "local" ? profile.id : null);
        const p: any = profile.profile;
        replaceProfileDraft({
          selectedPresetId: "__custom__",
          profileName: profile.name || "Loaded Profile",
          monitorIndex: Number(p.capture?.monitor_index || 1),
          tickMs: Number(p.capture?.tick_ms || 50),
        });
        applyDetectors(p);
      }
    }
  }, [loadFromProfileId, profiles, replaceProfileDraft, setEditingLocalProfileId]);

  useEffect(() => {
    const presetId = profileState.selectedPresetId;
    if (!presetId || presetId === "__custom__") return;
    if (lastAppliedPresetIdRef.current === presetId) return;

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
        applyDetectors(p);
        return;
      }
    }

    const preset = presets.find((p) => p.preset_id === presetId);
    if (!preset) return;

    const p: any = preset.profile;
    replaceProfileDraft({
      profileName: preset.display_name || p.name || "Unnamed Profile",
      monitorIndex: Number(p.capture?.monitor_index || 1),
      tickMs: Number(p.capture?.tick_ms || 50),
    });
    lastAppliedPresetIdRef.current = presetId;
    applyDetectors(p);
  }, [presets, profileState.selectedPresetId, replaceProfileDraft, setEditingLocalProfileId, profiles]);

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
  const { readDraft: readRednessDraft, replaceAll: replaceRednessDraft } = useScreenHealthRednessDraftControls();
  const { readDraft: readColorVignetteDraft, replaceAll: replaceColorVignetteDraft } =
    useScreenHealthColorVignetteDraftControls();
  const { readDraft: readHealthBarDraft, replaceAll: replaceHealthBarDraft, setColorPickMode } =
    useScreenHealthHealthBarDraftControls();
  const { readDraft: readHealthNumberDraft, replaceAll: replaceHealthNumberDraft } =
    useScreenHealthHealthNumberDraftControls();
  const { readDraft: readRecoilDraft, replaceAll: replaceRecoilDraft } = useScreenHealthRecoilDraftControls();

  const [exportError, setExportError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessKind, setSaveSuccessKind] = useState<"none" | "update" | "new">("none");

  const buildDaemonProfile = () =>
    buildScreenHealthDaemonProfile({
      profileDraft: readProfileDraft(),
      redness: readRednessDraft(),
      colorVignette: readColorVignetteDraft(),
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
      applyDetectorsFromProfile(p, {
        setDetectorType,
        replaceRednessDraft,
        replaceColorVignetteDraft,
        replaceHealthBarDraft,
        replaceHealthNumberDraft,
        replaceRecoilDraft,
        setColorPickMode,
      });
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

