/**
 * Mordhau IPC Handlers - Mordhau integration management.
 *
 * Handles:
 * - vest:mordhauStart
 * - vest:mordhauStop
 * - vest:mordhauStatus
 */

const { ipcMain } = require("electron");

/**
 * Register Mordhau-related IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 */
function registerMordhauHandlers(getDaemonBridge) {
  // Start Mordhau integration
  ipcMain.handle("mordhau:start", async (event, logPath) => {
    const daemon = getDaemonBridge();
    if (!daemon) {
      return { success: false, error: "Not connected to daemon" };
    }
    return await daemon.mordhauStart(logPath);
  });

  // Stop Mordhau integration
  ipcMain.handle("mordhau:stop", async () => {
    const daemon = getDaemonBridge();
    if (!daemon) {
      return { success: false, error: "Not connected to daemon" };
    }
    return await daemon.mordhauStop();
  });

  // Get Mordhau status
  ipcMain.handle("mordhau:status", async () => {
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
    return await daemon.mordhauStatus();
  });
}

module.exports = { registerMordhauHandlers };

