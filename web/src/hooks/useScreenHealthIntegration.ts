import { useCallback, useEffect, useRef, useState } from "react";
import {
  DaemonEvent,
  ScreenHealthStatus,
  ScreenHealthStoredProfile,
  ScreenHealthSettings,
  ScreenHealthScreenshotFile,
  screenHealthCaptureCalibrationScreenshot,
  screenHealthCaptureRoiDebugImages,
  screenHealthClearScreenshots,
  screenHealthDeleteProfile,
  screenHealthDeleteScreenshot,
  screenHealthExportProfile,
  screenHealthGetActiveProfile,
  screenHealthGetSettings,
  screenHealthImportProfile,
  screenHealthListProfiles,
  screenHealthListScreenshots,
  screenHealthGetScreenshotDataUrl,
  screenHealthSaveProfile,
  screenHealthSetActiveProfile,
  screenHealthSetSettings,
  screenHealthChooseScreenshotsDir,
  screenHealthStart,
  screenHealthStatus,
  screenHealthStop,
  subscribeToDaemonEvents,
} from "../lib/bridgeApi";

export type ScreenHealthGameEvent = {
  id: string;
  type: "hit_recorded" | "health_percent";
  ts: number;
  roi?: string | null;
  direction?: string | null;
  score?: number;
  detector?: string | null;
  health_percent?: number;
};

const MAX_EVENTS = 50;

