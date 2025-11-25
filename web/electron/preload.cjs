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
});
