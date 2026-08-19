/** Persistent settings for the EA Battlefront II KYBER integration. */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = "swbf2-kyber-settings.json";

function getSettingsPath() {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function defaults() {
  return {
    host: "",
    port: 5051,
    playerName: "",
    solenoidRecoil: {
      enabled: true,
      durationMs: 40,
    },
  };
}

function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      return normalizeSettings(parsed);
    }
  } catch (error) {
    console.error("Error loading SWBF2 KYBER settings:", error);
  }
  return defaults();
}

function normalizeSettings(value) {
  const base = defaults();
  const source = value && typeof value === "object" ? value : {};
  const rawPort = Number(source.port);
  const solenoid =
    source.solenoidRecoil && typeof source.solenoidRecoil === "object"
      ? source.solenoidRecoil
      : {};
  return {
    host: typeof source.host === "string" ? source.host.trim() : base.host,
    port:
      Number.isInteger(rawPort) && rawPort >= 1 && rawPort <= 65535
        ? rawPort
        : base.port,
    playerName:
      typeof source.playerName === "string" ? source.playerName.trim() : base.playerName,
    solenoidRecoil: {
      enabled:
        solenoid.enabled !== undefined
          ? Boolean(solenoid.enabled)
          : base.solenoidRecoil.enabled,
      durationMs:
        typeof solenoid.durationMs === "number" && Number.isFinite(solenoid.durationMs)
          ? Math.max(25, Math.min(120, Math.round(solenoid.durationMs)))
          : base.solenoidRecoil.durationMs,
    },
  };
}

function saveSettings(value) {
  const settings = normalizeSettings(value);
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving SWBF2 KYBER settings:", error);
    throw error;
  }
  return settings;
}

module.exports = {
  loadSettings,
  saveSettings,
  normalizeSettings,
};
