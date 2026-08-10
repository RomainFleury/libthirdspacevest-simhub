/**
 * IPC Handlers for USB LC relay / solenoid recoil testing.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

function registerRelayHandlers() {
  ipcMain.handle("relay:listPorts", async () => {
    const daemon = getDaemonBridge();
    return await daemon.relayListPorts();
  });

  ipcMain.handle("relay:connect", async (_event, port, baud, switchAddress) => {
    const daemon = getDaemonBridge();
    return await daemon.relayConnect(port, baud, switchAddress);
  });

  ipcMain.handle("relay:disconnect", async () => {
    const daemon = getDaemonBridge();
    return await daemon.relayDisconnect();
  });

  ipcMain.handle("relay:status", async () => {
    const daemon = getDaemonBridge();
    return await daemon.relayStatus();
  });

  ipcMain.handle("relay:set", async (_event, on) => {
    const daemon = getDaemonBridge();
    return await daemon.relaySet(on);
  });

  ipcMain.handle("relay:pulse", async (_event, durationMs) => {
    const daemon = getDaemonBridge();
    return await daemon.relayPulse(durationMs);
  });
}

module.exports = {
  registerRelayHandlers,
};
