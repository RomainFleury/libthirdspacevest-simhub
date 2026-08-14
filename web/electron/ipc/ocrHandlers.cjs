const { ipcMain, shell } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

const WINDOWS_LANGUAGE_SETTINGS = "ms-settings:regionlanguage";

function registerOcrHandlers() {
  ipcMain.handle("ocr:listEngines", async () => {
    const daemon = getDaemonBridge();
    return await daemon.ocrListEngines();
  });

  ipcMain.handle("ocr:getSettings", async () => {
    const daemon = getDaemonBridge();
    return await daemon.ocrGetSettings();
  });

  ipcMain.handle("ocr:setEngine", async (_event, ocrEngine) => {
    const daemon = getDaemonBridge();
    return await daemon.ocrSetEngine(ocrEngine);
  });

  ipcMain.handle("ocr:openWindowsLanguageSettings", async () => {
    try {
      await shell.openExternal(WINDOWS_LANGUAGE_SETTINGS);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerOcrHandlers,
};
