import { Link } from "react-router-dom";
import { useScreenHealthIntegration } from "../../hooks/useScreenHealthIntegration";
import { ScreenHealthConfigurationPanel } from "./screenHealth/ScreenHealthConfigurationPanel";

export function ScreenHealthCalibrationPage() {
  const integration = useScreenHealthIntegration();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white text-lg font-semibold">Screen Health calibration</div>
          <div className="text-slate-400 text-sm">
            Heavy UI (screenshots, ROI drawing, detector tuning). Keep this separate to avoid freezing the main page.
          </div>
        </div>
        <Link
          to="/games/screen_health"
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:bg-slate-700"
        >
          ← Back to integration
        </Link>
      </div>

      <ScreenHealthConfigurationPanel
        profiles={integration.profiles}
        activeProfileId={integration.activeProfileId}
        activeProfile={integration.activeProfile}
        saveProfile={integration.saveProfile}
        deleteProfile={integration.deleteProfile}
        setActive={integration.setActive}
        exportProfile={integration.exportProfile}
        importProfile={integration.importProfile}
        settings={integration.settings}
        updateSettings={integration.updateSettings}
        chooseScreenshotsDir={integration.chooseScreenshotsDir}
        screenshots={integration.screenshots}
        screenshotPreview={integration.screenshotPreview}
        loadScreenshotPreview={integration.loadScreenshotPreview}
        deleteScreenshot={integration.deleteScreenshot}
        clearScreenshots={integration.clearScreenshots}
        lastCapturedImage={integration.lastCapturedImage}
        captureCalibrationScreenshot={integration.captureCalibrationScreenshot}
        captureRoiDebugImages={integration.captureRoiDebugImages}
      />
    </div>
  );
}

