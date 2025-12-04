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
const { registerPistolWhipHandlers } = require("./pistolwhipHandlers.cjs");
const { registerStarCitizenHandlers } = require("./starcitizenHandlers.cjs");
const { registerL4D2Handlers } = require("./l4d2Handlers.cjs");
const { registerHL2DMHandlers } = require("./hl2dmHandlers.cjs");
const { registerEffectsHandlers } = require("./effectsHandlers.cjs");
const { registerBF2Handlers } = require("./bf2Handlers.cjs");
const { registerMultiVestHandlers } = require("./multiVestHandlers.cjs");

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

  // Pistol Whip integration handlers
  registerPistolWhipHandlers();

  // Star Citizen integration handlers
  registerStarCitizenHandlers(getMainWindow);

  // Left 4 Dead 2 integration handlers
  registerL4D2Handlers(getMainWindow);

  // Half-Life 2: Deathmatch integration handlers
  registerHL2DMHandlers(getMainWindow);

  // Predefined effects library handlers
  registerEffectsHandlers();

  // EA Battlefront 2 (2017) settings handlers
  registerBF2Handlers();

  // Multi-vest management handlers
  registerMultiVestHandlers(getDaemonBridge);

  console.log("✓ IPC handlers registered");
}

module.exports = {
  registerAllHandlers,
  registerVestHandlers,
  registerDaemonHandlers,
  registerCS2Handlers,
  registerAlyxHandlers,
  registerSuperHotHandlers,
  registerPistolWhipHandlers,
  registerL4D2Handlers,
  registerHL2DMHandlers,
  registerEffectsHandlers,
  registerBF2Handlers,
};

