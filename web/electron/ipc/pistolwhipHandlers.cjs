/**
 * IPC handlers for Pistol Whip integration.
 *
 * Installable artifact is ThirdSpace_PistolWhip.dll (TCP client to daemon 5050).
 * The NexusMods dump at
 *   misc-documentations/achived-untested-mods/pistolwhip-mod/bHaptics-nexusmods/
 * is the original PistolWhip_bhaptics.dll used as a Harmony-patch reference only —
 * it talks to bHaptics Player, not this daemon. See the archived README next to it.
 */

const { ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const pistolwhipStorage = require("../pistolwhipStorage.cjs");

const IS_PACKAGED = !process.env.VITE_DEV_SERVER_URL;
const MOD_DLL = "ThirdSpace_PistolWhip.dll";

function repoRoot() {
  return path.resolve(__dirname, "..", "..", "..");
}

/**
 * Directory that contains ThirdSpace_PistolWhip.dll.
 * Packaged app: resources/mods/pistolwhip/
 * Dev: mods/pistolwhip/ or a local MSBuild output folder.
 */
function getModSourcePath() {
  if (IS_PACKAGED) {
    const bundledPath = path.join(process.resourcesPath, "mods", "pistolwhip");
    if (fs.existsSync(path.join(bundledPath, MOD_DLL))) {
      console.log(`[pistolwhip] Using bundled mod: ${bundledPath}`);
      return bundledPath;
    }
    console.warn(`[pistolwhip] Bundled ${MOD_DLL} not found at: ${bundledPath}`);
  }

  const root = repoRoot();
  const candidates = [
    path.join(root, "mods", "pistolwhip"),
    path.join(root, "pistolwhip-mod", "ThirdSpace_PistolWhip", "bin", "Release"),
    path.join(root, "pistolwhip-mod", "ThirdSpace_PistolWhip", "bin", "Debug"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, MOD_DLL))) {
      console.log(`[pistolwhip] Using mod source: ${dir}`);
      return dir;
    }
  }
  return path.join(root, "mods", "pistolwhip");
}

function modsFolder(gameDir) {
  return path.join(gameDir, "Mods");
}

function registerPistolWhipHandlers(getMainWindow) {
  ipcMain.handle("pistolwhip:start", async () => {
    const daemon = getDaemonBridge();
    const solenoid = pistolwhipStorage.getPistolWhipSolenoidRecoil();
    return await daemon.pistolwhipStart({
      enabled: solenoid.enabled,
      duration_ms: solenoid.durationMs,
    });
  });

  ipcMain.handle("pistolwhip:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.pistolwhipStop();
  });

  ipcMain.handle("pistolwhip:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.pistolwhipStatus();
  });

  ipcMain.handle("pistolwhip:getSettings", async () => {
    try {
      return {
        success: true,
        gameDir: pistolwhipStorage.getPistolWhipGameDir(),
        solenoidRecoil: pistolwhipStorage.getPistolWhipSolenoidRecoil(),
      };
    } catch (error) {
      console.error("Error in pistolwhip:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("pistolwhip:setSolenoidRecoil", async (_, solenoidRecoil) => {
    try {
      const saved = pistolwhipStorage.setPistolWhipSolenoidRecoil(solenoidRecoil || {});
      return { success: true, solenoidRecoil: saved };
    } catch (error) {
      console.error("Error in pistolwhip:setSolenoidRecoil:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("pistolwhip:browseGameDir", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Pistol Whip Game Directory",
        properties: ["openDirectory"],
        message: "Select the Pistol Whip folder (the one that contains Pistol Whip.exe after MelonLoader is installed)",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      pistolwhipStorage.setPistolWhipGameDir(selectedPath);
      return { success: true, gameDir: selectedPath };
    } catch (error) {
      console.error("Error in pistolwhip:browseGameDir:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("pistolwhip:getGameDir", async () => {
    try {
      return {
        success: true,
        gameDir: pistolwhipStorage.getPistolWhipGameDir(),
      };
    } catch (error) {
      console.error("Error in pistolwhip:getGameDir:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("pistolwhip:setGameDir", async (_, gameDir) => {
    try {
      pistolwhipStorage.setPistolWhipGameDir(gameDir || null);
      return { success: true };
    } catch (error) {
      console.error("Error in pistolwhip:setGameDir:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("pistolwhip:checkModInstalled", async () => {
    try {
      const gameDir = pistolwhipStorage.getPistolWhipGameDir();
      if (!gameDir) {
        return { success: true, installed: false, reason: "Game directory not set" };
      }

      const destPath = path.join(modsFolder(gameDir), MOD_DLL);
      const sourceDir = getModSourcePath();
      const sourcePath = path.join(sourceDir, MOD_DLL);
      return {
        success: true,
        installed: fs.existsSync(destPath),
        sourceAvailable: fs.existsSync(sourcePath),
        missingFiles: fs.existsSync(destPath) ? [] : [MOD_DLL],
        gameDir,
      };
    } catch (error) {
      console.error("Error in pistolwhip:checkModInstalled:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("pistolwhip:installMod", async () => {
    try {
      const gameDir = pistolwhipStorage.getPistolWhipGameDir();
      if (!gameDir) {
        return {
          success: false,
          error: "Game directory not set. Select your Pistol Whip folder first.",
        };
      }

      const sourceDir = getModSourcePath();
      const sourcePath = path.join(sourceDir, MOD_DLL);
      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          error:
            `${MOD_DLL} is not built yet. Build pistolwhip-mod/ (see the archived README) ` +
            `and copy the DLL to mods/pistolwhip/. Do not install PistolWhip_bhaptics.dll — ` +
            `that NexusMods file talks to bHaptics Player, not this daemon.`,
        };
      }

      const destDir = modsFolder(gameDir);
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, MOD_DLL);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[pistolwhip] Copied ${MOD_DLL} -> ${destPath}`);

      return {
        success: true,
        copiedFiles: [MOD_DLL],
        destination: destDir,
      };
    } catch (error) {
      console.error("Error in pistolwhip:installMod:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerPistolWhipHandlers };
