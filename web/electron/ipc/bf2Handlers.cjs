/**
 * EA Battlefront 2 (2017) IPC Handlers - Screen capture threshold tuning.
 *
 * Handles:
 * - bf2:getSettings, bf2:setSettings, bf2:setSetting
 * - bf2:resetSettings, bf2:writeConfigFile
 */

const { ipcMain } = require("electron");
const bf2Storage = require("../bf2Storage.cjs");

/**
 * Register BF2-related IPC handlers.
 */
function registerBF2Handlers() {
  // Get all BF2 settings
  ipcMain.handle("bf2:getSettings", async () => {
    try {
      const settings = bf2Storage.loadBF2Settings();
      return { success: true, settings };
    } catch (error) {
      console.error("Error in bf2:getSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set all BF2 settings
  ipcMain.handle("bf2:setSettings", async (_, newSettings) => {
    try {
      bf2Storage.saveBF2Settings(newSettings);
      // Write config file for screen capture script
      bf2Storage.writeConfigFile();
      return { success: true };
    } catch (error) {
      console.error("Error in bf2:setSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Set a single BF2 setting
  ipcMain.handle("bf2:setSetting", async (_, key, value) => {
    try {
      bf2Storage.setBF2Setting(key, value);
      // Write config file for screen capture script
      bf2Storage.writeConfigFile();
      return { success: true };
    } catch (error) {
      console.error("Error in bf2:setSetting:", error);
      return { success: false, error: error.message };
    }
  });

  // Reset settings to defaults
  ipcMain.handle("bf2:resetSettings", async () => {
    try {
      bf2Storage.saveBF2Settings({ ...bf2Storage.DEFAULT_SETTINGS });
      // Write config file for screen capture script
      bf2Storage.writeConfigFile();
      return { success: true, settings: bf2Storage.DEFAULT_SETTINGS };
    } catch (error) {
      console.error("Error in bf2:resetSettings:", error);
      return { success: false, error: error.message };
    }
  });

  // Get config file path (for screen capture script)
  ipcMain.handle("bf2:getConfigFilePath", async () => {
    try {
      const configPath = bf2Storage.getConfigFilePath();
      return { success: true, path: configPath };
    } catch (error) {
      console.error("Error in bf2:getConfigFilePath:", error);
      return { success: false, error: error.message };
    }
  });

  // Write config file (triggers update for screen capture script)
  ipcMain.handle("bf2:writeConfigFile", async () => {
    try {
      const configPath = bf2Storage.writeConfigFile();
      return { success: true, path: configPath };
    } catch (error) {
      console.error("Error in bf2:writeConfigFile:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerBF2Handlers };

