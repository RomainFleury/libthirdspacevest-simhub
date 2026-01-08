/**
 * Generic Screen Health Watcher storage.
 *
 * Persists:
 * - Profiles (JSON blobs)
 * - Active profile id
 * - Screenshot/debug image settings (folder + retention)
 *
 * Notes:
 * - This is Phase A storage; schema may evolve.
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const STATE_FILE = "screen-health.json";

const DEFAULT_SETTINGS = {
  screenshotsDir: null, // if null, use default under userData
  retentionMaxCount: 25,
  retentionMaxAgeDays: 7,
};

function _getStatePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, STATE_FILE);
}

function _defaultScreenshotsDir() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "screen-health", "screenshots");
}

function _ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadState() {
  try {
    const p = _getStatePath();
    if (!fs.existsSync(p)) {
      return {
        profiles: [],
        activeProfileId: null,
        settings: { ...DEFAULT_SETTINGS },
      };
    }
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      activeProfileId: parsed.activeProfileId ?? null,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch (e) {
    console.error("Failed to load screen health state:", e.message);
    return {
      profiles: [],
      activeProfileId: null,
      settings: { ...DEFAULT_SETTINGS },
    };
  }
}

function saveState(state) {
  const p = _getStatePath();
  const data = {
    profiles: state.profiles || [],
    activeProfileId: state.activeProfileId ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(state.settings || {}) },
    last_updated: new Date().toISOString(),
  };
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

function _makeId() {
  return `sh_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function listProfiles() {
  const state = loadState();
  return { profiles: state.profiles, activeProfileId: state.activeProfileId };
}

function getActiveProfile() {
  const state = loadState();
  const p = state.profiles.find((x) => x.id === state.activeProfileId);
  return p || null;
}

function setActiveProfile(profileId) {
  const state = loadState();
  const exists = state.profiles.some((p) => p.id === profileId);
  if (!exists) {
    throw new Error("Profile not found");
  }
  state.activeProfileId = profileId;
  saveState(state);
  return true;
}

function upsertProfile(profile) {
  const state = loadState();
  const nowIso = new Date().toISOString();
  // Stored shape:
  // {
  //   id: string,
  //   name: string,
  //   profile: <daemon profile json>,
  //   createdAt, updatedAt
  // }
  const daemonProfile = profile.profile ? profile.profile : profile;
  const name = profile.name || daemonProfile.name || "Unnamed Profile";
  const p = {
    id: profile.id || _makeId(),
    name,
    profile: daemonProfile,
    updatedAt: nowIso,
    createdAt: profile.createdAt || nowIso,
  };

  const idx = state.profiles.findIndex((x) => x.id === p.id);
  if (idx >= 0) {
    state.profiles[idx] = p;
  } else {
    state.profiles.push(p);
    if (!state.activeProfileId) {
      state.activeProfileId = p.id;
    }
  }
  saveState(state);
  return p;
}

function deleteProfile(profileId) {
  const state = loadState();
  state.profiles = state.profiles.filter((p) => p.id !== profileId);
  if (state.activeProfileId === profileId) {
    state.activeProfileId = state.profiles.length ? state.profiles[0].id : null;
  }
  saveState(state);
  return true;
}

function getSettings() {
  const state = loadState();
  return state.settings || { ...DEFAULT_SETTINGS };
}

function setSettings(newSettings) {
  const state = loadState();
  state.settings = { ...DEFAULT_SETTINGS, ...(newSettings || {}) };
  saveState(state);
  return state.settings;
}

function getScreenshotsDir() {
  const settings = getSettings();
  const dir = settings.screenshotsDir || _defaultScreenshotsDir();
  _ensureDir(dir);
  return dir;
}

function listScreenshots() {
  const dir = getScreenshotsDir();
  _ensureDir(dir);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .map((f) => {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      return {
        filename: f,
        path: p,
        size: st.size,
        mtimeMs: st.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files;
}

function deleteScreenshot(filename) {
  const dir = getScreenshotsDir();
  const p = path.join(dir, filename);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
  return true;
}

function clearScreenshots() {
  const files = listScreenshots();
  for (const f of files) {
    try {
      fs.unlinkSync(f.path);
    } catch (e) {
      // ignore
    }
  }
  return true;
}

function enforceRetention() {
  const settings = getSettings();
  const maxCount = settings.retentionMaxCount ?? DEFAULT_SETTINGS.retentionMaxCount;
  const maxAgeDays = settings.retentionMaxAgeDays ?? DEFAULT_SETTINGS.retentionMaxAgeDays;

  const files = listScreenshots();
  const now = Date.now();

  // Age-based deletion
  const maxAgeMs = maxAgeDays > 0 ? maxAgeDays * 24 * 60 * 60 * 1000 : null;
  for (const f of files) {
    if (maxAgeMs != null && now - f.mtimeMs > maxAgeMs) {
      try {
        fs.unlinkSync(f.path);
      } catch (e) {
        // ignore
      }
    }
  }

  // Count-based deletion (keep newest)
  const remaining = listScreenshots();
  if (maxCount != null && maxCount > 0 && remaining.length > maxCount) {
    const toDelete = remaining.slice(maxCount);
    for (const f of toDelete) {
      try {
        fs.unlinkSync(f.path);
      } catch (e) {
        // ignore
      }
    }
  }
}

module.exports = {
  loadState,
  saveState,
  listProfiles,
  getActiveProfile,
  setActiveProfile,
  upsertProfile,
  deleteProfile,
  getSettings,
  setSettings,
  getScreenshotsDir,
  listScreenshots,
  deleteScreenshot,
  clearScreenshots,
  enforceRetention,
  DEFAULT_SETTINGS,
};

