/**
 * CS2 Settings Storage - Persists CS2 integration settings.
 *
 * Stores:
 * - CS2 config folder path (for saving GSI config directly)
 * - GSI port preference
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const CS2_SETTINGS_FILE = "cs2-settings.json";

/**
 * Get the path to the CS2 settings file
 */
function getSettingsPath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, CS2_SETTINGS_FILE);
}

/**
 * Load CS2 settings
 * @returns {Object} CS2 settings object
 */
function loadCS2Settings() {
  try {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) {
      return {
        configPath: null,
        gsiPort: 3000,
      };
    }
    const data = fs.readFileSync(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load CS2 settings:", error.message);
    return {
      configPath: null,
      gsiPort: 3000,
    };
  }
}

/**
 * Save CS2 settings
 * @param {Object} settings - Settings object
 */
function saveCS2Settings(settings) {
  try {
    const settingsPath = getSettingsPath();
    const data = {
      ...settings,
      last_updated: new Date().toISOString(),
    };
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save CS2 settings:", error.message);
    throw error;
  }
}

/**
 * Get the saved CS2 config path
 * @returns {string|null} Config path or null
 */
function getCS2ConfigPath() {
  const settings = loadCS2Settings();
  return settings.configPath || null;
}

/**
 * Set the CS2 config path
 * @param {string} configPath - Path to CS2 cfg folder
 */
function setCS2ConfigPath(configPath) {
  const settings = loadCS2Settings();
  settings.configPath = configPath;
  saveCS2Settings(settings);
}

/**
 * Auto-detect CS2 config folder path
 * @returns {string|null} Detected path or null
 */
function autoDetectCS2Path() {
  const os = require("os");
  const platform = os.platform();
  const home = os.homedir();

  // CS2 still uses the legacy "Counter-Strike Global Offensive" folder name
  const possiblePaths = [];

  if (platform === "win32") {
    possiblePaths.push(
      "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\cfg",
      "C:\\Program Files\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\cfg",
      path.join(
        home,
        "Steam",
        "steamapps",
        "common",
        "Counter-Strike Global Offensive",
        "game",
        "csgo",
        "cfg"
      )
    );
  } else if (platform === "darwin") {
    possiblePaths.push(
      path.join(
        home,
        "Library",
        "Application Support",
        "Steam",
        "steamapps",
        "common",
        "Counter-Strike Global Offensive",
        "game",
        "csgo",
        "cfg"
      )
    );
  } else {
    // Linux
    possiblePaths.push(
      path.join(
        home,
        ".steam",
        "steam",
        "steamapps",
        "common",
        "Counter-Strike Global Offensive",
        "game",
        "csgo",
        "cfg"
      ),
      path.join(
        home,
        ".local",
        "share",
        "Steam",
        "steamapps",
        "common",
        "Counter-Strike Global Offensive",
        "game",
        "csgo",
        "cfg"
      )
    );
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Save GSI config file to the CS2 folder
 * @param {string} configContent - Config file content
 * @param {string} configPath - Path to CS2 cfg folder (optional, uses saved path if not provided)
 * @returns {Object} Result with success and path/error
 */
function saveConfigToCS2(configContent, configPath = null) {
  const targetPath = configPath || getCS2ConfigPath();

  if (!targetPath) {
    return {
      success: false,
      error: "No CS2 config path set. Please set the path first.",
    };
  }

  if (!fs.existsSync(targetPath)) {
    return {
      success: false,
      error: `CS2 config folder not found: ${targetPath}`,
    };
  }

  try {
    const filePath = path.join(targetPath, "gamestate_integration_thirdspace.cfg");
    fs.writeFileSync(filePath, configContent, "utf8");
    return {
      success: true,
      path: filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write config: ${error.message}`,
    };
  }
}

/**
 * Check if a config file exists in the CS2 folder
 * @param {string} configPath - Path to check (optional, uses saved path)
 * @returns {boolean}
 */
function configExistsInCS2(configPath = null) {
  const targetPath = configPath || getCS2ConfigPath();
  if (!targetPath) return false;

  const filePath = path.join(targetPath, "gamestate_integration_thirdspace.cfg");
  return fs.existsSync(filePath);
}

module.exports = {
  loadCS2Settings,
  saveCS2Settings,
  getCS2ConfigPath,
  setCS2ConfigPath,
  autoDetectCS2Path,
  saveConfigToCS2,
  configExistsInCS2,
};

