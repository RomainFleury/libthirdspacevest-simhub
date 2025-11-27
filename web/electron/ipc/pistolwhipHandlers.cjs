/**
 * IPC handlers for Pistol Whip integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerPistolWhipHandlers() {
  // Enable Pistol Whip integration
  ipcMain.handle("pistolwhip:start", async () => {
    const daemon = getDaemonBridge();
    return await daemon.pistolwhipStart();
  });

  // Disable Pistol Whip integration
  ipcMain.handle("pistolwhip:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.pistolwhipStop();
  });

  // Get Pistol Whip integration status
  ipcMain.handle("pistolwhip:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.pistolwhipStatus();
  });
}

module.exports = { registerPistolWhipHandlers };

