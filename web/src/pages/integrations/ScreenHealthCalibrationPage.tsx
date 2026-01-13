import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useScreenHealthDaemonStatus } from "../../hooks/screenHealth/useScreenHealthDaemonStatus";
import { useScreenHealthProfiles } from "../../hooks/screenHealth/useScreenHealthProfiles";
import { useScreenHealthScreenshots } from "../../hooks/screenHealth/useScreenHealthScreenshots";
import { ScreenHealthConfigurationPanel } from "./screenHealth/ScreenHealthConfigurationPanel";

export function ScreenHealthCalibrationPage() {
  const daemon = useScreenHealthDaemonStatus();
  const profiles = useScreenHealthProfiles({ onError: (msg) => daemon.setError(msg) });
  const screenshots = useScreenHealthScreenshots();
  const [perf, setPerf] = useState<{ profilesMs?: number; statusMs?: number; settingsMs?: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t0 = performance.now();
      await profiles.refreshProfiles();
      const t1 = performance.now();
      await daemon.refreshStatus();
      const t2 = performance.now();
      await screenshots.refreshSettings();
      const t3 = performance.now();
      // NOTE: we intentionally do NOT call screenshots.refreshScreenshots() on mount
      // because listing large screenshot directories can freeze/slow the UI.
      if (!cancelled) {
        setPerf({
          profilesMs: t1 - t0,
          statusMs: t2 - t1,
          settingsMs: t3 - t2,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profiles.refreshProfiles, daemon.refreshStatus, screenshots.refreshSettings]);

  const perfLine = useMemo(() => {
    if (!perf) return null;
    const parts = [];
    if (typeof perf.profilesMs === "number") parts.push(`profiles=${perf.profilesMs.toFixed(0)}ms`);
    if (typeof perf.statusMs === "number") parts.push(`status=${perf.statusMs.toFixed(0)}ms`);
    if (typeof perf.settingsMs === "number") parts.push(`settings=${perf.settingsMs.toFixed(0)}ms`);
    return parts.join(" ");
  }, [perf]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white text-lg font-semibold">Screen Health calibration</div>
          <div className="text-slate-400 text-sm">
            Heavy UI (screenshots, ROI drawing, detector tuning). Keep this separate to avoid freezing the main page.
          </div>
          {perfLine && <div className="text-xs text-slate-500 mt-1">Load timings: {perfLine}</div>}
        </div>
        <Link
          to="/games/screen_health"
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:bg-slate-700"
        >
          ← Back to integration
        </Link>
      </div>

      <ScreenHealthConfigurationPanel
        profiles={profiles.profiles}
        activeProfileId={profiles.activeProfileId}
        activeProfile={profiles.activeProfile}
        saveProfile={profiles.saveProfile}
        deleteProfile={profiles.deleteProfile}
        setActive={profiles.setActive}
        exportProfile={profiles.exportProfile}
        importProfile={profiles.importProfile}
        settings={screenshots.settings}
        updateSettings={screenshots.updateSettings}
        chooseScreenshotsDir={screenshots.chooseScreenshotsDir}
        openScreenshotsDir={screenshots.openScreenshotsDir}
        clearScreenshots={screenshots.clearScreenshots}
        lastCapturedImage={screenshots.lastCapturedImage}
        captureCalibrationScreenshot={screenshots.captureCalibrationScreenshot}
        captureRoiDebugImages={screenshots.captureRoiDebugImages}
      />
    </div>
  );
}

