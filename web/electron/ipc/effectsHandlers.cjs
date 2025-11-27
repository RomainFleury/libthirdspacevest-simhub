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
  // Play a predefined effect
  ipcMain.handle("effects:play", async (_event, effectName) => {
    const daemon = getDaemonBridge();
    return await daemon.playEffect(effectName);
  });

  // List all available effects
  ipcMain.handle("effects:list", async () => {
    const daemon = getDaemonBridge();
    return await daemon.listEffects();
  });

  // Stop all effects (emergency stop)
  ipcMain.handle("effects:stop", async () => {
    const daemon = getDaemonBridge();
    return await daemon.stopEffect();
  });
}

module.exports = {
  registerEffectsHandlers,
};

