const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("vestBridge", {
  // Existing API
  ping: () => ipcRenderer.invoke("vest:ping"),
  getStatus: () => ipcRenderer.invoke("vest:status"),
  getEffects: () => ipcRenderer.invoke("vest:effects"),
  triggerEffect: (effect) => ipcRenderer.invoke("vest:trigger", effect),
  stopAll: () => ipcRenderer.invoke("vest:stop"),
  listDevices: () => ipcRenderer.invoke("vest:listDevices"),
  connectToDevice: (deviceInfo) =>
    ipcRenderer.invoke("vest:connectToDevice", deviceInfo),
  getDevicePreference: () => ipcRenderer.invoke("vest:getDevicePreference"),
  saveDevicePreference: (deviceInfo) =>
    ipcRenderer.invoke("vest:saveDevicePreference", deviceInfo),
  clearDevicePreference: () => ipcRenderer.invoke("vest:clearDevicePreference"),

  // New daemon-related API
  getDaemonStatus: () => ipcRenderer.invoke("vest:getDaemonStatus"),
  reconnectDaemon: () => ipcRenderer.invoke("vest:reconnectDaemon"),

  // Event subscription
  onDaemonEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vest:event", handler);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener("vest:event", handler);
    };
  },

  onDaemonStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("vest:daemon-status", handler);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener("vest:daemon-status", handler);
    };
  },

  // CS2 GSI Integration API
  cs2Start: (gsiPort) => ipcRenderer.invoke("cs2:start", gsiPort),
  cs2Stop: () => ipcRenderer.invoke("cs2:stop"),
  cs2Status: () => ipcRenderer.invoke("cs2:status"),
  cs2GenerateConfig: (gsiPort) => ipcRenderer.invoke("cs2:generateConfig", gsiPort),

  // CS2 Config Path Management
  cs2GetConfigPath: () => ipcRenderer.invoke("cs2:getConfigPath"),
  cs2SetConfigPath: (configPath) => ipcRenderer.invoke("cs2:setConfigPath", configPath),
  cs2AutoDetectPath: () => ipcRenderer.invoke("cs2:autoDetectPath"),
  cs2BrowseConfigPath: () => ipcRenderer.invoke("cs2:browseConfigPath"),
  cs2SaveConfigToCS2: (gsiPort) => ipcRenderer.invoke("cs2:saveConfigToCS2", gsiPort),

  // Half-Life: Alyx Integration API
  alyxStart: (logPath) => ipcRenderer.invoke("alyx:start", logPath),
  alyxStop: () => ipcRenderer.invoke("alyx:stop"),
  alyxStatus: () => ipcRenderer.invoke("alyx:status"),
  alyxGetModInfo: () => ipcRenderer.invoke("alyx:getModInfo"),

  // SUPERHOT VR Integration API
  superhotStart: () => ipcRenderer.invoke("superhot:start"),
  superhotStop: () => ipcRenderer.invoke("superhot:stop"),
  superhotStatus: () => ipcRenderer.invoke("superhot:status"),

  // Pistol Whip Integration API
  pistolwhipStart: () => ipcRenderer.invoke("pistolwhip:start"),
  pistolwhipStop: () => ipcRenderer.invoke("pistolwhip:stop"),
  pistolwhipStatus: () => ipcRenderer.invoke("pistolwhip:status"),

  // Star Citizen Integration API
  starcitizenStart: (logPath, playerName) => ipcRenderer.invoke("starcitizen:start", logPath, playerName),
  starcitizenStop: () => ipcRenderer.invoke("starcitizen:stop"),
  starcitizenStatus: () => ipcRenderer.invoke("starcitizen:status"),
  starcitizenBrowseLogPath: () => ipcRenderer.invoke("starcitizen:browseLogPath"),
  starcitizenGetSettings: () => ipcRenderer.invoke("starcitizen:getSettings"),
  starcitizenSetLogPath: (logPath) => ipcRenderer.invoke("starcitizen:setLogPath", logPath),
  starcitizenSetPlayerName: (playerName) => ipcRenderer.invoke("starcitizen:setPlayerName", playerName),

  // Left 4 Dead 2 Integration API
  l4d2Start: (logPath, playerName) => ipcRenderer.invoke("l4d2:start", logPath, playerName),
  l4d2Stop: () => ipcRenderer.invoke("l4d2:stop"),
  l4d2Status: () => ipcRenderer.invoke("l4d2:status"),
  l4d2BrowseLogPath: () => ipcRenderer.invoke("l4d2:browseLogPath"),
  l4d2GetSettings: () => ipcRenderer.invoke("l4d2:getSettings"),
  l4d2SetLogPath: (logPath) => ipcRenderer.invoke("l4d2:setLogPath", logPath),
  l4d2SetPlayerName: (playerName) => ipcRenderer.invoke("l4d2:setPlayerName", playerName),

  // Predefined Effects Library API
  playEffect: (effectName) => ipcRenderer.invoke("effects:play", effectName),
  listEffectsLibrary: () => ipcRenderer.invoke("effects:list"),
  stopEffect: () => ipcRenderer.invoke("effects:stop"),

  // EA Battlefront 2 (2017) Settings API
  bf2GetSettings: () => ipcRenderer.invoke("bf2:getSettings"),
  bf2SetSettings: (settings) => ipcRenderer.invoke("bf2:setSettings", settings),
  bf2SetSetting: (key, value) => ipcRenderer.invoke("bf2:setSetting", key, value),
  bf2ResetSettings: () => ipcRenderer.invoke("bf2:resetSettings"),
  bf2GetConfigFilePath: () => ipcRenderer.invoke("bf2:getConfigFilePath"),
  bf2WriteConfigFile: () => ipcRenderer.invoke("bf2:writeConfigFile"),

  // Multi-Vest Management API
  listConnectedDevices: () => ipcRenderer.invoke("multivist:listConnectedDevices"),
  setMainDevice: (deviceId) => ipcRenderer.invoke("multivist:setMainDevice", deviceId),
  disconnectDevice: (deviceId) => ipcRenderer.invoke("multivist:disconnectDevice", deviceId),
  createPlayer: (playerId, name) => ipcRenderer.invoke("multivist:createPlayer", playerId, name),
  assignPlayer: (playerId, deviceId) => ipcRenderer.invoke("multivist:assignPlayer", playerId, deviceId),
  unassignPlayer: (playerId) => ipcRenderer.invoke("multivist:unassignPlayer", playerId),
  listPlayers: () => ipcRenderer.invoke("multivist:listPlayers"),
  getPlayerDevice: (playerId) => ipcRenderer.invoke("multivist:getPlayerDevice", playerId),
  setGamePlayerMapping: (gameId, playerNum, deviceId) => ipcRenderer.invoke("multivist:setGamePlayerMapping", gameId, playerNum, deviceId),
  clearGamePlayerMapping: (gameId, playerNum) => ipcRenderer.invoke("multivist:clearGamePlayerMapping", gameId, playerNum),
  listGamePlayerMappings: (gameId) => ipcRenderer.invoke("multivist:listGamePlayerMappings", gameId),
  createMockDevice: () => ipcRenderer.invoke("multivist:createMockDevice"),
  removeMockDevice: (deviceId) => ipcRenderer.invoke("multivist:removeMockDevice", deviceId),
});
