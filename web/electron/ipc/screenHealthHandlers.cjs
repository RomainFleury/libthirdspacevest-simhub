/**
 * Generic Screen Health Watcher IPC Handlers.
 *
 * Handles:
 * - screenHealth:exportProfile
 * - screenHealth:loadProfile
 * - screenHealth:getSettings / setSettings / chooseScreenshotsDir
 * - screenHealth:listScreenshots / deleteScreenshot / clearScreenshots
 * - screenHealth:captureCalibrationScreenshot / captureRoiDebugImages
 * - screenHealth:start / stop / status (daemon commands)
 */

const { ipcMain, dialog, desktopCapturer, nativeImage, screen, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const storage = require("../screenHealthStorage.cjs");

function _getScreenSourceForMonitorIndex(sources, monitorIndex) {
  // monitorIndex is 1-based to match UX.
  const displays = screen.getAllDisplays();
  const display = displays[monitorIndex - 1];
  if (!display) {
    return null;
  }

  // Prefer display_id match if present.
  const byDisplayId =
    sources.find((s) => String(s.display_id) === String(display.id)) || null;
  if (byDisplayId) return byDisplayId;

  // Fallback: use index in sources (best effort).
  const idx = monitorIndex - 1;
  return sources[idx] || null;
}

async function _captureMonitorImage(monitorIndex) {
  const displays = screen.getAllDisplays();
  const display = displays[monitorIndex - 1];
  if (!display) {
    throw new Error(`Invalid monitorIndex=${monitorIndex}`);
  }

  // Request thumbnails at the selected display size. This is best-effort; on
  // some systems Electron may still provide a scaled thumbnail.
  const thumbSize = {
    width: display.size.width,
    height: display.size.height,
  };

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: thumbSize,
    fetchWindowIcons: false,
  });

  const src = _getScreenSourceForMonitorIndex(sources, monitorIndex);
  if (!src) {
    throw new Error("Failed to locate screen source for selected monitor");
  }

  const img = src.thumbnail;
  if (!img || img.isEmpty()) {
    throw new Error("Captured image is empty (try borderless/windowed mode)");
  }
  return { image: img, width: img.getSize().width, height: img.getSize().height };
}

