/**
 * IPC handlers for Arma Reforger integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerArmaReforgerHandlers() {
  // Enable Arma Reforger integration
  ipcMain.handle("armareforger:start", async () => {
    const daemon = getDaemonBridge();
    return await daemon.armaReforgerStart();
  });

  // Disable Arma Reforger integration
  ipcMain.handle("armareforger:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.armaReforgerStop();
  });

  // Get Arma Reforger integration status
  ipcMain.handle("armareforger:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.armaReforgerStatus();
  });
}

module.exports = { registerArmaReforgerHandlers };
