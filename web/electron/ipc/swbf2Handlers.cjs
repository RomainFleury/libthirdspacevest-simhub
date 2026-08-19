/** IPC handlers for EA Battlefront II (2017) KYBER telemetry. */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");
const storage = require("../swbf2Storage.cjs");

function registerSWBF2Handlers() {
  ipcMain.handle("swbf2:getSettings", async () => {
    try {
      return { success: true, settings: storage.loadSettings() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("swbf2:setSettings", async (_, settings) => {
    try {
      return { success: true, settings: storage.saveSettings(settings) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("swbf2:start", async (_, settings) => {
    try {
      const saved = storage.saveSettings(settings);
      return await getDaemonBridge().swbf2Start(saved);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("swbf2:stop", async () => {
    return await getDaemonBridge().swbf2Stop();
  });

  ipcMain.handle("swbf2:status", async () => {
    return await getDaemonBridge().swbf2Status();
  });
}

module.exports = { registerSWBF2Handlers };
