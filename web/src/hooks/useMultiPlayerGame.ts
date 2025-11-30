/**
 * Hook for multiplayer games that need to trigger haptics on multiple vests.
 * 
 * This hook provides utilities for managing multiple players in a game,
 * each potentially assigned to a different vest device.
 */

import { useCallback, useMemo } from "react";
import { useGameHaptics, GameHapticsOptions } from "./useGameHaptics";
import { useGamePlayerMapping } from "./useGamePlayerMapping";
import { useMultiVest } from "./useMultiVest";

export interface Player {
  playerNum: number;
  playerId?: string;
  deviceId?: string;
}

export interface MultiPlayerGameOptions {
  gameId: string;
  maxPlayers?: number;
}

export function useMultiPlayerGame({ gameId, maxPlayers = 4 }: MultiPlayerGameOptions) {
  const { devices, players: globalPlayers, mainDeviceId } = useMultiVest();
  const { getDeviceForPlayer } = useGamePlayerMapping(gameId);
  const baseHaptics = useGameHaptics();

  /**
   * Get device ID for a player number.
   * Resolution order:
   * 1. Game-specific mapping (game_id + player_num)
   * 2. Global player assignment (player_id -> device_id)
   * 3. Main device (fallback)
   */
  const getPlayerDevice = useCallback((playerNum: number, playerId?: string): string | undefined => {
    // Try game-specific mapping first
    const gameDeviceId = getDeviceForPlayer(playerNum);
    if (gameDeviceId) {
      return gameDeviceId;
    }

    // Try global player assignment
    if (playerId) {
      const globalPlayer = globalPlayers.find(p => p.player_id === playerId);
      if (globalPlayer?.device_id) {
        return globalPlayer.device_id;
      }
    }

    // Fallback to main device
    return mainDeviceId || undefined;
  }, [getDeviceForPlayer, globalPlayers, mainDeviceId]);

  /**
   * Trigger haptic effect for a specific player.
   */
  const triggerForPlayer = useCallback(
    async (
      playerNum: number,
      cell: number,
      speed: number = 5,
      playerId?: string
    ) => {
      const deviceId = getPlayerDevice(playerNum, playerId);
      if (!deviceId) {
        console.warn(`No device available for player ${playerNum}`);
        return;
      }

      const options: GameHapticsOptions = {
        device_id: deviceId,
        player_id: playerId,
        game_id: gameId,
        player_num: playerNum,
      };

      await baseHaptics.triggerCell(cell, speed, options);
    },
    [getPlayerDevice, gameId, baseHaptics]
  );

  /**
   * Trigger haptic effect for multiple players simultaneously.
   */
  const triggerForPlayers = useCallback(
    async (
      playerNums: number[],
      cell: number,
      speed: number = 5,
      playerIds?: string[]
    ) => {
      await Promise.all(
        playerNums.map((playerNum, index) =>
          triggerForPlayer(playerNum, cell, speed, playerIds?.[index])
        )
      );
    },
    [triggerForPlayer]
  );

  /**
   * Trigger preset effect for a specific player.
   */
  const triggerPresetForPlayer = useCallback(
    async (
      playerNum: number,
      preset: "front" | "back" | "all",
      speed: number = 5,
      playerId?: string
    ) => {
      const deviceId = getPlayerDevice(playerNum, playerId);
      if (!deviceId) {
        console.warn(`No device available for player ${playerNum}`);
        return;
      }

      const options: GameHapticsOptions = {
        device_id: deviceId,
        player_id: playerId,
        game_id: gameId,
        player_num: playerNum,
      };

      await baseHaptics.triggerPreset(preset, speed, options);
    },
    [getPlayerDevice, gameId, baseHaptics]
  );

  /**
   * Get player information for all active players.
   */
  const getPlayers = useMemo((): Player[] => {
    return Array.from({ length: maxPlayers }, (_, i) => {
      const playerNum = i + 1;
      const deviceId = getPlayerDevice(playerNum);
      return {
        playerNum,
        deviceId,
      };
    });
  }, [maxPlayers, getPlayerDevice]);

  /**
   * Check if a player has a device assigned.
   */
  const hasPlayerDevice = useCallback(
    (playerNum: number, playerId?: string): boolean => {
      return getPlayerDevice(playerNum, playerId) !== undefined;
    },
    [getPlayerDevice]
  );

  return {
    // Player management
    getPlayerDevice,
    getPlayers,
    hasPlayerDevice,
    
    // Haptic triggers
    triggerForPlayer,
    triggerForPlayers,
    triggerPresetForPlayer,
    
    // Base haptics (for non-player-specific effects)
    triggerCell: baseHaptics.triggerCell,
    triggerCells: baseHaptics.triggerCells,
    triggerPreset: baseHaptics.triggerPreset,
    
    // Game info
    gameId,
    maxPlayers,
  };
}

