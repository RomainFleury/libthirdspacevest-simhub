/**
 * IPC Handlers for Half-Life: Alyx integration.
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const { alyxStorage } = require("../alyxStorage.cjs");

function registerAlyxHandlers(getMainWindow) {
  // Start Alyx integration
  ipcMain.handle("alyx:start", async (_event, logPath) => {
    const daemon = getDaemonBridge();
    // Use saved log path if not provided
    const pathToUse = logPath || alyxStorage.getAlyxLogPath();
    return await daemon.alyxStart(pathToUse);
  });

  // Stop Alyx integration
  ipcMain.handle("alyx:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.alyxStop();
  });

  // Get Alyx status
  ipcMain.handle("alyx:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.alyxStatus();
  });

  // Get Alyx mod info
  ipcMain.handle("alyx:getModInfo", async () => {
    const daemon = getDaemonBridge();
    return await daemon.alyxGetModInfo();
  });

  // Browse for console.log file
  ipcMain.handle("alyx:browseLogPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Half-Life Alyx console.log",
        properties: ["openFile"],
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "All Files", extensions: ["*"] },
        ],
        message: "Select the console.log file from your Half-Life Alyx installation (game/hlvr/console.log)",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      // Save the selected path
      alyxStorage.setAlyxLogPath(selectedPath);
      return {
        success: true,
        path: selectedPath,
      };
    } catch (error) {
      console.error("Error in alyx:browseLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Get saved Alyx settings
  ipcMain.handle("alyx:getSettings", async () => {
    try {
      return {
        success: true,
        logPath: alyxStorage.getAlyxLogPath(),
      };
    } catch (error) {
      console.error("Error in alyx:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Alyx log path
  ipcMain.handle("alyx:setLogPath", async (_event, logPath) => {
    try {
      alyxStorage.setAlyxLogPath(logPath);
      return { success: true };
    } catch (error) {
      console.error("Error in alyx:setLogPath:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAlyxHandlers };

