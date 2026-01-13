import { useEffect } from "react";
import { useScreenHealthDaemonEvents } from "./screenHealth/useScreenHealthDaemonEvents";
import { useScreenHealthDaemonStatus } from "./screenHealth/useScreenHealthDaemonStatus";
import { useScreenHealthProfiles } from "./screenHealth/useScreenHealthProfiles";
import { useScreenHealthScreenshots } from "./screenHealth/useScreenHealthScreenshots";
export type { ScreenHealthGameEvent } from "./screenHealth/types";

export function useScreenHealthIntegration() {
  const daemon = useScreenHealthDaemonStatus();
  const profiles = useScreenHealthProfiles({ onError: (msg) => daemon.setError(msg) });
  const screenshots = useScreenHealthScreenshots();
  const events = useScreenHealthDaemonEvents({ setStatus: daemon.setStatus });

  useEffect(() => {
    profiles.refreshProfiles();
    screenshots.refreshSettings();
    daemon.refreshStatus();

    const interval = setInterval(daemon.refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [profiles.refreshProfiles, screenshots.refreshSettings, daemon.refreshStatus]);

  return {
    status: daemon.status,
    loading: daemon.loading,
    error: daemon.error,

    events: events.events,
    latestDebug: events.latestDebug,
    clearEvents: events.clearEvents,

    profiles: profiles.profiles,
    activeProfileId: profiles.activeProfileId,
    activeProfile: profiles.activeProfile,
    saveProfile: profiles.saveProfile,
    deleteProfile: profiles.deleteProfile,
    setActive: profiles.setActive,
    exportProfile: profiles.exportProfile,
    importProfile: profiles.importProfile,

    settings: screenshots.settings,
    updateSettings: screenshots.updateSettings,
    chooseScreenshotsDir: screenshots.chooseScreenshotsDir,

    screenshots: screenshots.screenshots,
    screenshotPreview: screenshots.screenshotPreview,
    loadScreenshotPreview: screenshots.loadScreenshotPreview,
    deleteScreenshot: screenshots.deleteScreenshot,
    clearScreenshots: screenshots.clearScreenshots,
    lastCapturedImage: screenshots.lastCapturedImage,
    captureCalibrationScreenshot: screenshots.captureCalibrationScreenshot,
    captureRoiDebugImages: screenshots.captureRoiDebugImages,

    start: daemon.start,
    stop: daemon.stop,
    refreshStatus: daemon.refreshStatus,
    refreshProfiles: profiles.refreshProfiles,
  };
}

