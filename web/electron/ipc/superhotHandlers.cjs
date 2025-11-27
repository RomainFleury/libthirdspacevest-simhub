/**
 * IPC handlers for SUPERHOT VR integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerSuperHotHandlers() {
  // Enable SUPERHOT VR integration
  ipcMain.handle("superhot:start", async () => {
    const daemon = getDaemonBridge();
    return await daemon.superhotStart();
  });

  // Disable SUPERHOT VR integration
  ipcMain.handle("superhot:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.superhotStop();
  });

  // Get SUPERHOT VR integration status
  ipcMain.handle("superhot:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.superhotStatus();
  });
}

module.exports = { registerSuperHotHandlers };

