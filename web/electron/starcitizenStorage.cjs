/**
 * Star Citizen Settings Storage - Persists Star Citizen integration settings.
 *
 * Stores:
 * - Game.log path
 * - Player name
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const STARCITIZEN_SETTINGS_FILE = "starcitizen-settings.json";

/**
 * Get the path to the Star Citizen settings file
 */
function getSettingsPath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, STARCITIZEN_SETTINGS_FILE);
}

/**
 * Load Star Citizen settings
 * @returns {Object} Star Citizen settings object
 */
function loadStarCitizenSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return {
        logPath: null,
        playerName: null,
      };
    }
    const data = fs.readFileSync(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load Star Citizen settings:", error.message);
    return {
      logPath: null,
      playerName: null,
    };
  }
}

/**
 * Save Star Citizen settings
 * @param {Object} settings - Settings object
 */
function saveStarCitizenSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    const data = {
      ...settings,
      last_updated: new Date().toISOString(),
    };
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save Star Citizen settings:", error.message);
    throw error;
  }
}

/**
 * Get the saved Star Citizen log path
 * @returns {string|null} Log path or null
 */
function getStarCitizenLogPath() {
  const settings = loadStarCitizenSettings();
  return settings.logPath || null;
}

/**
 * Set the Star Citizen log path
 * @param {string} logPath - Path to Game.log file
 */
function setStarCitizenLogPath(logPath) {
  const settings = loadStarCitizenSettings();
  settings.logPath = logPath;
  saveStarCitizenSettings(settings);
}

/**
 * Get the saved Star Citizen player name
 * @returns {string|null} Player name or null
 */
function getStarCitizenPlayerName() {
  const settings = loadStarCitizenSettings();
  return settings.playerName || null;
}

/**
 * Set the Star Citizen player name
 * @param {string} playerName - Player name
 */
function setStarCitizenPlayerName(playerName) {
  const settings = loadStarCitizenSettings();
  settings.playerName = playerName;
  saveStarCitizenSettings(settings);
}

module.exports = {
  loadStarCitizenSettings,
  saveStarCitizenSettings,
  getStarCitizenLogPath,
  setStarCitizenLogPath,
  getStarCitizenPlayerName,
  setStarCitizenPlayerName,
};

