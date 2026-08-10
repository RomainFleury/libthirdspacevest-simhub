/**
 * Storage for Left 4 Dead 2 integration settings.
 */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = "l4d2-settings.json";

function getSettingsPath() {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function loadL4D2Settings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading L4D2 settings:", error);
  }
  return {};
}

function saveL4D2Settings(settings) {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving L4D2 settings:", error);
  }
}

function getL4D2LogPath() {
  const settings = loadL4D2Settings();
  return settings.logPath || null;
}

function setL4D2LogPath(logPath) {
  const settings = loadL4D2Settings();
  settings.logPath = logPath;
  saveL4D2Settings(settings);
}

function getL4D2PlayerName() {
  const settings = loadL4D2Settings();
  return settings.playerName || null;
}

function setL4D2PlayerName(playerName) {
  const settings = loadL4D2Settings();
  settings.playerName = playerName;
  saveL4D2Settings(settings);
}

function getL4D2GameDir() {
  const settings = loadL4D2Settings();
  return settings.gameDir || null;
}

function setL4D2GameDir(gameDir) {
  const settings = loadL4D2Settings();
  settings.gameDir = gameDir;
  saveL4D2Settings(settings);
}

function getL4D2SolenoidRecoil() {
  const settings = loadL4D2Settings();
  const solenoid = settings.solenoidRecoil && typeof settings.solenoidRecoil === "object"
    ? settings.solenoidRecoil
    : {};
  return {
    enabled: solenoid.enabled !== undefined ? Boolean(solenoid.enabled) : true,
    durationMs:
      typeof solenoid.durationMs === "number" && Number.isFinite(solenoid.durationMs)
        ? Math.max(25, Math.min(120, Math.round(solenoid.durationMs)))
        : 40,
  };
}

function setL4D2SolenoidRecoil(solenoidRecoil) {
  const settings = loadL4D2Settings();
  const current = getL4D2SolenoidRecoil();
  settings.solenoidRecoil = {
    enabled:
      solenoidRecoil && solenoidRecoil.enabled !== undefined
        ? Boolean(solenoidRecoil.enabled)
        : current.enabled,
    durationMs:
      solenoidRecoil && typeof solenoidRecoil.durationMs === "number"
        ? Math.max(25, Math.min(120, Math.round(solenoidRecoil.durationMs)))
        : current.durationMs,
  };
  saveL4D2Settings(settings);
  return settings.solenoidRecoil;
}

module.exports = {
  getL4D2LogPath,
  setL4D2LogPath,
  getL4D2PlayerName,
  setL4D2PlayerName,
  getL4D2GameDir,
  setL4D2GameDir,
  getL4D2SolenoidRecoil,
  setL4D2SolenoidRecoil,
};

