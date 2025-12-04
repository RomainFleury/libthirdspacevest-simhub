/**
 * Chivalry 2 Settings Storage
 * 
 * Stores Chivalry 2 integration settings (log path) in Electron's app data.
 */

const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const SETTINGS_FILE = path.join(app.getPath("userData"), "chivalry2-settings.json");

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading Chivalry 2 settings:", error);
  }
  return {};
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving Chivalry 2 settings:", error);
  }
}

function getChivalry2LogPath() {
  const settings = loadSettings();
  return settings.logPath || null;
}

function setChivalry2LogPath(logPath) {
  const settings = loadSettings();
  settings.logPath = logPath;
  saveSettings(settings);
}

module.exports = {
  getChivalry2LogPath,
  setChivalry2LogPath,
};
