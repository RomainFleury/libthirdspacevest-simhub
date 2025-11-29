/**
 * IPC handlers for Star Citizen integration.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerStarCitizenHandlers() {
  // Start Star Citizen integration
  ipcMain.handle("starcitizen:start", async (_, logPath, playerName) => {
    const daemon = getDaemonBridge();
    return await daemon.starcitizenStart(logPath, playerName);
  });

  // Stop Star Citizen integration
  ipcMain.handle("starcitizen:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.starcitizenStop();
  });

  // Get Star Citizen integration status
  ipcMain.handle("starcitizen:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.starcitizenStatus();
  });
}

module.exports = { registerStarCitizenHandlers };

