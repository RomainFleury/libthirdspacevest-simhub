/**
 * IPC handlers for Half-Life 2: Deathmatch integration.
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const hl2dmStorage = require("../hl2dmStorage.cjs");

function registerHL2DMHandlers(getMainWindow) {
  // Start Half-Life 2: Deathmatch integration
  ipcMain.handle("hl2dm:start", async (_, logPath, playerName) => {
    const daemon = getDaemonBridge();
    // Save settings when starting
    if (logPath) {
      hl2dmStorage.setHL2DMLogPath(logPath);
    }
    if (playerName) {
      hl2dmStorage.setHL2DMPlayerName(playerName);
    }
    return await daemon.hl2dmStart(logPath, playerName);
  });

  // Stop Half-Life 2: Deathmatch integration
  ipcMain.handle("hl2dm:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.hl2dmStop();
  });

  // Get Half-Life 2: Deathmatch integration status
  ipcMain.handle("hl2dm:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.hl2dmStatus();
  });

  // Browse for console.log file
  ipcMain.handle("hl2dm:browseLogPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Half-Life 2: Deathmatch console.log",
        properties: ["openFile"],
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "All Files", extensions: ["*"] },
        ],
        message:
          "Select the console.log file from your Half-Life 2: Deathmatch installation",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      // Save the selected path
      hl2dmStorage.setHL2DMLogPath(selectedPath);
      return {
        success: true,
        logPath: selectedPath,
      };
    } catch (error) {
      console.error("Error in hl2dm:browseLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Get saved Half-Life 2: Deathmatch settings
  ipcMain.handle("hl2dm:getSettings", async () => {
    try {
      return {
        success: true,
        logPath: hl2dmStorage.getHL2DMLogPath(),
        playerName: hl2dmStorage.getHL2DMPlayerName(),
      };
    } catch (error) {
      console.error("Error in hl2dm:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Half-Life 2: Deathmatch log path
  ipcMain.handle("hl2dm:setLogPath", async (_, logPath) => {
    try {
      hl2dmStorage.setHL2DMLogPath(logPath || null);
      return { success: true };
    } catch (error) {
      console.error("Error in hl2dm:setLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Half-Life 2: Deathmatch player name
  ipcMain.handle("hl2dm:setPlayerName", async (_, playerName) => {
    try {
      hl2dmStorage.setHL2DMPlayerName(playerName || null);
      return { success: true };
    } catch (error) {
      console.error("Error in hl2dm:setPlayerName:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerHL2DMHandlers };
