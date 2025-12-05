/**
 * IPC handlers for Unreal Tournament integration.
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const Store = require("electron-store");

// Storage for UT settings
const utStore = new Store({
  name: "ut-settings",
  defaults: {
    logPath: null,
  },
});

function registerUTHandlers(getMainWindow) {
  // Start Unreal Tournament integration
  ipcMain.handle("ut:start", async (_, logPath) => {
    const daemon = getDaemonBridge();
    // Save settings when starting
    if (logPath) {
      utStore.set("logPath", logPath);
    }
    return await daemon.utStart(logPath);
  });

  // Stop Unreal Tournament integration
  ipcMain.handle("ut:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.utStop();
  });

  // Get Unreal Tournament integration status
  ipcMain.handle("ut:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.utStatus();
  });

  // Browse for game log file
  ipcMain.handle("ut:browseLogPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Unreal Tournament Log File",
        properties: ["openFile"],
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "All Files", extensions: ["*"] },
        ],
        message: "Select the UnrealTournament.log file from your game installation",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      // Save the selected path
      utStore.set("logPath", selectedPath);
      return {
        success: true,
        logPath: selectedPath,
      };
    } catch (error) {
      console.error("Error in ut:browseLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Get saved Unreal Tournament settings
  ipcMain.handle("ut:getSettings", async () => {
    try {
      return {
        success: true,
        logPath: utStore.get("logPath"),
      };
    } catch (error) {
      console.error("Error in ut:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Unreal Tournament log path
  ipcMain.handle("ut:setLogPath", async (_, logPath) => {
    try {
      utStore.set("logPath", logPath || null);
      return { success: true };
    } catch (error) {
      console.error("Error in ut:setLogPath:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerUTHandlers };
