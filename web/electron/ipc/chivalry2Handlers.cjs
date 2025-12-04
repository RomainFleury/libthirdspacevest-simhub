/**
 * Chivalry 2 IPC Handlers - Chivalry 2 integration management.
 *
 * Handles:
 * - vest:chivalry2Start
 * - vest:chivalry2Stop
 * - vest:chivalry2Status
 */

const { ipcMain } = require("electron");

/**
 * Register Chivalry 2-related IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 */
function registerChivalry2Handlers(getDaemonBridge) {
  // Start Chivalry 2 integration
  ipcMain.handle("chivalry2:start", async (event, logPath) => {
    const daemon = getDaemonBridge();
    if (!daemon) {
      return { success: false, error: "Not connected to daemon" };
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
}

module.exports = { registerChivalry2Handlers };
