/**
 * Daemon IPC Handlers - Daemon connection management.
 *
 * Handles:
 * - vest:getDaemonStatus
 * - vest:reconnectDaemon
 */

const { ipcMain } = require("electron");

/**
 * Register daemon-related IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 * @param {Function} reconnectToDaemon - Function to reconnect to the daemon
 */
function registerDaemonHandlers(getDaemonBridge, reconnectToDaemon) {
  // Get daemon connection status
  ipcMain.handle("vest:getDaemonStatus", async () => {
    const daemonBridge = getDaemonBridge();
    return {
      connected: daemonBridge?.connected ?? false,
    };
  });

  // Reconnect to daemon
  ipcMain.handle("vest:reconnectDaemon", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (daemonBridge) {
        daemonBridge.disconnect();
      }
      await reconnectToDaemon();
      return { success: true };
    } catch (error) {
      console.error("Error reconnecting to daemon:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDaemonHandlers };

