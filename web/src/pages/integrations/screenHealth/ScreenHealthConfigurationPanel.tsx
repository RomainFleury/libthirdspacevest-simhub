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

type RoiDraft = {
  name: string;
  direction?: string | null;
  rect: { x: number; y: number; w: number; h: number };
};

type DetectorType = "redness_rois" | "health_bar" | "health_number";

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

  // Draft editor state (derived from activeProfile)
  const [profileName, setProfileName] = useState<string>("Default");
  const [monitorIndex, setMonitorIndex] = useState<number>(1);
  const [tickMs, setTickMs] = useState<number>(50);
  const [detectorType, setDetectorType] = useState<DetectorType>("redness_rois");

  // Redness detector state
  const [minScore, setMinScore] = useState<number>(0.35);
  const [cooldownMs, setCooldownMs] = useState<number>(200);
  const [rois, setRois] = useState<RoiDraft[]>([]);

  // Health bar detector state
  const [healthBarRoi, setHealthBarRoi] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [healthBarMode, setHealthBarMode] = useState<"color_sampling" | "threshold_fallback">("color_sampling");
  const [filledRgb, setFilledRgb] = useState<[number, number, number]>([220, 40, 40]);
  const [emptyRgb, setEmptyRgb] = useState<[number, number, number]>([40, 40, 40]);
  const [toleranceL1, setToleranceL1] = useState<number>(120);
  const [hbFallbackMode, setHbFallbackMode] = useState<"brightness" | "saturation">("brightness");
  const [hbFallbackMin, setHbFallbackMin] = useState<number>(0.5);
  const [hitMinDrop, setHitMinDrop] = useState<number>(0.02);
  const [hitCooldownMs, setHitCooldownMs] = useState<number>(150);
  const [colorPickMode, setColorPickMode] = useState<null | "filled" | "empty">(null);

  // Health number OCR detector state
  const [healthNumberRoi, setHealthNumberRoi] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [healthNumberDigits, setHealthNumberDigits] = useState<number>(3);
  const [hnInvert, setHnInvert] = useState<boolean>(false);
  const [hnThreshold, setHnThreshold] = useState<number>(0.6);
  const [hnScale, setHnScale] = useState<number>(2);
  const [hnReadMin, setHnReadMin] = useState<number>(0);
  const [hnReadMax, setHnReadMax] = useState<number>(300);
  const [hnStableReads, setHnStableReads] = useState<number>(2);
  const [hnHitMinDrop, setHnHitMinDrop] = useState<number>(1);
  const [hnHitCooldownMs, setHnHitCooldownMs] = useState<number>(150);
  const [hnHammingMax, setHnHammingMax] = useState<number>(120);
  const [hnTemplateSize, setHnTemplateSize] = useState<{ w: number; h: number }>({ w: 16, h: 24 });
  const [hnTemplates, setHnTemplates] = useState<Record<string, string>>({});
  const [hnLearnValue, setHnLearnValue] = useState<string>("");
  const [hnCalibrationError, setHnCalibrationError] = useState<string | null>(null);
  const [hnTestResult, setHnTestResult] = useState<{ value: number | null; digits?: string; reason?: string } | null>(null);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(SCREEN_HEALTH_PRESETS[0]?.preset_id || "");

  useEffect(() => {
    if (!activeProfile?.profile) return;
    const p: any = activeProfile.profile;
    setProfileName(activeProfile.name || p.name || "Unnamed Profile");
    setMonitorIndex(Number(p.capture?.monitor_index || 1));
    setTickMs(Number(p.capture?.tick_ms || 50));

    const detectors: any[] = Array.isArray(p.detectors) ? p.detectors : [];
    const hb = detectors.find((d: any) => d.type === "health_bar");
    const hn = detectors.find((d: any) => d.type === "health_number");
    const red = detectors.find((d: any) => d.type === "redness_rois");

    if (hn) {
      setDetectorType("health_number");
      setHealthNumberRoi({
        x: Number(hn.roi?.x ?? 0),
        y: Number(hn.roi?.y ?? 0),
        w: Number(hn.roi?.w ?? 0.12),
        h: Number(hn.roi?.h ?? 0.06),
      });
      setHealthNumberDigits(Number(hn.digits ?? 3));
      setHnInvert(Boolean(hn.preprocess?.invert ?? false));
      setHnThreshold(Number(hn.preprocess?.threshold ?? 0.6));
      setHnScale(Number(hn.preprocess?.scale ?? 2));
      setHnReadMin(Number(hn.readout?.min ?? 0));
      setHnReadMax(Number(hn.readout?.max ?? 300));
      setHnStableReads(Number(hn.readout?.stable_reads ?? 2));
      setHnHitMinDrop(Number(hn.hit_on_decrease?.min_drop ?? 1));
      setHnHitCooldownMs(Number(hn.hit_on_decrease?.cooldown_ms ?? 150));
      setHnHammingMax(Number(hn.templates?.hamming_max ?? 120));
      setHnTemplateSize({
        w: Number(hn.templates?.width ?? 16),
        h: Number(hn.templates?.height ?? 24),
      });
      const digitsMap = hn.templates?.digits;
      if (digitsMap && typeof digitsMap === "object") {
        const next: Record<string, string> = {};
        for (const k of Object.keys(digitsMap)) {
          const v = (digitsMap as any)[k];
          if (typeof v === "string") next[String(k)] = v;
        }
        setHnTemplates(next);
      } else {
        setHnTemplates({});
      }
      setColorPickMode(null);
      setHnCalibrationError(null);
      setHnTestResult(null);
    } else if (hb) {
      setDetectorType("health_bar");
      setHealthBarRoi({
        x: Number(hb.roi?.x ?? 0),
        y: Number(hb.roi?.y ?? 0),
        w: Number(hb.roi?.w ?? 0.3),
        h: Number(hb.roi?.h ?? 0.03),
      });
      const cs = hb.color_sampling;
      const fb = hb.threshold_fallback;
      if (cs) setHealthBarMode("color_sampling");
      else if (fb) setHealthBarMode("threshold_fallback");
      if (Array.isArray(cs?.filled_rgb) && cs.filled_rgb.length === 3) {
        setFilledRgb([
          clampInt(Number(cs.filled_rgb[0]), 0, 255),
          clampInt(Number(cs.filled_rgb[1]), 0, 255),
          clampInt(Number(cs.filled_rgb[2]), 0, 255),
        ]);
      }
      if (Array.isArray(cs?.empty_rgb) && cs.empty_rgb.length === 3) {
        setEmptyRgb([
          clampInt(Number(cs.empty_rgb[0]), 0, 255),
          clampInt(Number(cs.empty_rgb[1]), 0, 255),
          clampInt(Number(cs.empty_rgb[2]), 0, 255),
        ]);
      }
      setToleranceL1(clampInt(Number(cs?.tolerance_l1 ?? 120), 0, 765));
      if (fb) {
        setHbFallbackMode((fb.mode as "brightness" | "saturation") || "brightness");
        setHbFallbackMin(Number(fb.min ?? 0.5));
      }
      setHitMinDrop(Number(hb.hit_on_decrease?.min_drop ?? 0.02));
      setHitCooldownMs(Number(hb.hit_on_decrease?.cooldown_ms ?? 150));
      setColorPickMode(null);
    } else {
      setDetectorType("redness_rois");
      setMinScore(Number(red?.threshold?.min_score ?? 0.35));
      setCooldownMs(Number(red?.cooldown_ms ?? 200));
      const srcRois: any[] = Array.isArray(red?.rois) ? red.rois : [];
      setRois(
        srcRois.map((r, idx) => ({
          name: String(r.name || `roi_${idx}`),
          direction: r.direction || "",
          rect: {
            x: Number(r.rect?.x ?? 0),
            y: Number(r.rect?.y ?? 0),
            w: Number(r.rect?.w ?? 0.1),
            h: Number(r.rect?.h ?? 0.1),
          },
        }))
      );
    }
  }, [activeProfile]);

  const daemonProfile = useMemo(() => {
    if (detectorType === "health_bar") {
      const roi = healthBarRoi ?? { x: 0.1, y: 0.9, w: 0.3, h: 0.03 };
      return {
        schema_version: 0,
        name: profileName,
        meta: (activeProfile?.profile as any)?.meta,
        capture: { source: "monitor", monitor_index: monitorIndex, tick_ms: tickMs },
        detectors: [
          {
            type: "health_bar",
            name: "health_bar",
            roi: { x: clamp01(roi.x), y: clamp01(roi.y), w: clamp01(roi.w), h: clamp01(roi.h) },
            orientation: "horizontal",
            ...(healthBarMode === "color_sampling"
              ? {
                  color_sampling: {
                    filled_rgb: filledRgb.map((v) => clampInt(v, 0, 255)),
                    empty_rgb: emptyRgb.map((v) => clampInt(v, 0, 255)),
                    tolerance_l1: clampInt(toleranceL1, 0, 765),
                  },
                }
              : {
                  threshold_fallback: {
                    mode: hbFallbackMode,
                    min: Math.max(0, Math.min(1, hbFallbackMin)),
                  },
                }),
            hit_on_decrease: {
              min_drop: Math.max(0, Math.min(1, hitMinDrop)),
              cooldown_ms: Math.max(0, Math.floor(hitCooldownMs)),
            },
          },
        ],
      };
    }

    if (detectorType === "health_number") {
      const roi = healthNumberRoi ?? { x: 0.05, y: 0.9, w: 0.12, h: 0.06 };
      return {
        schema_version: 0,
        name: profileName,
        meta: (activeProfile?.profile as any)?.meta,
        capture: { source: "monitor", monitor_index: monitorIndex, tick_ms: tickMs },
        detectors: [
          {
            type: "health_number",
            name: "health_number",
            roi: { x: clamp01(roi.x), y: clamp01(roi.y), w: clamp01(roi.w), h: clamp01(roi.h) },
            digits: Math.max(1, Math.floor(healthNumberDigits)),
            preprocess: {
              invert: Boolean(hnInvert),
              threshold: Math.max(0, Math.min(1, hnThreshold)),
              scale: Math.max(1, Math.floor(hnScale)),
            },
            readout: {
              min: Math.floor(hnReadMin),
              max: Math.floor(hnReadMax),
              stable_reads: Math.max(1, Math.floor(hnStableReads)),
            },
            templates: {
              template_set_id: "learned_v1",
              hamming_max: Math.max(0, Math.floor(hnHammingMax)),
              width: hnTemplateSize.w,
              height: hnTemplateSize.h,
              digits: hnTemplates,
            },
            hit_on_decrease: {
              min_drop: Math.max(1, Math.floor(hnHitMinDrop)),
              cooldown_ms: Math.max(0, Math.floor(hnHitCooldownMs)),
            },
          },
        ],
      };
    }

    return {
      schema_version: 0,
      name: profileName,
      meta: (activeProfile?.profile as any)?.meta,
      capture: { source: "monitor", monitor_index: monitorIndex, tick_ms: tickMs },
      detectors: [
        {
          type: "redness_rois",
          cooldown_ms: cooldownMs,
          threshold: { min_score: minScore },
          rois: rois.map((r) => ({
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
  }, [
    detectorType,
    profileName,
    monitorIndex,
    tickMs,
    // redness
    cooldownMs,
    minScore,
    rois,
    // health bar
    healthBarRoi,
    healthBarMode,
    filledRgb,
    emptyRgb,
    toleranceL1,
    hbFallbackMode,
    hbFallbackMin,
    hitMinDrop,
    hitCooldownMs,
    // health number
    healthNumberRoi,
    healthNumberDigits,
    hnInvert,
    hnThreshold,
    hnScale,
    hnReadMin,
    hnReadMax,
    hnStableReads,
    hnHitMinDrop,
    hnHitCooldownMs,
    hnHammingMax,
    hnTemplateSize,
    hnTemplates,
    activeProfile?.profile,
  ]);

  // If template size changes, existing learned bitstrings are invalid.
  useEffect(() => {
    setHnTemplates({});
    setHnTestResult(null);
  }, [hnTemplateSize.w, hnTemplateSize.h]);

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!activeProfileId) return;
    setSaving(true);
    try {
      await saveProfile({
        id: activeProfileId,
        name: profileName,
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
    const preset = SCREEN_HEALTH_PRESETS.find((p) => p.preset_id === selectedPresetId);
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
    await captureCalibrationScreenshot(monitorIndex);
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
    if (!colorPickMode || !imgContainerRef.current) return false;
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
    if (colorPickMode === "filled") setFilledRgb(rgb);
    else setEmptyRgb(rgb);
    setColorPickMode(null);
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
    if (detectorType === "health_bar") setHealthBarRoi(newRect);
    else if (detectorType === "health_number") setHealthNumberRoi(newRect);
    else setRois((prev) => [...prev, { name: `roi_${rois.length + 1}`, direction: "", rect: newRect }]);
  };

  const handleLearnTemplates = () => {
    setHnCalibrationError(null);
    setHnTestResult(null);
    if (!healthNumberRoi) throw new Error("No health number ROI set");
    const canvas = offscreenCanvasRef.current;
    if (!canvas || !imageLoadedRef.current) throw new Error("No screenshot loaded");
    const digitsCount = Math.max(1, Math.floor(healthNumberDigits));
    const next = learnDigitTemplatesFromCanvas({
      canvas,
      roi: healthNumberRoi,
      digitsCount,
      displayedValue: hnLearnValue,
      threshold: hnThreshold,
      invert: hnInvert,
      scale: hnScale,
      templateSize: hnTemplateSize,
      prevTemplates: hnTemplates,
    });
    setHnTemplates(next);
  };

  const handleTestOcrOnce = () => {
    setHnCalibrationError(null);
    if (!healthNumberRoi) throw new Error("No health number ROI set");
    const canvas = offscreenCanvasRef.current;
    if (!canvas || !imageLoadedRef.current) throw new Error("No screenshot loaded");
    const digitsCount = Math.max(1, Math.floor(healthNumberDigits));
    const result = tryReadDigitValueFromCanvas({
      canvas,
      roi: healthNumberRoi,
      digitsCount,
      threshold: hnThreshold,
      invert: hnInvert,
      scale: hnScale,
      templateSize: hnTemplateSize,
      templates: hnTemplates,
      hammingMax: hnHammingMax,
    });
    setHnTestResult(result);
  };

  return (
    <div className="space-y-6">
      <PresetProfilesSection
        presets={SCREEN_HEALTH_PRESETS}
        selectedPresetId={selectedPresetId}
        setSelectedPresetId={setSelectedPresetId}
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
        profileName={profileName}
        setProfileName={setProfileName}
        onSave={handleSave}
        saving={saving}
      />

      <CaptureSettingsSection
        monitorIndex={monitorIndex}
        setMonitorIndex={setMonitorIndex}
        tickMs={tickMs}
        setTickMs={setTickMs}
        onCapture={handleCapture}
      />

      <DetectorSelectionSection detectorType={detectorType} setDetectorType={setDetectorType} />

      <CalibrationCanvasSection
        lastCapturedImage={lastCapturedImage}
        detectorType={detectorType}
        colorPickMode={colorPickMode}
        imgContainerRef={imgContainerRef}
        offscreenCanvasRef={offscreenCanvasRef}
        drawing={drawing}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        rois={rois}
        healthBarRoi={healthBarRoi}
        healthNumberRoi={healthNumberRoi}
      />

      {/* Detector settings */}
      {detectorType === "redness_rois" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Min redness score (0-1)</label>
            <input type="number" step={0.01} min={0} max={1} value={minScore} onChange={(e) => setMinScore(parseFloat(e.target.value) || 0)} className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Cooldown (ms)</label>
            <input type="number" min={0} value={cooldownMs} onChange={(e) => setCooldownMs(parseInt(e.target.value, 10) || 0)} className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10" />
          </div>
        </div>
      ) : detectorType === "health_bar" ? (
        <HealthBarSettings
          mode={healthBarMode}
          setMode={setHealthBarMode}
          filledRgb={filledRgb}
          setFilledRgb={setFilledRgb}
          emptyRgb={emptyRgb}
          setEmptyRgb={setEmptyRgb}
          toleranceL1={toleranceL1}
          setToleranceL1={setToleranceL1}
          hitMinDrop={hitMinDrop}
          setHitMinDrop={setHitMinDrop}
          hitCooldownMs={hitCooldownMs}
          setHitCooldownMs={setHitCooldownMs}
          colorPickMode={colorPickMode}
          setColorPickMode={setColorPickMode}
          fallbackMode={hbFallbackMode}
          setFallbackMode={setHbFallbackMode}
          fallbackMin={hbFallbackMin}
          setFallbackMin={setHbFallbackMin}
        />
      ) : (
        <HealthNumberSettings
          digits={healthNumberDigits}
          setDigits={setHealthNumberDigits}
          threshold={hnThreshold}
          setThreshold={setHnThreshold}
          scale={hnScale}
          setScale={setHnScale}
          invert={hnInvert}
          setInvert={setHnInvert}
          readMin={hnReadMin}
          setReadMin={setHnReadMin}
          readMax={hnReadMax}
          setReadMax={setHnReadMax}
          stableReads={hnStableReads}
          setStableReads={setHnStableReads}
          hammingMax={hnHammingMax}
          setHammingMax={setHnHammingMax}
          templateW={hnTemplateSize.w}
          setTemplateW={(v) => setHnTemplateSize((p) => ({ ...p, w: v }))}
          templateH={hnTemplateSize.h}
          setTemplateH={(v) => setHnTemplateSize((p) => ({ ...p, h: v }))}
          hitMinDrop={hnHitMinDrop}
          setHitMinDrop={setHnHitMinDrop}
          hitCooldownMs={hnHitCooldownMs}
          setHitCooldownMs={setHnHitCooldownMs}
          learnValue={hnLearnValue}
          setLearnValue={setHnLearnValue}
          onLearn={() => {
            try {
              handleLearnTemplates();
            } catch (e) {
              setHnCalibrationError(e instanceof Error ? e.message : "Failed to learn templates");
            }
          }}
          onTest={() => {
            try {
              handleTestOcrOnce();
            } catch (e) {
              setHnCalibrationError(e instanceof Error ? e.message : "Failed to test OCR");
            }
          }}
          onClearTemplates={() => {
            setHnTemplates({});
            setHnTestResult(null);
            setHnCalibrationError(null);
          }}
          learnedDigits={Object.keys(hnTemplates).sort().join(", ")}
          error={hnCalibrationError}
          testResult={hnTestResult}
        />
      )}

      {/* ROIs */}
      <RoiListSection
        detectorType={detectorType}
        monitorIndex={monitorIndex}
        captureRoiDebugImages={captureRoiDebugImages}
        rois={rois}
        setRois={setRois}
        healthBarRoi={healthBarRoi}
        setHealthBarRoi={setHealthBarRoi}
        healthNumberRoi={healthNumberRoi}
        setHealthNumberRoi={setHealthNumberRoi}
      />

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

