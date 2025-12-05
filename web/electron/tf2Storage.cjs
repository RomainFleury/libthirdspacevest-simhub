/**
 * Storage for Team Fortress 2 integration settings.
 */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = "tf2-settings.json";

function getSettingsPath() {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function loadTF2Settings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading TF2 settings:", error);
  }
  return {};
}

function saveTF2Settings(settings) {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving TF2 settings:", error);
  }
}

function getTF2LogPath() {
  const settings = loadTF2Settings();
  return settings.logPath || null;
}

function setTF2LogPath(logPath) {
  const settings = loadTF2Settings();
  settings.logPath = logPath;
  saveTF2Settings(settings);
}

function getTF2PlayerName() {
  const settings = loadTF2Settings();
  return settings.playerName || null;
}

function setTF2PlayerName(playerName) {
  const settings = loadTF2Settings();
  settings.playerName = playerName;
  saveTF2Settings(settings);
}

module.exports = {
  getTF2LogPath,
  setTF2LogPath,
  getTF2PlayerName,
  setTF2PlayerName,
};
