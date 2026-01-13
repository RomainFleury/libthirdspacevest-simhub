import { useCallback, useState } from "react";
import {
  ScreenHealthCapturedImage,
  ScreenHealthScreenshotFile,
  ScreenHealthSettings,
  screenHealthCaptureCalibrationScreenshot,
  screenHealthCaptureRoiDebugImages,
  screenHealthClearScreenshots,
  screenHealthDeleteScreenshot,
  screenHealthGetScreenshotDataUrl,
  screenHealthGetSettings,
  screenHealthListScreenshots,
  screenHealthChooseScreenshotsDir,
  screenHealthOpenScreenshotsDir,
  screenHealthSetSettings,
} from "../../lib/bridgeApi";

export function useScreenHealthScreenshots() {
  const [settings, setSettingsState] = useState<ScreenHealthSettings | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenHealthScreenshotFile[]>([]);
  const [screenshotPreview, setScreenshotPreview] = useState<{ filename: string; dataUrl: string } | null>(null);
  const [lastCapturedImage, setLastCapturedImage] = useState<{
    dataUrl: string;
    width: number;
    height: number;
    filename: string;
    path: string;
  } | null>(null);

  const refreshSettings = useCallback(async () => {
    const result = await screenHealthGetSettings();
    if (result.success && result.settings) setSettingsState(result.settings);
  }, []);

  const refreshScreenshots = useCallback(async () => {
    const result = await screenHealthListScreenshots();
    if (result.success && result.files) setScreenshots(result.files);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<ScreenHealthSettings>) => {
      const result = await screenHealthSetSettings(patch);
      if (!result.success) throw new Error(result.error || "Failed to update settings");
      if (result.settings) setSettingsState(result.settings);
      await refreshScreenshots();
    },
    [refreshScreenshots]
  );

  const chooseScreenshotsDir = useCallback(async () => {
    const result = await screenHealthChooseScreenshotsDir();
    if (!result.success && !result.canceled) throw new Error(result.error || "Failed to choose screenshots dir");
    if (result.settings) setSettingsState(result.settings);
    await refreshScreenshots();
  }, [refreshScreenshots]);

  const openScreenshotsDir = useCallback(async () => {
    const result = await screenHealthOpenScreenshotsDir();
    if (!result.success) throw new Error(result.error || "Failed to open screenshots dir");
  }, []);

  const captureCalibrationScreenshot = useCallback(
    async (monitorIndex: number) => {
      const result = await screenHealthCaptureCalibrationScreenshot(monitorIndex);
      if (!result.success || !result.dataUrl || !result.width || !result.height || !result.filename || !result.path) {
        throw new Error(result.error || "Failed to capture screenshot");
      }
      setLastCapturedImage({
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        filename: result.filename,
        path: result.path,
      });
      await refreshScreenshots();
      return result;
    },
    [refreshScreenshots]
  );

  const captureRoiDebugImages = useCallback(
    async (monitorIndex: number, rois: Array<{ name: string; rect: { x: number; y: number; w: number; h: number } }>) => {
      const result = await screenHealthCaptureRoiDebugImages(monitorIndex, rois);
      if (!result.success) throw new Error(result.error || "Failed to capture ROI debug images");
      await refreshScreenshots();
      return (result.outputs || []) as ScreenHealthCapturedImage[];
    },
    [refreshScreenshots]
  );

  const deleteScreenshot = useCallback(
    async (filename: string) => {
      const result = await screenHealthDeleteScreenshot(filename);
      if (!result.success) throw new Error(result.error || "Failed to delete screenshot");
      await refreshScreenshots();
    },
    [refreshScreenshots]
  );

  const clearScreenshots = useCallback(async () => {
    const result = await screenHealthClearScreenshots();
    if (!result.success) throw new Error(result.error || "Failed to clear screenshots");
    await refreshScreenshots();
  }, [refreshScreenshots]);

  const loadScreenshotPreview = useCallback(async (filename: string) => {
    const result = await screenHealthGetScreenshotDataUrl(filename);
    if (!result.success || !result.dataUrl) throw new Error(result.error || "Failed to load screenshot preview");
    setScreenshotPreview({ filename, dataUrl: result.dataUrl });
  }, []);

  return {
    settings,
    screenshots,
    screenshotPreview,
    lastCapturedImage,
    refreshSettings,
    refreshScreenshots,
    updateSettings,
    chooseScreenshotsDir,
    openScreenshotsDir,
    captureCalibrationScreenshot,
    captureRoiDebugImages,
    deleteScreenshot,
    clearScreenshots,
    loadScreenshotPreview,
  };
}

