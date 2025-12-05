/**
 * IPC handlers for Assassin's Creed Mirage integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerACMirageHandlers() {
  // Start AC Mirage integration
  ipcMain.handle("acmirage:start", async (event, logPath) => {
    const daemon = getDaemonBridge();
    return await daemon.acmirageStart(logPath);
  });

  // Stop AC Mirage integration
  ipcMain.handle("acmirage:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.acmirageStop();
  });

  // Get AC Mirage integration status
  ipcMain.handle("acmirage:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.acmirageStatus();
  });
}

module.exports = { registerACMirageHandlers };
