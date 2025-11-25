/**
 * CS2 IPC Handlers - Counter-Strike 2 GSI integration.
 *
 * Handles:
 * - cs2:start, cs2:stop, cs2:status, cs2:generateConfig
 * - cs2:getConfigPath, cs2:setConfigPath, cs2:autoDetectPath
 * - cs2:browseConfigPath, cs2:saveConfigToCS2
 */

const { ipcMain, dialog } = require("electron");
const cs2Storage = require("../cs2Storage.cjs");

/**
 * Register CS2-related IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 * @param {Function} getMainWindow - Function that returns the main window instance
 */
function registerCS2Handlers(getDaemonBridge, getMainWindow) {
  // -------------------------------------------------------------------------
  // CS2 GSI Server Control
  // -------------------------------------------------------------------------

  // Start CS2 GSI server
  ipcMain.handle("cs2:start", async (_, gsiPort) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.cs2Start(gsiPort);
    } catch (error) {
      console.error("Error in cs2:start:", error);
      return { success: false, error: error.message };
    }
  });

  // Stop CS2 GSI server
  ipcMain.handle("cs2:stop", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.cs2Stop();
    } catch (error) {
      console.error("Error in cs2:stop:", error);
      return { success: false, error: error.message };
    }
  });

  // Get CS2 GSI status
  ipcMain.handle("cs2:status", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { running: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.cs2Status();
    } catch (error) {
      console.error("Error in cs2:status:", error);
      return { running: false, error: error.message };
    }
  });

  // Generate CS2 config file
  ipcMain.handle("cs2:generateConfig", async (_, gsiPort) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.cs2GenerateConfig(gsiPort);
    } catch (error) {
      console.error("Error in cs2:generateConfig:", error);
      return { success: false, error: error.message };
    }
  });

  // -------------------------------------------------------------------------
  // CS2 Config Path Management
  // -------------------------------------------------------------------------

  // Get saved CS2 config path
  ipcMain.handle("cs2:getConfigPath", async () => {
    try {
      const configPath = cs2Storage.getCS2ConfigPath();
      const configExists = cs2Storage.configExistsInCS2(configPath);
      return {
        path: configPath,
        configExists,
      };
    } catch (error) {
      console.error("Error in cs2:getConfigPath:", error);
      return { path: null, configExists: false };
    }
  });

  // Set CS2 config path
  ipcMain.handle("cs2:setConfigPath", async (_, configPath) => {
    try {
      cs2Storage.setCS2ConfigPath(configPath);
      return { success: true };
    } catch (error) {
      console.error("Error in cs2:setConfigPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Auto-detect CS2 config path
  ipcMain.handle("cs2:autoDetectPath", async () => {
    try {
      const detectedPath = cs2Storage.autoDetectCS2Path();
      return {
        success: detectedPath !== null,
        path: detectedPath,
      };
    } catch (error) {
      console.error("Error in cs2:autoDetectPath:", error);
      return { success: false, path: null };
    }
  });

  // Browse for CS2 config folder
  ipcMain.handle("cs2:browseConfigPath", async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Select CS2 Config Folder",
        properties: ["openDirectory"],
        message:
          "Select the CS2 cfg folder (usually .../Counter-Strike Global Offensive/game/csgo/cfg)",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      return {
        success: true,
        path: selectedPath,
      };
    } catch (error) {
      console.error("Error in cs2:browseConfigPath:", error);
      return { success: false, error: error.message };
    }
  });

  // Save config file directly to CS2 folder
  ipcMain.handle("cs2:saveConfigToCS2", async (_, gsiPort) => {
    try {
      const daemonBridge = getDaemonBridge();
      // First get the config content from daemon
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }

      const configResult = await daemonBridge.cs2GenerateConfig(gsiPort);
      if (!configResult.success || !configResult.config_content) {
        return { success: false, error: "Failed to generate config" };
      }

      // Save to CS2 folder
      const saveResult = cs2Storage.saveConfigToCS2(configResult.config_content);
      return saveResult;
    } catch (error) {
      console.error("Error in cs2:saveConfigToCS2:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerCS2Handlers };

