import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useScreenHealthDaemonStatus } from "../../hooks/screenHealth/useScreenHealthDaemonStatus";
import { useScreenHealthScreenshots } from "../../hooks/screenHealth/useScreenHealthScreenshots";
import { useScreenHealthProfiles } from "../../hooks/screenHealth/useScreenHealthProfiles";
import { ScreenHealthConfigurationPanel } from "./screenHealth/ScreenHealthConfigurationPanel";

export function ScreenHealthBuilderPage() {
  const daemon = useScreenHealthDaemonStatus();
  const screenshots = useScreenHealthScreenshots();
  const profiles = useScreenHealthProfiles();
  const [searchParams] = useSearchParams();
  const [perf, setPerf] = useState<{ statusMs?: number; settingsMs?: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t0 = performance.now();
      await daemon.refreshStatus();
      const t1 = performance.now();
      await screenshots.refreshSettings();
      const t2 = performance.now();
      // NOTE: we intentionally do NOT call screenshots.refreshScreenshots() on mount
      // because listing large screenshot directories can freeze/slow the UI.
      if (!cancelled) {
        setPerf({
          statusMs: t1 - t0,
          settingsMs: t2 - t1,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [daemon.refreshStatus, screenshots.refreshSettings]);

  // Handle ?from=:id URL parameter to load a profile
  useEffect(() => {
    const fromId = searchParams.get("from");
    if (fromId && profiles.profiles.length > 0) {
      const profile = profiles.profiles.find((p) => p.id === fromId);
      if (profile) {
        // Profile will be loaded by the configuration panel
        // This effect just ensures profiles are loaded
      }
    }
  }, [searchParams, profiles.profiles]);

  const perfLine = useMemo(() => {
    if (!perf) return null;
    const parts = [];
    if (typeof perf.statusMs === "number") parts.push(`status=${perf.statusMs.toFixed(0)}ms`);
    if (typeof perf.settingsMs === "number") parts.push(`settings=${perf.settingsMs.toFixed(0)}ms`);
    return parts.join(" ");
  }, [perf]);

  const isDisabled = daemon.status.running;
  const fromId = searchParams.get("from");

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white text-lg font-semibold">Profile Builder</div>
          <div className="text-slate-400 text-sm">
            Create and edit screen health profiles. Configure detectors, ROIs, and settings.
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

      {isDisabled && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Stop screen health to access the builder
          </div>
        </div>
      )}

      <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
        <ScreenHealthConfigurationPanel
          settings={screenshots.settings}
          updateSettings={screenshots.updateSettings}
          chooseScreenshotsDir={screenshots.chooseScreenshotsDir}
          openScreenshotsDir={screenshots.openScreenshotsDir}
          clearScreenshots={screenshots.clearScreenshots}
          lastCapturedImage={screenshots.lastCapturedImage}
          captureCalibrationScreenshot={screenshots.captureCalibrationScreenshot}
          selectExistingScreenshot={screenshots.selectExistingScreenshot}
          captureRoiDebugImages={screenshots.captureRoiDebugImages}
          loadFromProfileId={fromId || undefined}
          profiles={profiles.profiles}
          onSaveProfile={profiles.saveProfile}
        />
      </div>
    </div>
  );
}

