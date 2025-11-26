/**
 * IPC handlers for SUPERHOT VR integration.
 */

const { ipcMain } = require('electron');
const daemonBridge = require('../daemonBridge.cjs');

function registerSuperHotHandlers() {
  // Enable SUPERHOT VR integration
  ipcMain.handle('superhot:start', async () => {
    try {
      const result = await daemonBridge.sendCommand({ cmd: 'superhot_start' });
      return result;
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  // Disable SUPERHOT VR integration
  ipcMain.handle('superhot:stop', async () => {
    try {
      const result = await daemonBridge.sendCommand({ cmd: 'superhot_stop' });
      return result;
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  // Get SUPERHOT VR integration status
  ipcMain.handle('superhot:status', async () => {
    try {
      const result = await daemonBridge.sendCommand({ cmd: 'superhot_status' });
      return result;
    } catch (error) {
      return { running: false, events_received: 0, message: error.message };
    }
  });
}

module.exports = { registerSuperHotHandlers };

