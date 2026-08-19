import { useCallback, useState } from "react";
import {
  ScreenHealthScreenshotFile,
  ScreenHealthSettings,
  screenHealthCaptureCalibrationScreenshot,
  screenHealthSelectExistingScreenshot,
  screenHealthMaterializeCalibrationScreenshot,
  screenHealthTestProfileOnScreenshot,
  screenHealthClearScreenshots,
  screenHealthDeleteScreenshot,
  screenHealthGetScreenshotDataUrl,
  screenHealthGetSettings,
  screenHealthListScreenshots,
  screenHealthChooseScreenshotsDir,
  screenHealthOpenScreenshotsDir,
  screenHealthSetSettings,
} from "../../lib/bridgeApi";
import type { CalibrationScreenshot } from "../../pages/integrations/screenHealth/calibrationScreenshot";

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
    },
    []
  );

  const chooseScreenshotsDir = useCallback(async () => {
    const result = await screenHealthChooseScreenshotsDir();
    if (!result.success && !result.canceled) throw new Error(result.error || "Failed to choose screenshots dir");
    if (result.settings) setSettingsState(result.settings);
  }, []);

  const openScreenshotsDir = useCallback(async () => {
    const result = await screenHealthOpenScreenshotsDir();
    if (!result.success) throw new Error(result.error || "Failed to open screenshots dir");
  }, []);

  const selectExistingScreenshot = useCallback(async () => {
    const result = await screenHealthSelectExistingScreenshot();
    if (result.canceled) {
      return { canceled: true };
    }
    if (!result.success || !result.dataUrl || !result.width || !result.height || !result.filename || !result.path) {
      throw new Error(result.error || "Failed to load screenshot");
    }
    setLastCapturedImage({
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height,
      filename: result.filename,
      path: result.path,
    });
    return result;
  }, []);

  const loadCalibrationScreenshot = useCallback(
    async (payload: { path?: string; dataUrl?: string; shot?: CalibrationScreenshot; url?: string }) => {
      const resolvedUrl = payload.url
        ? /^(https?:|data:|file:|blob:)/i.test(payload.url)
          ? payload.url
          : payload.url.startsWith("/")
            ? `${window.location.origin}${payload.url}`
            : `${window.location.origin}/${payload.url.replace(/^\.\//, "")}`
        : undefined;
      const result = await screenHealthMaterializeCalibrationScreenshot({
        path: payload.path,
        dataUrl: payload.dataUrl,
        shot: payload.shot,
        url: resolvedUrl || payload.url,
      });
      if (!result.success || !result.dataUrl || !result.path || !result.filename) {
        throw new Error(result.error || "Failed to load calibration screenshot");
      }
      const image = {
        dataUrl: result.dataUrl,
        width: result.width || 0,
        height: result.height || 0,
        filename: result.filename,
        path: result.path,
      };
      setLastCapturedImage(image);
      return { image, screenshot: result.screenshot || null };
    },
    []
  );

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
      return result;
    },
    []
  );

  const evaluateProfileOnScreenshot = useCallback(
    async (profile: Record<string, any>, imagePath: string) => {
      return await screenHealthTestProfileOnScreenshot(profile, imagePath);
    },
    []
  );

  const deleteScreenshot = useCallback(
    async (filename: string) => {
      const result = await screenHealthDeleteScreenshot(filename);
      if (!result.success) throw new Error(result.error || "Failed to delete screenshot");
    },
    []
  );

  const clearScreenshots = useCallback(async () => {
    const result = await screenHealthClearScreenshots();
    if (!result.success) throw new Error(result.error || "Failed to clear screenshots");
  }, []);

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
    selectExistingScreenshot,
    loadCalibrationScreenshot,
    captureCalibrationScreenshot,
    evaluateProfileOnScreenshot,
    deleteScreenshot,
    clearScreenshots,
    loadScreenshotPreview,
  };
}

