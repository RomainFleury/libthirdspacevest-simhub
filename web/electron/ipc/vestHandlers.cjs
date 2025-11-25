/**
 * Vest IPC Handlers - Vest control and device management.
 *
 * Handles:
 * - vest:ping, vest:status, vest:effects
 * - vest:trigger, vest:stop
 * - vest:listDevices, vest:connectToDevice
 * - vest:getDevicePreference, vest:saveDevicePreference, vest:clearDevicePreference
 */

const { ipcMain } = require("electron");
const deviceStorage = require("../deviceStorage.cjs");

/**
 * Register vest-related IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 */
function registerVestHandlers(getDaemonBridge) {
  // Ping (health check)
  ipcMain.handle("vest:ping", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.ping();
    } catch (error) {
      console.error("Error in vest:ping:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  });

  // Status
  ipcMain.handle("vest:status", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { connected: false, last_error: "Not connected to daemon" };
      }
      return await daemonBridge.getStatus();
    } catch (error) {
      console.error("Error in vest:status:", error);
      return {
        connected: false,
        last_error: error.message || "Failed to get status",
      };
    }
  });

  // Effects
  ipcMain.handle("vest:effects", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      return (await daemonBridge?.getEffects()) ?? [];
    } catch (error) {
      console.error("Error in vest:effects:", error);
      return [];
    }
  });

  // Trigger effect
  ipcMain.handle("vest:trigger", async (_, effect) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.triggerEffect(effect.cell, effect.speed);
    } catch (error) {
      console.error("Error in vest:trigger:", error);
      return {
        success: false,
        error: error.message || "Failed to trigger effect",
      };
    }
  });

  // Stop all
  ipcMain.handle("vest:stop", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.stopAll();
    } catch (error) {
      console.error("Error in vest:stop:", error);
      return {
        success: false,
        error: error.message || "Failed to stop all",
      };
    }
  });

  // List devices
  ipcMain.handle("vest:listDevices", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return [];
      }
      return await daemonBridge.listDevices();
    } catch (error) {
      console.error("Error in vest:listDevices:", error);
      return [];
    }
  });

  // Connect to device (select + connect)
  ipcMain.handle("vest:connectToDevice", async (_, deviceInfo) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { connected: false, last_error: "Not connected to daemon" };
      }
      const result = await daemonBridge.connectToDevice(deviceInfo);
      // If connection successful, save the preference
      if (result.connected && deviceInfo) {
        try {
          deviceStorage.saveDevicePreference(deviceInfo);
        } catch (saveError) {
          console.warn("Failed to save device preference:", saveError.message);
        }
      }
      return result;
    } catch (error) {
      console.error("Error in vest:connectToDevice:", error);
      return {
        connected: false,
        last_error: error.message || "Failed to connect to device",
      };
    }
  });

  // Device preference management
  ipcMain.handle("vest:getDevicePreference", async () => {
    try {
      return deviceStorage.loadDevicePreference();
    } catch (error) {
      console.error("Error in vest:getDevicePreference:", error);
      return null;
    }
  });

  ipcMain.handle("vest:saveDevicePreference", async (_, deviceInfo) => {
    try {
      deviceStorage.saveDevicePreference(deviceInfo);
      return { success: true };
    } catch (error) {
      console.error("Error in vest:saveDevicePreference:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("vest:clearDevicePreference", async () => {
    try {
      deviceStorage.clearDevicePreference();
      return { success: true };
    } catch (error) {
      console.error("Error in vest:clearDevicePreference:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerVestHandlers };

