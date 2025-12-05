/**
 * Storage for Half-Life 2: Deathmatch integration settings.
 */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = "hl2dm-settings.json";

function getSettingsPath() {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function loadHL2DMSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading HL2DM settings:", error);
  }
  return {};
}

function saveHL2DMSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving HL2DM settings:", error);
  }
}

function getHL2DMLogPath() {
  const settings = loadHL2DMSettings();
  return settings.logPath || null;
}

function setHL2DMLogPath(logPath) {
  const settings = loadHL2DMSettings();
  settings.logPath = logPath;
  saveHL2DMSettings(settings);
}

function getHL2DMPlayerName() {
  const settings = loadHL2DMSettings();
  return settings.playerName || null;
}

function setHL2DMPlayerName(playerName) {
  const settings = loadHL2DMSettings();
  settings.playerName = playerName;
  saveHL2DMSettings(settings);
}

module.exports = {
  getHL2DMLogPath,
  setHL2DMLogPath,
  getHL2DMPlayerName,
  setHL2DMPlayerName,
};
