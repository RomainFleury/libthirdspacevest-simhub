/**
 * Multi-Vest IPC Handlers - Multi-vest and player management.
 *
 * Handles:
 * - multivist:listConnectedDevices
 * - multivist:setMainDevice
 * - multivist:disconnectDevice
 * - multivist:createPlayer
 * - multivist:assignPlayer
 * - multivist:unassignPlayer
 * - multivist:listPlayers
 * - multivist:getPlayerDevice
 * - multivist:setGamePlayerMapping
 * - multivist:clearGamePlayerMapping
 * - multivist:listGamePlayerMappings
 */

const { ipcMain } = require("electron");

/**
 * Register multi-vest related IPC handlers.
 * @param {Function} getDaemonBridge - Function that returns the daemon bridge instance
 */
function registerMultiVestHandlers(getDaemonBridge) {
  // List all connected devices
  ipcMain.handle("multivist:listConnectedDevices", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("list_connected_devices");
    } catch (error) {
      console.error("Error in multivist:listConnectedDevices:", error);
      return { success: false, error: error.message };
    }
  });

  // Set main device
  ipcMain.handle("multivist:setMainDevice", async (_, deviceId) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("set_main_device", { device_id: deviceId });
    } catch (error) {
      console.error("Error in multivist:setMainDevice:", error);
      return { success: false, error: error.message };
    }
  });

  // Disconnect device
  ipcMain.handle("multivist:disconnectDevice", async (_, deviceId) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("disconnect_device", { device_id: deviceId });
    } catch (error) {
      console.error("Error in multivist:disconnectDevice:", error);
      return { success: false, error: error.message };
    }
  });

  // Create player
  ipcMain.handle("multivist:createPlayer", async (_, playerId, name) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("create_player", { 
        player_id: playerId,
        message: name // Using message field for name
      });
    } catch (error) {
      console.error("Error in multivist:createPlayer:", error);
      return { success: false, error: error.message };
    }
  });

  // Assign player to device
  ipcMain.handle("multivist:assignPlayer", async (_, playerId, deviceId) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("assign_player", { 
        player_id: playerId,
        device_id: deviceId
      });
    } catch (error) {
      console.error("Error in multivist:assignPlayer:", error);
      return { success: false, error: error.message };
    }
  });

  // Unassign player
  ipcMain.handle("multivist:unassignPlayer", async (_, playerId) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("unassign_player", { player_id: playerId });
    } catch (error) {
      console.error("Error in multivist:unassignPlayer:", error);
      return { success: false, error: error.message };
    }
  });

  // List all players
  ipcMain.handle("multivist:listPlayers", async () => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("list_players");
    } catch (error) {
      console.error("Error in multivist:listPlayers:", error);
      return { success: false, error: error.message };
    }
  });

  // Get player device
  ipcMain.handle("multivist:getPlayerDevice", async (_, playerId) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("get_player_device", { player_id: playerId });
    } catch (error) {
      console.error("Error in multivist:getPlayerDevice:", error);
      return { success: false, error: error.message };
    }
  });

  // Set game player mapping
  ipcMain.handle("multivist:setGamePlayerMapping", async (_, gameId, playerNum, deviceId) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("set_game_player_mapping", { 
        game_id: gameId,
        player_num: playerNum,
        device_id: deviceId
      });
    } catch (error) {
      console.error("Error in multivist:setGamePlayerMapping:", error);
      return { success: false, error: error.message };
    }
  });

  // Clear game player mapping
  ipcMain.handle("multivist:clearGamePlayerMapping", async (_, gameId, playerNum) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("clear_game_player_mapping", { 
        game_id: gameId,
        player_num: playerNum || undefined // If playerNum is null, clear all for game
      });
    } catch (error) {
      console.error("Error in multivist:clearGamePlayerMapping:", error);
      return { success: false, error: error.message };
    }
  });

  // List game player mappings
  ipcMain.handle("multivist:listGamePlayerMappings", async (_, gameId) => {
    try {
      const daemonBridge = getDaemonBridge();
      if (!daemonBridge?.connected) {
        return { success: false, error: "Not connected to daemon" };
      }
      return await daemonBridge.sendCommand("list_game_player_mappings", { 
        game_id: gameId || undefined
      });
    } catch (error) {
      console.error("Error in multivist:listGamePlayerMappings:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerMultiVestHandlers };

