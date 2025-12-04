/**
 * IPC handlers for Walking Dead: Saints and Sinners integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerWalkingDeadHandlers() {
  // Enable Walking Dead integration
  ipcMain.handle("walkingdead:start", async () => {
    const daemon = getDaemonBridge();
    return await daemon.walkingdeadStart();
  });

  // Disable Walking Dead integration
  ipcMain.handle("walkingdead:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.walkingdeadStop();
  });

  // Get Walking Dead integration status
  ipcMain.handle("walkingdead:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.walkingdeadStatus();
  });
}

module.exports = { registerWalkingDeadHandlers };
