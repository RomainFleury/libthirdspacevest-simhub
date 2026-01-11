import { useEffect, useMemo, useRef, useState } from "react";
import { SCREEN_HEALTH_PRESETS } from "../../../data/screenHealthPresets";
import type { ScreenHealthStoredProfile } from "../../../lib/bridgeApi";
import { DIRECTION_KEYS } from "./constants";
import { learnDigitTemplatesFromCanvas, tryReadDigitValueFromCanvas } from "./templateLearning";
import { clamp01, clampInt } from "./utils";
import { HealthBarSettings } from "./sections/HealthBarSettings";
import { HealthNumberSettings } from "./sections/HealthNumberSettings";
import { PresetProfilesSection } from "./sections/PresetProfilesSection";
import { ProfileControlsSection } from "./sections/ProfileControlsSection";
import { CaptureSettingsSection } from "./sections/CaptureSettingsSection";
import { DetectorSelectionSection } from "./sections/DetectorSelectionSection";
import { CalibrationCanvasSection } from "./sections/CalibrationCanvasSection";
import { RoiListSection } from "./sections/RoiListSection";
import { ScreenshotsSection } from "./sections/ScreenshotsSection";
import { ScreenHealthConfigProvider, useScreenHealthConfig } from "./state/context";

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
  captureRoiDebugImages: (monitorIndex: number, rois: Array<{ name: string; rect: { x: number; y: number; w: number; h: number } }>) => Promise<any>;
};

