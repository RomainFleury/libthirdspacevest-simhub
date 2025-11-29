/**
 * IPC handlers for Star Citizen integration.
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerStarCitizenHandlers(getMainWindow) {
  // Start Star Citizen integration
  ipcMain.handle("starcitizen:start", async (_, logPath, playerName) => {
    const daemon = getDaemonBridge();
    return await daemon.starcitizenStart(logPath, playerName);
  });

  // Stop Star Citizen integration
  ipcMain.handle("starcitizen:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.starcitizenStop();
  });

  // Get Star Citizen integration status
  ipcMain.handle("starcitizen:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.starcitizenStatus();
  });

  // Browse for Game.log file
  ipcMain.handle("starcitizen:browseLogPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Star Citizen Game.log",
        properties: ["openFile"],
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "All Files", extensions: ["*"] },
        ],
        message: "Select the Game.log file from your Star Citizen installation",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      return {
        success: true,
        path: selectedPath,
      };
    } catch (error) {
      console.error("Error in starcitizen:browseLogPath:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerStarCitizenHandlers };

