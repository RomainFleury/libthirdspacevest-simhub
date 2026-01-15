/**
 * IPC Handlers Index - Exports all IPC handler registration functions.
 *
 * Usage in main.cjs:
 *   const { registerAllHandlers } = require('./ipc/index.cjs');
 *   registerAllHandlers(getDaemonBridge, getMainWindow, reconnectToDaemon);
 */

const { registerVestHandlers } = require("./vestHandlers.cjs");
const { registerDaemonHandlers } = require("./daemonHandlers.cjs");
const { registerCS2Handlers } = require("./cs2Handlers.cjs");
const { registerAlyxHandlers } = require("./alyxHandlers.cjs");
const { registerL4D2Handlers } = require("./l4d2Handlers.cjs");
const { registerEffectsHandlers } = require("./effectsHandlers.cjs");
const { registerScreenHealthHandlers } = require("./screenHealthHandlers.cjs");
const { registerMultiVestHandlers } = require("./multiVestHandlers.cjs");
const { registerModsHandlers } = require("./modsHandlers.cjs");

/**
 * Register all IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 * @param {Function} getMainWindow - Function that returns the main window instance
 * @param {Function} reconnectToDaemon - Function to reconnect to the daemon
 */
function registerAllHandlers(getDaemonBridge, getMainWindow, reconnectToDaemon) {
  // Vest control handlers
  registerVestHandlers(getDaemonBridge);

  // Daemon connection handlers
  registerDaemonHandlers(getDaemonBridge, reconnectToDaemon);

  // CS2 / Game integration handlers
  registerCS2Handlers(getDaemonBridge, getMainWindow);

  // Half-Life: Alyx integration handlers
  registerAlyxHandlers(getMainWindow);

  // Left 4 Dead 2 integration handlers
  registerL4D2Handlers(getMainWindow);

  // Predefined effects library handlers
  registerEffectsHandlers();

  // Generic Screen Health Watcher handlers
  registerScreenHealthHandlers(getDaemonBridge, getMainWindow);

  // Multi-vest management handlers
  registerMultiVestHandlers(getDaemonBridge);

  // Bundled game mods handlers
  registerModsHandlers(getMainWindow);

  console.log("✓ IPC handlers registered");
}

module.exports = {
  registerAllHandlers,
  registerVestHandlers,
  registerDaemonHandlers,
  registerCS2Handlers,
  registerAlyxHandlers,
  registerEffectsHandlers,
  registerScreenHealthHandlers,
};

