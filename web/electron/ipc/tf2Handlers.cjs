/**
 * IPC handlers for Team Fortress 2 integration.
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const tf2Storage = require("../tf2Storage.cjs");

function registerTF2Handlers(getMainWindow) {
  // Start Team Fortress 2 integration
  ipcMain.handle("tf2:start", async (_, logPath, playerName) => {
    const daemon = getDaemonBridge();
    // Save settings when starting
    if (logPath) {
      tf2Storage.setTF2LogPath(logPath);
    }
    if (playerName) {
      tf2Storage.setTF2PlayerName(playerName);
    }
    return await daemon.tf2Start(logPath, playerName);
  });

  // Stop Team Fortress 2 integration
  ipcMain.handle("tf2:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.tf2Stop();
  });

  // Get Team Fortress 2 integration status
  ipcMain.handle("tf2:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.tf2Status();
  });

  // Browse for console.log file
  ipcMain.handle("tf2:browseLogPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Team Fortress 2 console.log",
        properties: ["openFile"],
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "All Files", extensions: ["*"] },
        ],
        message: "Select the console.log file from your Team Fortress 2 installation",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      // Save the selected path
      tf2Storage.setTF2LogPath(selectedPath);
      return {
        success: true,
        logPath: selectedPath,
      };
    } catch (error) {
      console.error("Error in tf2:browseLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Get saved Team Fortress 2 settings
  ipcMain.handle("tf2:getSettings", async () => {
    try {
      return {
        success: true,
        logPath: tf2Storage.getTF2LogPath(),
        playerName: tf2Storage.getTF2PlayerName(),
      };
    } catch (error) {
      console.error("Error in tf2:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Team Fortress 2 log path
  ipcMain.handle("tf2:setLogPath", async (_, logPath) => {
    try {
      tf2Storage.setTF2LogPath(logPath || null);
      return { success: true };
    } catch (error) {
      console.error("Error in tf2:setLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Team Fortress 2 player name
  ipcMain.handle("tf2:setPlayerName", async (_, playerName) => {
    try {
      tf2Storage.setTF2PlayerName(playerName || null);
      return { success: true };
    } catch (error) {
      console.error("Error in tf2:setPlayerName:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerTF2Handlers };
