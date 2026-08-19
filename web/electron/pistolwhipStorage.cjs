/**
 * Storage for Pistol Whip integration settings.
 */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = "pistolwhip-settings.json";

function getSettingsPath() {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading Pistol Whip settings:", error);
  }
  return {};
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving Pistol Whip settings:", error);
  }
}

function getPistolWhipSolenoidRecoil() {
  const settings = loadSettings();
  const solenoid =
    settings.solenoidRecoil && typeof settings.solenoidRecoil === "object"
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

function getPistolWhipGameDir() {
  const settings = loadSettings();
  return settings.gameDir || null;
}

function setPistolWhipGameDir(gameDir) {
  const settings = loadSettings();
  settings.gameDir = gameDir;
  saveSettings(settings);
}

function setPistolWhipSolenoidRecoil(solenoidRecoil) {
  const settings = loadSettings();
  const current = getPistolWhipSolenoidRecoil();
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
  saveSettings(settings);
  return settings.solenoidRecoil;
}

module.exports = {
  getPistolWhipGameDir,
  setPistolWhipGameDir,
  getPistolWhipSolenoidRecoil,
  setPistolWhipSolenoidRecoil,
};
