/**
 * Half-Life: Alyx Settings Storage - Persists Alyx integration settings.
 *
 * Stores:
 * - console.log path
 * - per-event haptics enablement (opt-in)
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const ALYX_SETTINGS_FILE = "alyx-settings.json";

// Defaults aligned with daemon-side defaults:
// - PlayerHurt + PlayerDeath ON
// - everything else OFF (opt-in)
const DEFAULT_ENABLED_EVENTS = {
  PlayerHurt: true,
  PlayerDeath: true,

  PlayerShootWeapon: false,
  PlayerHealth: false,
  PlayerHeal: false,
  PlayerUsingHealthstation: false,
  PlayerGrabbityPull: false,
  PlayerGrabbityLockStart: false,
  PlayerGrabbityLockStop: false,
  GrabbityGloveCatch: false,
  PlayerGrabbedByBarnacle: false,
  PlayerReleasedByBarnacle: false,
  PlayerCoughStart: false,
  PlayerCoughEnd: false,
  TwoHandStart: false,
  TwoHandEnd: false,
  Reset: false,
  PlayerDropAmmoInBackpack: false,
  PlayerDropResinInBackpack: false,
  PlayerRetrievedBackpackClip: false,
  PlayerStoredItemInItemholder: false,
  PlayerRemovedItemFromItemholder: false,
  ItemPickup: false,
  ItemReleased: false,
  PlayerPistolClipInserted: false,
  PlayerPistolChamberedRound: false,
  PlayerShotgunShellLoaded: false,
  PlayerShotgunLoadedShells: false,
  PlayerShotgunUpgradeGrenadeLauncherState: false,
};

/**
 * Get the path to the Alyx settings file
 */
function getSettingsPath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, ALYX_SETTINGS_FILE);
}

function normalizeEnabledEvents(raw) {
  const merged = { ...DEFAULT_ENABLED_EVENTS };
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof k === "string") merged[k] = Boolean(v);
    }
  }
  return merged;
}

function normalizeSettings(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const solenoid = r.solenoidRecoil && typeof r.solenoidRecoil === "object" ? r.solenoidRecoil : {};
  return {
    logPath: typeof r.logPath === "string" ? r.logPath : null,
    enabledEvents: normalizeEnabledEvents(r.enabledEvents),
    solenoidRecoil: {
      enabled: solenoid.enabled !== undefined ? Boolean(solenoid.enabled) : true,
      durationMs:
        typeof solenoid.durationMs === "number" && Number.isFinite(solenoid.durationMs)
          ? Math.max(25, Math.min(120, Math.round(solenoid.durationMs)))
          : 40,
    },
  };
}

/**
 * Load Alyx settings
 * @returns {Object} Alyx settings object
 */
function loadAlyxSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return normalizeSettings({});
    }
    const data = fs.readFileSync(settingsPath, "utf8");
    return normalizeSettings(JSON.parse(data));
  } catch (error) {
    console.error("Failed to load Alyx settings:", error.message);
    return normalizeSettings({});
  }
}

/**
 * Save Alyx settings
 * @param {Object} settings - Settings object
 */
function saveAlyxSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    const normalized = normalizeSettings(settings);
    fs.writeFileSync(settingsPath, JSON.stringify(normalized, null, 2), "utf8");
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

/**
 * Get saved Alyx per-event enablement map
 * @returns {Record<string, boolean>}
 */
function getAlyxEnabledEvents() {
  const settings = loadAlyxSettings();
  return settings.enabledEvents || normalizeEnabledEvents(null);
}

/**
 * Save Alyx per-event enablement map
 * @param {Record<string, boolean>} enabledEvents
 */
function setAlyxEnabledEvents(enabledEvents) {
  const settings = loadAlyxSettings();
  settings.enabledEvents = normalizeEnabledEvents(enabledEvents);
  return saveAlyxSettings(settings);
}

/**
 * Set multiple Alyx settings at once (partial update).
 * @param {{logPath?: string|null, enabledEvents?: Record<string, boolean>, solenoidRecoil?: {enabled?: boolean, durationMs?: number}}} partial
 */
function setAlyxSettings(partial) {
  const settings = loadAlyxSettings();
  if (partial && typeof partial === "object") {
    if ("logPath" in partial) settings.logPath = partial.logPath ?? null;
    if ("enabledEvents" in partial) settings.enabledEvents = normalizeEnabledEvents(partial.enabledEvents);
    if ("solenoidRecoil" in partial && partial.solenoidRecoil && typeof partial.solenoidRecoil === "object") {
      settings.solenoidRecoil = {
        enabled:
          partial.solenoidRecoil.enabled !== undefined
            ? Boolean(partial.solenoidRecoil.enabled)
            : settings.solenoidRecoil.enabled,
        durationMs:
          typeof partial.solenoidRecoil.durationMs === "number"
            ? Math.max(25, Math.min(120, Math.round(partial.solenoidRecoil.durationMs)))
            : settings.solenoidRecoil.durationMs,
      };
    }
  }
  return saveAlyxSettings(settings);
}

function getAlyxSolenoidRecoil() {
  return loadAlyxSettings().solenoidRecoil;
}

// Export as an object for consistency with other storage modules
const alyxStorage = {
  getAlyxLogPath,
  setAlyxLogPath,
  getAlyxEnabledEvents,
  setAlyxEnabledEvents,
  getAlyxSolenoidRecoil,
  setAlyxSettings,
  loadAlyxSettings,
  saveAlyxSettings,
};

module.exports = { alyxStorage };
