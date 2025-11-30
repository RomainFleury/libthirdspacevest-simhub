/**
 * IPC handlers for Left 4 Dead 2 integration.
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const l4d2Storage = require("../l4d2Storage.cjs");

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
}

module.exports = { registerL4D2Handlers };

