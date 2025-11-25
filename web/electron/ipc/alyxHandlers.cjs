/**
 * IPC Handlers for Half-Life: Alyx integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerAlyxHandlers() {
  // Start Alyx integration
  ipcMain.handle("alyx:start", async (_event, logPath) => {
    const daemon = getDaemonBridge();
    return await daemon.alyxStart(logPath);
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
}

module.exports = { registerAlyxHandlers };

