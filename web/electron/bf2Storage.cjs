/**
 * EA Battlefront 2 (2017) Settings Storage - Persists screen capture thresholds.
 *
 * Stores:
 * - Edge width (pixels to capture from each edge)
 * - Red threshold (minimum red value 0-255)
 * - Red ratio (red must be this much higher than green/blue)
 * - Cooldown (seconds between detections)
 * - Capture FPS (how often to capture screen)
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const BF2_SETTINGS_FILE = "bf2-settings.json";

// Default settings
const DEFAULT_SETTINGS = {
  edgeWidth: 20,
  redThreshold: 150,
  redRatio: 1.5,
  cooldown: 0.2,
  captureFps: 60,
};

/**
 * Get the path to the BF2 settings file
 */
function getSettingsPath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, BF2_SETTINGS_FILE);
}

/**
 * Load BF2 settings
 * @returns {Object} BF2 settings object
 */
function loadBF2Settings() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return { ...DEFAULT_SETTINGS };
    }
    const data = fs.readFileSync(settingsPath, "utf8");
    const loaded = JSON.parse(data);
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_SETTINGS, ...loaded };
  } catch (error) {
    console.error("Failed to load BF2 settings:", error.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save BF2 settings
 * @param {Object} settings - Settings object
 */
function saveBF2Settings(settings) {
  try {
    const settingsPath = getSettingsPath();
    const data = {
      ...settings,
      last_updated: new Date().toISOString(),
    };
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save BF2 settings:", error.message);
    throw error;
  }
}

/**
 * Get a specific setting value
 * @param {string} key - Setting key
 * @returns {any} Setting value or default
 */
function getBF2Setting(key) {
  const settings = loadBF2Settings();
  return settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
}

/**
 * Set a specific setting value
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
function setBF2Setting(key, value) {
  const settings = loadBF2Settings();
  settings[key] = value;
  saveBF2Settings(settings);
}

/**
 * Get the path to the config file that the screen capture script should read
 * This is the same location as the settings file, but with .json extension
 * @returns {string} Path to config file
 */
function getConfigFilePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "bf2-screen-capture-config.json");
}

/**
 * Write config file in format expected by screen capture script
 * @returns {string} Path to config file
 */
function writeConfigFile() {
  const settings = loadBF2Settings();
  const configPath = getConfigFilePath();
  const configData = {
    edge_width: settings.edgeWidth,
    red_threshold: settings.redThreshold,
    red_ratio: settings.redRatio,
    cooldown: settings.cooldown,
    capture_fps: settings.captureFps,
    last_updated: new Date().toISOString(),
  };
  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
  return configPath;
}

module.exports = {
  loadBF2Settings,
  saveBF2Settings,
  getBF2Setting,
  setBF2Setting,
  getConfigFilePath,
  writeConfigFile,
  DEFAULT_SETTINGS,
};

