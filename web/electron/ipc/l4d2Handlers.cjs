/**
 * IPC handlers for Left 4 Dead 2 integration.
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const l4d2Storage = require("../l4d2Storage.cjs");
const path = require("path");
const fs = require("fs");

// Path to the mod files (relative to project root)
const MOD_SOURCE_PATH = path.resolve(__dirname, "..", "..", "..", "misc-documentations", "bhaptics-svg-24-nov", "l4d2", "third-space-vest-mod", "scripts", "vscripts");

function registerL4D2Handlers(getMainWindow) {
  // Start Left 4 Dead 2 integration
  ipcMain.handle("l4d2:start", async (_, logPath, playerName) => {
    const daemon = getDaemonBridge();
    // Save settings when starting
    if (logPath) {
      l4d2Storage.setL4D2LogPath(logPath);
    }
    if (playerName) {
      l4d2Storage.setL4D2PlayerName(playerName);
    }
    return await daemon.l4d2Start(logPath, playerName);
  });

  // Stop Left 4 Dead 2 integration
  ipcMain.handle("l4d2:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.l4d2Stop();
  });

  // Get Left 4 Dead 2 integration status
  ipcMain.handle("l4d2:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.l4d2Status();
  });

  // Browse for console.log file
  ipcMain.handle("l4d2:browseLogPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Left 4 Dead 2 console.log",
        properties: ["openFile"],
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "All Files", extensions: ["*"] },
        ],
        message: "Select the console.log file from your Left 4 Dead 2 installation",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      // Save the selected path
      l4d2Storage.setL4D2LogPath(selectedPath);
      return {
        success: true,
        logPath: selectedPath,
      };
    } catch (error) {
      console.error("Error in l4d2:browseLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Get saved Left 4 Dead 2 settings
  ipcMain.handle("l4d2:getSettings", async () => {
    try {
      return {
        success: true,
        logPath: l4d2Storage.getL4D2LogPath(),
        playerName: l4d2Storage.getL4D2PlayerName(),
      };
    } catch (error) {
      console.error("Error in l4d2:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Left 4 Dead 2 log path
  ipcMain.handle("l4d2:setLogPath", async (_, logPath) => {
    try {
      l4d2Storage.setL4D2LogPath(logPath || null);
      return { success: true };
    } catch (error) {
      console.error("Error in l4d2:setLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Left 4 Dead 2 player name
  ipcMain.handle("l4d2:setPlayerName", async (_, playerName) => {
    try {
      l4d2Storage.setL4D2PlayerName(playerName || null);
      return { success: true };
    } catch (error) {
      console.error("Error in l4d2:setPlayerName:", error);
      return { success: false, error: error.message };
    }
  });

  // Browse for L4D2 game directory
  ipcMain.handle("l4d2:browseGameDir", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Left 4 Dead 2 Game Directory",
        properties: ["openDirectory"],
        message: "Select the 'left4dead2' folder inside your L4D2 installation",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      // Save the game directory
      l4d2Storage.setL4D2GameDir(selectedPath);
      return {
        success: true,
        gameDir: selectedPath,
      };
    } catch (error) {
      console.error("Error in l4d2:browseGameDir:", error);
      return { success: false, error: error.message };
    }
  });

  // Get L4D2 game directory
  ipcMain.handle("l4d2:getGameDir", async () => {
    try {
      return {
        success: true,
        gameDir: l4d2Storage.getL4D2GameDir(),
      };
    } catch (error) {
      console.error("Error in l4d2:getGameDir:", error);
      return { success: false, error: error.message };
    }
  });

  // Set L4D2 game directory
  ipcMain.handle("l4d2:setGameDir", async (_, gameDir) => {
    try {
      l4d2Storage.setL4D2GameDir(gameDir || null);
      return { success: true };
    } catch (error) {
      console.error("Error in l4d2:setGameDir:", error);
      return { success: false, error: error.message };
    }
  });

  // Check if mod is installed
  ipcMain.handle("l4d2:checkModInstalled", async () => {
    try {
      const gameDir = l4d2Storage.getL4D2GameDir();
      if (!gameDir) {
        return { success: true, installed: false, reason: "Game directory not set" };
      }

      const vscriptsPath = path.join(gameDir, "scripts", "vscripts");
      const hapticsFile = path.join(vscriptsPath, "thirdspacevest_haptics.nut");
      const coopFile = path.join(vscriptsPath, "coop.nut");

      const hapticsExists = fs.existsSync(hapticsFile);
      const coopExists = fs.existsSync(coopFile);

      return {
        success: true,
        installed: hapticsExists && coopExists,
        hapticsInstalled: hapticsExists,
        coopInstalled: coopExists,
        gameDir: gameDir,
      };
    } catch (error) {
      console.error("Error in l4d2:checkModInstalled:", error);
      return { success: false, error: error.message };
    }
  });

  // Install mod to L4D2 directory
  ipcMain.handle("l4d2:installMod", async () => {
    try {
      const gameDir = l4d2Storage.getL4D2GameDir();
      if (!gameDir) {
        return { success: false, error: "Game directory not set. Please select your L4D2 game directory first." };
      }

      // Check if source files exist
      if (!fs.existsSync(MOD_SOURCE_PATH)) {
        return { success: false, error: `Mod source files not found at: ${MOD_SOURCE_PATH}` };
      }

      // Create scripts/vscripts directory if it doesn't exist
      const vscriptsPath = path.join(gameDir, "scripts", "vscripts");
      fs.mkdirSync(vscriptsPath, { recursive: true });

      // Copy the mod files
      const filesToCopy = ["thirdspacevest_haptics.nut", "coop.nut"];
      const copiedFiles = [];

      for (const file of filesToCopy) {
        const srcPath = path.join(MOD_SOURCE_PATH, file);
        const destPath = path.join(vscriptsPath, file);
        
        if (!fs.existsSync(srcPath)) {
          console.warn(`Source file not found: ${srcPath}`);
          continue;
        }

        fs.copyFileSync(srcPath, destPath);
        copiedFiles.push(file);
        console.log(`Copied: ${file} -> ${destPath}`);
      }

      return {
        success: true,
        copiedFiles: copiedFiles,
        destination: vscriptsPath,
      };
    } catch (error) {
      console.error("Error in l4d2:installMod:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerL4D2Handlers };