export function useScreenHealthIntegration() {
  const [status, setStatus] = useState<ScreenHealthStatus>({ running: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ScreenHealthStoredProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<ScreenHealthStoredProfile | null>(null);

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

  const [events, setEvents] = useState<ScreenHealthGameEvent[]>([]);
  const eventIdCounter = useRef(0);

  const refreshProfiles = useCallback(async () => {
    const result = await screenHealthListProfiles();
    if (!result.success) {
      setError(result.error || "Failed to load profiles");
      return;
    }
    setProfiles(result.profiles || []);
    setActiveProfileId(result.activeProfileId ?? null);
    const active = await screenHealthGetActiveProfile();
    if (active.success) {
      setActiveProfile(active.profile || null);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    const result = await screenHealthGetSettings();
    if (result.success && result.settings) {
      setSettingsState(result.settings);
    }
  }, []);

  const refreshScreenshots = useCallback(async () => {
    const result = await screenHealthListScreenshots();
    if (result.success && result.files) {
      setScreenshots(result.files);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const s = await screenHealthStatus();
    setStatus(s);
    setError(s.error || null);
  }, []);

  useEffect(() => {
    refreshProfiles();
    refreshSettings();
    refreshScreenshots();
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshProfiles, refreshSettings, refreshScreenshots, refreshStatus]);

  // Subscribe to daemon events
  useEffect(() => {
    const unsubscribe = subscribeToDaemonEvents((event: DaemonEvent) => {
      if (event.event === "screen_health_started") {
        setStatus((prev) => ({ ...prev, running: true, profile_name: event.profile_name ?? prev.profile_name }));
      } else if (event.event === "screen_health_stopped") {
        setStatus((prev) => ({ ...prev, running: false }));
      } else if (event.event === "screen_health_hit") {
        const roi = (event.params?.roi as string | undefined) ?? null;
        const newEvent: ScreenHealthGameEvent = {
          id: `sh-${++eventIdCounter.current}`,
          type: "hit_recorded",
          ts: event.ts * 1000,
          roi,
          direction: (event.direction as string | undefined) ?? null,
          score: typeof event.score === "number" ? event.score : undefined,
        };
        setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
        setStatus((prev) => ({
          ...prev,
          events_received: (prev.events_received ?? 0) + 1,
          last_event_ts: event.ts,
          last_hit_ts: event.ts,
        }));
      } else if (event.event === "screen_health_health") {
        const newEvent: ScreenHealthGameEvent = {
          id: `sh-${++eventIdCounter.current}`,
          type: "health_percent",
          ts: event.ts * 1000,
          detector: (event.detector as string | undefined) ?? null,
          health_percent: typeof event.health_percent === "number" ? event.health_percent : undefined,
        };
        setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
        setStatus((prev) => ({
          ...prev,
          events_received: (prev.events_received ?? 0) + 1,
          last_event_ts: event.ts,
        }));
      }
    });
    return unsubscribe;
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await screenHealthStart();
      if (!result.success) {
        setError(result.error || "Failed to start");
      }
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await screenHealthStop();
      if (!result.success) {
        setError(result.error || "Failed to stop");
      }
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const clearEvents = useCallback(() => setEvents([]), []);

  const saveProfile = useCallback(async (profile: Partial<ScreenHealthStoredProfile> | Record<string, any>) => {
    const result = await screenHealthSaveProfile(profile);
    if (!result.success) {
      throw new Error(result.error || "Failed to save profile");
    }
    await refreshProfiles();
    return result.profile!;
  }, [refreshProfiles]);

  const deleteProfile = useCallback(async (profileId: string) => {
    const result = await screenHealthDeleteProfile(profileId);
    if (!result.success) throw new Error(result.error || "Failed to delete profile");
    await refreshProfiles();
  }, [refreshProfiles]);

  const setActive = useCallback(async (profileId: string) => {
    const result = await screenHealthSetActiveProfile(profileId);
    if (!result.success) throw new Error(result.error || "Failed to set active profile");
    await refreshProfiles();
  }, [refreshProfiles]);

  const exportProfile = useCallback(async (profileId: string) => {
    const result = await screenHealthExportProfile(profileId);
    if (!result.success && !result.canceled) {
      throw new Error(result.error || "Failed to export profile");
    }
    return result;
  }, []);

  const importProfile = useCallback(async () => {
    const result = await screenHealthImportProfile();
    if (!result.success && !result.canceled) {
      throw new Error(result.error || "Failed to import profile");
    }
    await refreshProfiles();
    return result.profile || null;
  }, [refreshProfiles]);

  const updateSettings = useCallback(async (patch: Partial<ScreenHealthSettings>) => {
    const result = await screenHealthSetSettings(patch);
    if (!result.success) throw new Error(result.error || "Failed to update settings");
    if (result.settings) setSettingsState(result.settings);
    await refreshScreenshots();
  }, [refreshScreenshots]);

  const chooseScreenshotsDir = useCallback(async () => {
    const result = await screenHealthChooseScreenshotsDir();
    if (!result.success && !result.canceled) {
      throw new Error(result.error || "Failed to choose screenshots dir");
    }
    if (result.settings) setSettingsState(result.settings);
    await refreshScreenshots();
  }, [refreshScreenshots]);

  const captureCalibrationScreenshot = useCallback(async (monitorIndex: number) => {
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
  }, [refreshScreenshots]);

  const captureRoiDebugImages = useCallback(async (monitorIndex: number, rois: Array<{ name: string; rect: { x: number; y: number; w: number; h: number } }>) => {
    const result = await screenHealthCaptureRoiDebugImages(monitorIndex, rois);
    if (!result.success) throw new Error(result.error || "Failed to capture ROI debug images");
    await refreshScreenshots();
    return result.outputs || [];
  }, [refreshScreenshots]);

  const deleteScreenshot = useCallback(async (filename: string) => {
    const result = await screenHealthDeleteScreenshot(filename);
    if (!result.success) throw new Error(result.error || "Failed to delete screenshot");
    await refreshScreenshots();
  }, [refreshScreenshots]);

  const clearScreenshots = useCallback(async () => {
    const result = await screenHealthClearScreenshots();
    if (!result.success) throw new Error(result.error || "Failed to clear screenshots");
    await refreshScreenshots();
  }, [refreshScreenshots]);

  const loadScreenshotPreview = useCallback(async (filename: string) => {
    const result = await screenHealthGetScreenshotDataUrl(filename);
    if (!result.success || !result.dataUrl) {
      throw new Error(result.error || "Failed to load screenshot preview");
    }
    setScreenshotPreview({ filename, dataUrl: result.dataUrl });
  }, []);

  return {
    status,
    loading,
    error,
    events,
    clearEvents,

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

    start,
    stop,
    refreshStatus,
    refreshProfiles,
  };
}

