/**
 * Chivalry 2 IPC Handlers - Chivalry 2 integration management.
 *
 * Handles:
 * - vest:chivalry2Start
 * - vest:chivalry2Stop
 * - vest:chivalry2Status
 * - vest:chivalry2BrowseLogPath
 * - vest:chivalry2GetSettings
 * - vest:chivalry2SetLogPath
 */

const { ipcMain, dialog } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const chivalry2Storage = require("../chivalry2Storage.cjs");

/**
 * Register Chivalry 2-related IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 * @param {Function} getMainWindow - Function that returns the main window instance
 */
function registerChivalry2Handlers(getDaemonBridge, getMainWindow) {
  // Start Chivalry 2 integration
  ipcMain.handle("chivalry2:start", async (event, logPath) => {
    const daemon = getDaemonBridge();
    if (!daemon) {
      return { success: false, error: "Not connected to daemon" };
    }
    // Save log path when starting
    if (logPath) {
      chivalry2Storage.setChivalry2LogPath(logPath);
    }
    return await daemon.chivalry2Start(logPath);
  });

  // Stop Chivalry 2 integration
  ipcMain.handle("chivalry2:stop", async () => {
    const daemon = getDaemonBridge();
    if (!daemon) {
      return { success: false, error: "Not connected to daemon" };
    }
    return await daemon.chivalry2Stop();
  });

  // Get Chivalry 2 status
  ipcMain.handle("chivalry2:status", async () => {
    const daemon = getDaemonBridge();
    if (!daemon) {
      return {
        running: false,
        log_path: null,
        events_received: 0,
        last_event_ts: null,
        error: "Not connected to daemon",
      };
    }
    return await daemon.chivalry2Status();
  });

  // Browse for haptic_events.log file
  ipcMain.handle("chivalry2:browseLogPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select Chivalry 2 haptic_events.log",
        properties: ["openFile"],
        filters: [
          { name: "Log Files", extensions: ["log"] },
          { name: "All Files", extensions: ["*"] },
        ],
        message: "Select the haptic_events.log file from your Chivalry 2 mod",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      // Save the selected path
      chivalry2Storage.setChivalry2LogPath(selectedPath);
      return {
        success: true,
        logPath: selectedPath,
      };
    } catch (error) {
      console.error("Error in chivalry2:browseLogPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Get saved Chivalry 2 settings
  ipcMain.handle("chivalry2:getSettings", async () => {
    try {
      return {
        success: true,
        logPath: chivalry2Storage.getChivalry2LogPath(),
      };
    } catch (error) {
      console.error("Error in chivalry2:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set Chivalry 2 log path
  ipcMain.handle("chivalry2:setLogPath", async (_, logPath) => {
    try {
      chivalry2Storage.setChivalry2LogPath(logPath || null);
      return { success: true };
    } catch (error) {
      console.error("Error in chivalry2:setLogPath:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerChivalry2Handlers };
