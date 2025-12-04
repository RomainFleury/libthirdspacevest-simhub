/**
 * IPC Handlers for Kingdom Come: Deliverance 2 integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerKCD2Handlers() {
  // Start KCD2 integration
  ipcMain.handle("kcd2:start", async (_event, logPath) => {
    const daemon = getDaemonBridge();
    return await daemon.kcd2Start(logPath);
  });

  // Stop KCD2 integration
  ipcMain.handle("kcd2:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.kcd2Stop();
  });

  // Get KCD2 status
  ipcMain.handle("kcd2:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.kcd2Status();
  });

  // Get KCD2 mod info
  ipcMain.handle("kcd2:getModInfo", async () => {
    const daemon = getDaemonBridge();
    return await daemon.kcd2GetModInfo();
  });
}

module.exports = { registerKCD2Handlers };
