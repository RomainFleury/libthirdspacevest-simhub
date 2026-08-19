/**
 * Generic Screen Health Watcher IPC Handlers.
 *
 * Handles:
 * - screenHealth:exportProfile
 * - screenHealth:loadProfile
 * - screenHealth:getSettings / setSettings / chooseScreenshotsDir
 * - screenHealth:listScreenshots / deleteScreenshot / clearScreenshots
 * - screenHealth:captureCalibrationScreenshot / captureRoiDebugImages
 * - screenHealth:start / stop / status / test (daemon; test uses temp raw BGRA file + path on wire)
 */

const { ipcMain, dialog, desktopCapturer, nativeImage, screen, shell } = require("electron");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const storage = require("../screenHealthStorage.cjs");

/**
 * Load calibration screenshot as tight row-major BGRA, write to a temp file for the daemon (TCP JSON stays small).
 * Daemon reads bytes and deletes the file; caller should also unlink after the RPC returns.
 */
function _writeScreenHealthTestBgraTempFile(imagePath) {
  const trimmed = String(imagePath || "").trim();
  if (!trimmed) {
    throw new Error("imagePath is required");
  }
  const resolved = path.resolve(trimmed);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Screenshot file not found: ${resolved}`);
  }
  const image = nativeImage.createFromPath(resolved);
  if (image.isEmpty()) {
    throw new Error("Failed to load screenshot image");
  }
  const { width, height } = image.getSize();
  if (width <= 0 || height <= 0) {
    throw new Error("Invalid image dimensions");
  }
  const buf = image.getBitmap();
  const expected = width * height * 4;
  let tight = buf;
  if (buf.length !== expected) {
    if (buf.length < expected) {
      throw new Error(`Bitmap size ${buf.length} smaller than expected ${expected} (${width}x${height})`);
    }
    const stride = buf.length / height;
    if (!Number.isInteger(stride)) {
      throw new Error(`Cannot derive row stride from bitmap length ${buf.length} and height ${height}`);
    }
    tight = Buffer.alloc(expected);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      buf.copy(tight, y * rowBytes, y * stride, y * stride + rowBytes);
    }
  }
  const tmpName = `tsv-sh-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.bgra`;
  const tmpPath = path.join(os.tmpdir(), tmpName);
  fs.writeFileSync(tmpPath, tight);
  return {
    frame_bgra_path: tmpPath,
    frame_width: width,
    frame_height: height,
  };
}

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

function _stripCalibrationScreenshot(profile) {
  if (!profile || typeof profile !== "object") return profile;
  const meta = profile.meta;
  if (!meta || typeof meta !== "object" || !("calibration_screenshot" in meta)) return profile;
  const nextMeta = { ...meta };
  delete nextMeta.calibration_screenshot;
  return { ...profile, meta: nextMeta };
}

function _encodeCalibrationScreenshotFromImage(image) {
  if (!image || image.isEmpty()) {
    throw new Error("Failed to encode empty image");
  }
  const jpeg = image.toJPEG(80);
  const { width, height } = image.getSize();
  const sha256 = crypto.createHash("sha256").update(jpeg).digest("hex");
  return {
    mime: "image/jpeg",
    data: jpeg.toString("base64"),
    width,
    height,
    sha256,
  };
}

function _imageFromBuffer(buf) {
  if (!buf || !buf.length) return null;
  const image = nativeImage.createFromBuffer(buf);
  return image && !image.isEmpty() ? image : null;
}

function _bufferFromDataUrl(dataUrl) {
  const text = String(dataUrl);
  const comma = text.indexOf(",");
  if (comma < 0) return null;
  const header = text.slice(0, comma);
  const data = text.slice(comma + 1);
  try {
    return /;base64/i.test(header) ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data));
  } catch (_) {
    return null;
  }
}

function _candidatePathsForUrl(url) {
  const raw = decodeURIComponent(String(url).split("?")[0].replace(/\\/g, "/"));
  let pathname = raw;
  try {
    pathname = new URL(raw, "http://dummy.local").pathname;
  } catch (_) {
    /* keep raw */
  }
  pathname = pathname.replace(/^\/+/, "");
  const basename = path.basename(pathname);
  const webRoot = path.join(__dirname, "..");
  const candidates = [
    path.join(webRoot, pathname),
    path.join(webRoot, "src", "data", "screenHealthPresets", basename),
    path.join(webRoot, "dist", pathname),
    path.join(webRoot, "dist", "assets", basename),
  ];
  try {
    const { app } = require("electron");
    const appPath = app.getAppPath();
    candidates.push(path.join(appPath, "dist", pathname));
    candidates.push(path.join(appPath, "dist", "assets", basename));
  } catch (_) {
    /* app may be unavailable in tests */
  }
  return candidates;
}

async function _imageFromScreenshotPayload(payload) {
  const p = payload || {};
  if (p.shot && typeof p.shot.data === "string") {
    const image = _imageFromBuffer(Buffer.from(p.shot.data, "base64"));
    if (image) return image;
  }
  if (typeof p.dataUrl === "string" && p.dataUrl) {
    const fromBuf = _imageFromBuffer(_bufferFromDataUrl(p.dataUrl));
    if (fromBuf) return fromBuf;
    const fromDataUrl = nativeImage.createFromDataURL(p.dataUrl);
    if (fromDataUrl && !fromDataUrl.isEmpty()) return fromDataUrl;
  }
  if (typeof p.path === "string" && p.path.trim()) {
    const resolved = path.resolve(p.path.trim());
    if (fs.existsSync(resolved)) {
      const fromPath = nativeImage.createFromPath(resolved);
      if (fromPath && !fromPath.isEmpty()) return fromPath;
      const fromFile = _imageFromBuffer(fs.readFileSync(resolved));
      if (fromFile) return fromFile;
    }
  }
  if (typeof p.url === "string" && p.url.trim()) {
    const url = p.url.trim();
    for (const candidate of _candidatePathsForUrl(url)) {
      if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
      const fromPath = nativeImage.createFromPath(candidate);
      if (fromPath && !fromPath.isEmpty()) return fromPath;
      const fromFile = _imageFromBuffer(fs.readFileSync(candidate));
      if (fromFile) return fromFile;
    }
    try {
      const { net } = require("electron");
      if (/^https?:/i.test(url)) {
        const res = await net.fetch(url);
        if (res.ok) {
          const image = _imageFromBuffer(Buffer.from(await res.arrayBuffer()));
          if (image) return image;
        }
      }
    } catch (_) {
      /* fall through */
    }
  }
  return null;
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

  ipcMain.handle("screenHealth:encodeCalibrationScreenshot", async (_, payload) => {
    try {
      const image = await _imageFromScreenshotPayload(payload || {});
      if (!image || image.isEmpty()) {
        return { success: false, error: "Could not load screenshot to encode" };
      }
      return { success: true, screenshot: _encodeCalibrationScreenshotFromImage(image) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("screenHealth:materializeCalibrationScreenshot", async (_, payload) => {
    try {
      const image = await _imageFromScreenshotPayload(payload || {});
      if (!image || image.isEmpty()) {
        const hint = payload?.url || payload?.path || (payload?.dataUrl ? "data URL" : "no image payload");
        return { success: false, error: `Could not load screenshot (${hint})` };
      }
      const encoded = _encodeCalibrationScreenshotFromImage(image);
      const buf = Buffer.from(encoded.data, "base64");
      const dir = storage.getScreenshotsDir();
      const filename = `calibration_embedded_${encoded.sha256.slice(0, 12)}.jpg`;
      const outPath = path.join(dir, filename);
      if (!fs.existsSync(outPath)) {
        fs.writeFileSync(outPath, buf);
        storage.recordScreenshot({ filename, path: outPath, size: buf.length, mtimeMs: Date.now() });
      }
      return {
        success: true,
        screenshot: encoded,
        filename,
        path: outPath,
        width: encoded.width,
        height: encoded.height,
        dataUrl: `data:image/jpeg;base64,${encoded.data}`,
      };
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

  ipcMain.handle("screenHealth:selectExistingScreenshot", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Screenshot Image",
        properties: ["openFile"],
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "bmp", "gif"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      const imagePath = result.filePaths[0];
      const image = nativeImage.createFromPath(imagePath);
      if (image.isEmpty()) {
        return { success: false, error: "Failed to load image file" };
      }
      const size = image.getSize();
      const filename = path.basename(imagePath);
      
      return {
        success: true,
        filename,
        path: imagePath,
        width: size.width,
        height: size.height,
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
      const updateId =
        typeof profileData.id === "string" && profileData.id.trim() ? profileData.id.trim() : undefined;
      const saved = storage.upsertProfile({
        ...(updateId ? { id: updateId } : {}),
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
      return await daemonBridge.screenHealthStart(_stripCalibrationScreenshot(profile));
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

  ipcMain.handle("screenHealth:test", async (_, profile, imagePath, outputDir) => {
    let bgraTmp = null;
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      if (!profile || typeof profile !== "object") {
        return { success: false, error: "profile is required" };
      }
      const params = { profile: _stripCalibrationScreenshot(profile) };
      if (outputDir && typeof outputDir === "string" && outputDir.trim()) {
        params.output_dir = outputDir.trim();
      }
      if (imagePath != null && String(imagePath).trim()) {
        const prep = _writeScreenHealthTestBgraTempFile(String(imagePath));
        bgraTmp = prep.frame_bgra_path;
        params.frame_bgra_path = prep.frame_bgra_path;
        params.frame_width = prep.frame_width;
        params.frame_height = prep.frame_height;
      }
      return await daemonBridge.screenHealthTest(params);
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      if (bgraTmp) {
        try {
          fs.unlinkSync(bgraTmp);
        } catch (_) {
          /* daemon may have deleted it */
        }
      }
    }
  });
}

module.exports = { registerScreenHealthHandlers };

