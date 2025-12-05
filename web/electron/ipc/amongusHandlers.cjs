/**
 * IPC handlers for Among Us integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerAmongUsHandlers() {
  // Enable Among Us integration
  ipcMain.handle("amongus:start", async () => {
    const daemon = getDaemonBridge();
    return await daemon.amongusStart();
  });

  // Disable Among Us integration
  ipcMain.handle("amongus:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.amongusStop();
  });

  // Get Among Us integration status
  ipcMain.handle("amongus:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.amongusStatus();
  });
}

module.exports = { registerAmongUsHandlers };
