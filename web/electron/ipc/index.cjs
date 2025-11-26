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
const { registerSuperHotHandlers } = require("./superhotHandlers.cjs");

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
  registerAlyxHandlers();

  // SUPERHOT VR integration handlers
  registerSuperHotHandlers();

  console.log("✓ IPC handlers registered");
}

module.exports = {
  registerAllHandlers,
  registerVestHandlers,
  registerDaemonHandlers,
  registerCS2Handlers,
  registerAlyxHandlers,
  registerSuperHotHandlers,
};

