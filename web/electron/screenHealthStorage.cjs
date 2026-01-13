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

const DEFAULT_SCREENSHOTS_INDEX = [];

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
        screenshotsIndex: [...DEFAULT_SCREENSHOTS_INDEX],
      };
    }
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      activeProfileId: parsed.activeProfileId ?? null,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      screenshotsIndex: Array.isArray(parsed.screenshotsIndex) ? parsed.screenshotsIndex : [...DEFAULT_SCREENSHOTS_INDEX],
    };
  } catch (e) {
    console.error("Failed to load screen health state:", e.message);
    return {
      profiles: [],
      activeProfileId: null,
      settings: { ...DEFAULT_SETTINGS },
      screenshotsIndex: [...DEFAULT_SCREENSHOTS_INDEX],
    };
  }
}

function saveState(state) {
  const p = _getStatePath();
  const data = {
    profiles: state.profiles || [],
    activeProfileId: state.activeProfileId ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(state.settings || {}) },
    screenshotsIndex: Array.isArray(state.screenshotsIndex) ? state.screenshotsIndex : [...DEFAULT_SCREENSHOTS_INDEX],
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
  // IMPORTANT: avoid directory scans (`readdirSync/statSync`) which can be very slow.
  // We return the tracked index, which is updated when screenshots are created/deleted.
  const state = loadState();
  const idx = Array.isArray(state.screenshotsIndex) ? state.screenshotsIndex : [];
  return [...idx].sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
}

function deleteScreenshot(filename) {
  const state = loadState();
  const idx = Array.isArray(state.screenshotsIndex) ? state.screenshotsIndex : [];
  const entry = idx.find((x) => x && x.filename === filename);
  const p = entry?.path;
  if (p && fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
  state.screenshotsIndex = idx.filter((x) => x && x.filename !== filename);
  saveState(state);
  return true;
}

function clearScreenshots() {
  // Best-effort clear without scanning directories: delete the files we know about.
  const state = loadState();
  const idx = Array.isArray(state.screenshotsIndex) ? state.screenshotsIndex : [];
  for (const f of idx) {
    try {
      if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (e) {
      // ignore
    }
  }
  state.screenshotsIndex = [];
  saveState(state);
  return true;
}

function recordScreenshot(entry) {
  // entry: { filename, path, size?, mtimeMs? }
  const state = loadState();
  const idx = Array.isArray(state.screenshotsIndex) ? state.screenshotsIndex : [];
  const now = Date.now();
  const e = {
    filename: entry?.filename,
    path: entry?.path,
    size: Number(entry?.size || 0),
    mtimeMs: Number(entry?.mtimeMs || now),
  };
  if (!e.filename || !e.path) return false;
  // Replace existing entry with same filename
  const filtered = idx.filter((x) => x && x.filename !== e.filename);
  filtered.push(e);
  state.screenshotsIndex = filtered;
  saveState(state);
  return true;
}

function enforceRetentionIndex() {
  // IMPORTANT: avoid directory scans. We only operate on tracked files (max count is small).
  const state = loadState();
  const settings = state.settings || { ...DEFAULT_SETTINGS };
  const maxCount = settings.retentionMaxCount ?? DEFAULT_SETTINGS.retentionMaxCount;
  const maxAgeDays = settings.retentionMaxAgeDays ?? DEFAULT_SETTINGS.retentionMaxAgeDays;
  const now = Date.now();

  let idx = Array.isArray(state.screenshotsIndex) ? state.screenshotsIndex : [];

  // Drop invalid entries and those whose files disappeared
  idx = idx.filter((x) => x && x.filename && x.path);
  idx = idx.filter((x) => {
    try {
      return fs.existsSync(x.path);
    } catch (e) {
      return false;
    }
  });

  // Age-based deletion
  const maxAgeMs = maxAgeDays > 0 ? maxAgeDays * 24 * 60 * 60 * 1000 : null;
  if (maxAgeMs != null) {
    const keep = [];
    for (const f of idx) {
      const ageOk = now - Number(f.mtimeMs || 0) <= maxAgeMs;
      if (ageOk) {
        keep.push(f);
        continue;
      }
      try {
        if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      } catch (e) {
        // ignore
      }
    }
    idx = keep;
  }

  // Count-based deletion (keep newest)
  idx.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
  if (maxCount != null && maxCount > 0 && idx.length > maxCount) {
    const keep = idx.slice(0, maxCount);
    const toDelete = idx.slice(maxCount);
    for (const f of toDelete) {
      try {
        if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      } catch (e) {
        // ignore
      }
    }
    idx = keep;
  }

  state.screenshotsIndex = idx;
  saveState(state);
  return true;
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
  recordScreenshot,
  enforceRetentionIndex,
  DEFAULT_SETTINGS,
};

