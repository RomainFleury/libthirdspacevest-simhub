const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("vestBridge", {
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
});