function registerScreenHealthHandlers(getDaemonBridge, getMainWindow) {
  // -------------------------------------------------------------------------
  // Export & settings
  // -------------------------------------------------------------------------

  ipcMain.handle("screenHealth:exportProfile", async (_, profile) => {
    try {
      if (!profile || typeof profile !== "object") return { success: false, error: "profile is required" };

      const name = typeof profile.name === "string" ? profile.name : "screen-health-profile";
      const mainWindow = getMainWindow();
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export Screen Health Profile",
        defaultPath: `${name}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, JSON.stringify(profile, null, 2), "utf8");
      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:loadProfile", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Load Screen Health Profile",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      const p = result.filePaths[0];
      const raw = fs.readFileSync(p, "utf8");
      const parsed = JSON.parse(raw);
      return { success: true, profile: parsed, path: p };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:getSettings", async () => {
    try {
      const settings = storage.getSettings();
      return { success: true, settings };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:setSettings", async (_, newSettings) => {
    try {
      const settings = storage.setSettings(newSettings);
      storage.enforceRetentionIndex();
      return { success: true, settings };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:chooseScreenshotsDir", async () => {
    try {
      const mainWindow = getMainWindow();
      const currentDir = storage.getScreenshotsDir();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Choose Screenshot Folder",
        properties: ["openDirectory", "createDirectory"],
        defaultPath: currentDir,
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      const dir = result.filePaths[0];
      const settings = storage.setSettings({ ...storage.getSettings(), screenshotsDir: dir });
      return { success: true, settings };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:openScreenshotsDir", async () => {
    try {
      const dir = storage.getScreenshotsDir();
      if (!dir) {
        return { success: false, error: "No screenshots folder configured" };
      }
      const res = await shell.openPath(dir);
      if (res) return { success: false, error: res };
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // -------------------------------------------------------------------------
  // Screenshots / debug images
  // -------------------------------------------------------------------------

  ipcMain.handle("screenHealth:listScreenshots", async () => {
    try {
      storage.enforceRetentionIndex();
      const files = storage.listScreenshots();
      return { success: true, files };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:deleteScreenshot", async (_, filename) => {
    try {
      storage.deleteScreenshot(filename);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:clearScreenshots", async () => {
    try {
      storage.clearScreenshots();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:captureCalibrationScreenshot", async (_, monitorIndex) => {
    try {
      const idx = Number(monitorIndex || 1);
      const { image, width, height } = await _captureMonitorImage(idx);

      const dir = storage.getScreenshotsDir();
      const filename = `calibration_${idx}_${Date.now()}.png`;
      const outPath = path.join(dir, filename);
      const bytes = image.toPNG();
      fs.writeFileSync(outPath, bytes);
      storage.recordScreenshot({ filename, path: outPath, size: bytes.length, mtimeMs: Date.now() });
      storage.enforceRetentionIndex();

      return {
        success: true,
        filename,
        path: outPath,
        width,
        height,
        dataUrl: image.toDataURL(),
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:captureRoiDebugImages", async (_, monitorIndex, rois) => {
    try {
      const idx = Number(monitorIndex || 1);
      const { image, width, height } = await _captureMonitorImage(idx);

      const roiList = Array.isArray(rois) ? rois : [];
      if (!roiList.length) {
        return { success: false, error: "No ROIs provided" };
      }

      const dir = storage.getScreenshotsDir();
      const outputs = [];

      for (const roi of roiList) {
        const rect = roi?.rect || roi?.roi || {};
        const x = Math.max(0, Math.min(1, Number(rect.x || 0)));
        const y = Math.max(0, Math.min(1, Number(rect.y || 0)));
        const w = Math.max(0, Math.min(1, Number(rect.w || 0)));
        const h = Math.max(0, Math.min(1, Number(rect.h || 0)));

        const px = Math.max(0, Math.min(width - 1, Math.round(x * width)));
        const py = Math.max(0, Math.min(height - 1, Math.round(y * height)));
        const pw = Math.max(1, Math.min(width - px, Math.round(w * width)));
        const ph = Math.max(1, Math.min(height - py, Math.round(h * height)));

        const cropped = image.crop({ x: px, y: py, width: pw, height: ph });
        const filename = `roi_${idx}_${roi.name || "roi"}_${Date.now()}.png`;
        const outPath = path.join(dir, filename);
        const bytes = cropped.toPNG();
        fs.writeFileSync(outPath, bytes);
        storage.recordScreenshot({ filename, path: outPath, size: bytes.length, mtimeMs: Date.now() });
        outputs.push({
          filename,
          path: outPath,
          width: pw,
          height: ph,
          dataUrl: cropped.toDataURL(),
        });
      }

      storage.enforceRetentionIndex();

      return { success: true, outputs };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:getScreenshotDataUrl", async (_, filename) => {
    try {
      const dir = storage.getScreenshotsDir();
      const p = path.join(dir, filename);
      if (!fs.existsSync(p)) {
        return { success: false, error: "File not found" };
      }
      const raw = fs.readFileSync(p);
      const img = nativeImage.createFromBuffer(raw);
      return { success: true, dataUrl: img.toDataURL() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // -------------------------------------------------------------------------
  // Profile management
  // -------------------------------------------------------------------------

  ipcMain.handle("screenHealth:listProfiles", async () => {
    try {
      const result = storage.listProfiles();
      return { success: true, profiles: result.profiles || [] };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:saveProfile", async (_, profileData) => {
    try {
      if (!profileData || typeof profileData !== "object") {
        return { success: false, error: "profileData is required" };
      }
      if (typeof profileData.name !== "string" || !profileData.name.trim()) {
        return { success: false, error: "profile name is required" };
      }
      if (!profileData.profile || typeof profileData.profile !== "object") {
        return { success: false, error: "profile.profile is required" };
      }
      // Always create new profile (never updates existing, even if id provided)
      const saved = storage.upsertProfile({
        name: profileData.name,
        profile: profileData.profile,
      });
      return { success: true, profile: saved };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:deleteProfile", async (_, profileId) => {
    try {
      if (typeof profileId !== "string" || !profileId.trim()) {
        return { success: false, error: "profileId is required" };
      }
      storage.deleteProfile(profileId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:getProfile", async (_, profileId) => {
    try {
      if (typeof profileId !== "string" || !profileId.trim()) {
        return { success: false, error: "profileId is required" };
      }
      const result = storage.listProfiles();
      const profile = result.profiles.find((p) => p.id === profileId);
      if (!profile) {
        return { success: false, error: "Profile not found" };
      }
      return { success: true, profile };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // -------------------------------------------------------------------------
  // Daemon control
  // -------------------------------------------------------------------------

  ipcMain.handle("screenHealth:start", async (_, profile) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      if (!profile || typeof profile !== "object") {
        return { success: false, error: "profile is required" };
      }
      return await daemonBridge.screenHealthStart(profile);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:stop", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.screenHealthStop();
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:status", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { running: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.screenHealthStatus();
    } catch (e) {
      return { running: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:test", async (_, profile, outputDir) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      if (!profile || typeof profile !== "object") {
        return { success: false, error: "profile is required" };
      }
      return await daemonBridge.screenHealthTest(profile, outputDir);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { registerScreenHealthHandlers };

