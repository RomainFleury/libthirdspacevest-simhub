/**
 * Half-Life: Alyx Settings Storage - Persists Alyx integration settings.
 *
 * Stores:
 * - console.log path
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const ALYX_SETTINGS_FILE = "alyx-settings.json";

/**
 * Get the path to the Alyx settings file
 */
function getSettingsPath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, ALYX_SETTINGS_FILE);
}

/**
 * Load Alyx settings
 * @returns {Object} Alyx settings object
 */
function loadAlyxSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return {
        logPath: null,
      };
    }
    const data = fs.readFileSync(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load Alyx settings:", error.message);
    return {
      logPath: null,
    };
  }
}

/**
 * Save Alyx settings
 * @param {Object} settings - Settings object
 */
function saveAlyxSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Failed to save Alyx settings:", error.message);
    return false;
  }
}

/**
 * Get saved Alyx log path
 * @returns {string|null} Saved log path or null
 */
function getAlyxLogPath() {
  const settings = loadAlyxSettings();
  return settings.logPath || null;
}

/**
 * Save Alyx log path
 * @param {string|null} logPath - Log path to save
 */
function setAlyxLogPath(logPath) {
  const settings = loadAlyxSettings();
  settings.logPath = logPath;
  return saveAlyxSettings(settings);
}

// Export as an object for consistency with other storage modules
const alyxStorage = {
  getAlyxLogPath,
  setAlyxLogPath,
  loadAlyxSettings,
  saveAlyxSettings,
};

module.exports = { alyxStorage };