export function ScreenHealthConfigurationPanel(props: Props) {
  const defaultPresetId = SCREEN_HEALTH_PRESETS[0]?.preset_id || "";
  return (
    <ScreenHealthConfigProvider defaultPresetId={defaultPresetId}>
      <ScreenHealthConfigurationPanelInner {...props} />
    </ScreenHealthConfigProvider>
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

  const { state, dispatch } = useScreenHealthConfig();

  useEffect(() => {
    if (!activeProfile?.profile) return;
    dispatch({ type: "initFromActiveProfile", value: activeProfile.profile, wrapperName: activeProfile.name });
  }, [activeProfile]);

  const daemonProfile = useMemo(() => {
    if (state.detectorType === "health_bar") {
      const roi = state.healthBar.roi ?? { x: 0.1, y: 0.9, w: 0.3, h: 0.03 };
      return {
        schema_version: 0,
        name: state.profileName,
        meta: (activeProfile?.profile as any)?.meta,
        capture: { source: "monitor", monitor_index: state.monitorIndex, tick_ms: state.tickMs },
        detectors: [
          {
            type: "health_bar",
            name: "health_bar",
            roi: { x: clamp01(roi.x), y: clamp01(roi.y), w: clamp01(roi.w), h: clamp01(roi.h) },
            orientation: "horizontal",
            ...(state.healthBar.mode === "color_sampling"
              ? {
                  color_sampling: {
                    filled_rgb: state.healthBar.filledRgb.map((v) => clampInt(v, 0, 255)),
                    empty_rgb: state.healthBar.emptyRgb.map((v) => clampInt(v, 0, 255)),
                    tolerance_l1: clampInt(state.healthBar.toleranceL1, 0, 765),
                  },
                }
              : {
                  threshold_fallback: {
                    mode: state.healthBar.fallbackMode,
                    min: Math.max(0, Math.min(1, state.healthBar.fallbackMin)),
                  },
                }),
            hit_on_decrease: {
              min_drop: Math.max(0, Math.min(1, state.healthBar.hitMinDrop)),
              cooldown_ms: Math.max(0, Math.floor(state.healthBar.hitCooldownMs)),
            },
          },
        ],
      };
    }

    if (state.detectorType === "health_number") {
      const roi = state.healthNumber.roi ?? { x: 0.05, y: 0.9, w: 0.12, h: 0.06 };
      return {
        schema_version: 0,
        name: state.profileName,
        meta: (activeProfile?.profile as any)?.meta,
        capture: { source: "monitor", monitor_index: state.monitorIndex, tick_ms: state.tickMs },
        detectors: [
          {
            type: "health_number",
            name: "health_number",
            roi: { x: clamp01(roi.x), y: clamp01(roi.y), w: clamp01(roi.w), h: clamp01(roi.h) },
            digits: Math.max(1, Math.floor(state.healthNumber.digits)),
            preprocess: {
              invert: Boolean(state.healthNumber.invert),
              threshold: Math.max(0, Math.min(1, state.healthNumber.threshold)),
              scale: Math.max(1, Math.floor(state.healthNumber.scale)),
            },
            readout: {
              min: Math.floor(state.healthNumber.readMin),
              max: Math.floor(state.healthNumber.readMax),
              stable_reads: Math.max(1, Math.floor(state.healthNumber.stableReads)),
            },
            templates: {
              template_set_id: "learned_v1",
              hamming_max: Math.max(0, Math.floor(state.healthNumber.hammingMax)),
              width: state.healthNumber.templateSize.w,
              height: state.healthNumber.templateSize.h,
              digits: state.healthNumber.templates,
            },
            hit_on_decrease: {
              min_drop: Math.max(1, Math.floor(state.healthNumber.hitMinDrop)),
              cooldown_ms: Math.max(0, Math.floor(state.healthNumber.hitCooldownMs)),
            },
          },
        ],
      };
    }

    return {
      schema_version: 0,
      name: state.profileName,
      meta: (activeProfile?.profile as any)?.meta,
      capture: { source: "monitor", monitor_index: state.monitorIndex, tick_ms: state.tickMs },
      detectors: [
        {
          type: "redness_rois",
          cooldown_ms: state.redness.cooldownMs,
          threshold: { min_score: state.redness.minScore },
          rois: state.redness.rois.map((r) => ({
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
  }, [state, activeProfile?.profile]);

  // If template size changes, existing learned bitstrings are invalid.
  useEffect(() => {
    dispatch({ type: "setHealthNumberTemplates", value: {} });
    dispatch({ type: "setHealthNumberTestResult", value: null });
    dispatch({ type: "setHealthNumberCalibrationError", value: null });
  }, [state.healthNumber.templateSize.w, state.healthNumber.templateSize.h]);

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!activeProfileId) return;
    setSaving(true);
    try {
      await saveProfile({
        id: activeProfileId,
        name: state.profileName,
        profile: daemonProfile,
        createdAt: activeProfile?.createdAt,
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleNewProfile = async () => {
    const saved = await saveProfile({
      name: `Profile ${profiles.length + 1}`,
      profile: daemonProfile,
    } as any);
    await setActive(saved.id);
  };

  const findInstalledPresetProfileId = (presetId: string): string | null => {
    for (const p of profiles) {
      const pid = (p.profile as any)?.meta?.preset_id;
      if (pid === presetId) return p.id;
    }
    return null;
  };

  const handleInstallPreset = async () => {
    const preset = SCREEN_HEALTH_PRESETS.find((p) => p.preset_id === state.selectedPresetId);
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

  const handleResetToPresetDefaults = async () => {
    if (!activeProfileId || !activeProfile?.profile) return;
    const presetId = (activeProfile.profile as any)?.meta?.preset_id;
    if (!presetId) return;
    const preset = SCREEN_HEALTH_PRESETS.find((p) => p.preset_id === presetId);
    if (!preset) return;

    await saveProfile({
      id: activeProfileId,
      name: activeProfile.name,
      profile: preset.profile,
      createdAt: activeProfile.createdAt,
    } as any);
    await captureCalibrationScreenshot(Number((preset.profile as any)?.capture?.monitor_index || 1));
  };

  const handleCapture = async () => {
    await captureCalibrationScreenshot(state.monitorIndex);
  };

  // Calibration screenshot editor
  const imgContainerRef = useRef<HTMLDivElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageLoadedRef = useRef(false);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

  useEffect(() => {
    imageLoadedRef.current = false;
    if (!lastCapturedImage?.dataUrl) return;
    const canvas = offscreenCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      imageLoadedRef.current = true;
    };
    img.src = lastCapturedImage.dataUrl;
  }, [lastCapturedImage?.dataUrl]);

  const pickColorAtMouse = (e: React.MouseEvent) => {
    if (!state.colorPickMode || !imgContainerRef.current) return false;
    const canvas = offscreenCanvasRef.current;
    if (!canvas || !imageLoadedRef.current) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const rect = imgContainerRef.current.getBoundingClientRect();
    const nx = clamp01((e.clientX - rect.left) / rect.width);
    const ny = clamp01((e.clientY - rect.top) / rect.height);
    const px = clampInt(Math.floor(nx * canvas.width), 0, canvas.width - 1);
    const py = clampInt(Math.floor(ny * canvas.height), 0, canvas.height - 1);
    const data = ctx.getImageData(px, py, 1, 1).data; // RGBA
    const rgb: [number, number, number] = [data[0], data[1], data[2]];
    if (state.colorPickMode === "filled") dispatch({ type: "setHealthBarFilledRgb", value: rgb });
    else dispatch({ type: "setHealthBarEmptyRgb", value: rgb });
    dispatch({ type: "setColorPickMode", value: null });
    return true;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (pickColorAtMouse(e)) return;
    if (!imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing({ startX: x, startY: y, curX: x, curY: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing({ ...drawing, curX: x, curY: y });
  };

  const handleMouseUp = () => {
    if (!drawing || !imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x1 = Math.min(drawing.startX, drawing.curX);
    const y1 = Math.min(drawing.startY, drawing.curY);
    const x2 = Math.max(drawing.startX, drawing.curX);
    const y2 = Math.max(drawing.startY, drawing.curY);
    const w = x2 - x1;
    const h = y2 - y1;
    setDrawing(null);
    if (w < 5 || h < 5) return;

    const newRect = { x: clamp01(x1 / rect.width), y: clamp01(y1 / rect.height), w: clamp01(w / rect.width), h: clamp01(h / rect.height) };
    if (state.detectorType === "health_bar") dispatch({ type: "setHealthBarRoi", value: newRect });
    else if (state.detectorType === "health_number") dispatch({ type: "setHealthNumberRoi", value: newRect });
    else
      dispatch({
        type: "setRednessRois",
        value: [...state.redness.rois, { name: `roi_${state.redness.rois.length + 1}`, direction: "", rect: newRect }],
      });
  };

  const handleLearnTemplates = () => {
    dispatch({ type: "setHealthNumberCalibrationError", value: null });
    dispatch({ type: "setHealthNumberTestResult", value: null });
    if (!state.healthNumber.roi) throw new Error("No health number ROI set");
    const canvas = offscreenCanvasRef.current;
    if (!canvas || !imageLoadedRef.current) throw new Error("No screenshot loaded");
    const digitsCount = Math.max(1, Math.floor(state.healthNumber.digits));
    const next = learnDigitTemplatesFromCanvas({
      canvas,
      roi: state.healthNumber.roi,
      digitsCount,
      displayedValue: state.healthNumber.learnValue,
      threshold: state.healthNumber.threshold,
      invert: state.healthNumber.invert,
      scale: state.healthNumber.scale,
      templateSize: state.healthNumber.templateSize,
      prevTemplates: state.healthNumber.templates,
    });
    dispatch({ type: "setHealthNumberTemplates", value: next });
  };

  const handleTestOcrOnce = () => {
    dispatch({ type: "setHealthNumberCalibrationError", value: null });
    if (!state.healthNumber.roi) throw new Error("No health number ROI set");
    const canvas = offscreenCanvasRef.current;
    if (!canvas || !imageLoadedRef.current) throw new Error("No screenshot loaded");
    const digitsCount = Math.max(1, Math.floor(state.healthNumber.digits));
    const result = tryReadDigitValueFromCanvas({
      canvas,
      roi: state.healthNumber.roi,
      digitsCount,
      threshold: state.healthNumber.threshold,
      invert: state.healthNumber.invert,
      scale: state.healthNumber.scale,
      templateSize: state.healthNumber.templateSize,
      templates: state.healthNumber.templates,
      hammingMax: state.healthNumber.hammingMax,
    });
    dispatch({ type: "setHealthNumberTestResult", value: result });
  };

  return (
    <div className="space-y-6">
      <PresetProfilesSection
        presets={SCREEN_HEALTH_PRESETS}
        onInstall={handleInstallPreset}
        onResetToDefaults={handleResetToPresetDefaults}
        activeProfileMeta={(activeProfile?.profile as any)?.meta}
      />

      <ProfileControlsSection
        profiles={profiles}
        activeProfileId={activeProfileId}
        setActive={(id) => setActive(id)}
        onNew={handleNewProfile}
        onExport={() => activeProfileId && exportProfile(activeProfileId)}
        onImport={importProfile}
        onDelete={() => activeProfileId && deleteProfile(activeProfileId)}
        profileName={state.profileName}
        setProfileName={(v) => dispatch({ type: "setProfileName", value: v })}
        onSave={handleSave}
        saving={saving}
      />

      <CaptureSettingsSection onCapture={handleCapture} />

      <DetectorSelectionSection />

      <CalibrationCanvasSection
        lastCapturedImage={lastCapturedImage}
        imgContainerRef={imgContainerRef}
        offscreenCanvasRef={offscreenCanvasRef}
        drawing={drawing}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Detector settings */}
      {state.detectorType === "redness_rois" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Min redness score (0-1)</label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={1}
              value={state.redness.minScore}
              onChange={(e) => dispatch({ type: "setRednessMinScore", value: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Cooldown (ms)</label>
            <input
              type="number"
              min={0}
              value={state.redness.cooldownMs}
              onChange={(e) => dispatch({ type: "setRednessCooldownMs", value: parseInt(e.target.value, 10) || 0 })}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            />
          </div>
        </div>
      ) : state.detectorType === "health_bar" ? (
        <HealthBarSettings />
      ) : (
        <HealthNumberSettings
          onLearn={() => {
            try {
              handleLearnTemplates();
            } catch (e) {
              dispatch({ type: "setHealthNumberCalibrationError", value: e instanceof Error ? e.message : "Failed to learn templates" });
            }
          }}
          onTest={() => {
            try {
              handleTestOcrOnce();
            } catch (e) {
              dispatch({ type: "setHealthNumberCalibrationError", value: e instanceof Error ? e.message : "Failed to test OCR" });
            }
          }}
          onClearTemplates={() => {
            dispatch({ type: "setHealthNumberTemplates", value: {} });
            dispatch({ type: "setHealthNumberTestResult", value: null });
            dispatch({ type: "setHealthNumberCalibrationError", value: null });
          }}
          learnedDigits={Object.keys(state.healthNumber.templates).sort().join(", ")}
        />
      )}

      {/* ROIs */}
      <RoiListSection captureRoiDebugImages={captureRoiDebugImages} />

      {/* Screenshot retention + gallery */}
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

