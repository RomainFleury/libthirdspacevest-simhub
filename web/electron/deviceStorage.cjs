const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const PREFERENCE_FILE = "vest-device-preference.json";

/**
 * Get the path to the device preference file
 */
function getPreferencePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, PREFERENCE_FILE);
}

/**
 * Load the saved device preference
 * @returns {Object|null} Device preference object or null if not found
 */
function loadDevicePreference() {
  try {
    const prefPath = getPreferencePath();
    if (!fs.existsSync(prefPath)) {
      return null;
    }
    const data = fs.readFileSync(prefPath, "utf8");
    const parsed = JSON.parse(data);
    return parsed.preferred_device || null;
  } catch (error) {
    console.error("Failed to load device preference:", error.message);
    return null;
  }
}

/**
 * Save a device preference
 * @param {Object} deviceInfo - Device information object
 */
function saveDevicePreference(deviceInfo) {
  try {
    const prefPath = getPreferencePath();
    const data = {
      preferred_device: deviceInfo,
      last_updated: new Date().toISOString(),
    };
    fs.writeFileSync(prefPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save device preference:", error.message);
    throw error;
  }
}

/**
 * Clear the saved device preference
 */
function clearDevicePreference() {
  try {
    const prefPath = getPreferencePath();
    if (fs.existsSync(prefPath)) {
      fs.unlinkSync(prefPath);
    }
  } catch (error) {
    console.error("Failed to clear device preference:", error.message);
  }
}

module.exports = {
  loadDevicePreference,
  saveDevicePreference,
  clearDevicePreference,
};

