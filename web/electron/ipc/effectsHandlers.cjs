/**
 * IPC Handlers for Predefined Effects Library.
 *
 * These handlers allow the UI to trigger predefined haptic effects
 * (machine gun, shotgun, explosion, etc.) without going through
 * game integrations.
 */

const { ipcMain } = require("electron");
const { getDaemonBridge } = require("../daemonBridge.cjs");

/**
 * Register IPC handlers for effects library.
 */
function registerEffectsHandlers() {
  const bridge = getDaemonBridge();

  // Play a predefined effect
  ipcMain.handle("effects:play", async (_event, effectName) => {
    return bridge.playEffect(effectName);
  });

  // List all available effects
  ipcMain.handle("effects:list", async () => {
    return bridge.listEffects();
  });

  // Stop all effects (emergency stop)
  ipcMain.handle("effects:stop", async () => {
    return bridge.stopEffect();
  });
}

module.exports = {
  registerEffectsHandlers,
};

