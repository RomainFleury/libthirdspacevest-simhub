/**
 * Hook for managing game-specific player mappings.
 */

import { useState, useEffect, useCallback } from "react";

// @ts-ignore - window.vestBridge
const bridge = window.vestBridge;

export interface GamePlayerMapping {
  game_id: string;
  player_num: number;
  device_id: string;
}

export function useGamePlayerMapping(gameId?: string) {
  const [mappings, setMappings] = useState<GamePlayerMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch mappings
  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.listGamePlayerMappings?.(gameId);
      if (result?.success && result.devices) {
        setMappings(result.devices);
      } else {
        setError(result?.error || "Failed to fetch mappings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Set mapping
  const setMapping = useCallback(async (playerNum: number, deviceId: string) => {
    if (!gameId) {
      setError("gameId is required");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.setGamePlayerMapping?.(gameId, playerNum, deviceId);
      if (result?.success) {
        await fetchMappings();
      } else {
        setError(result?.error || "Failed to set mapping");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [gameId, fetchMappings]);

  // Clear mapping
  const clearMapping = useCallback(async (playerNum?: number) => {
    if (!gameId) {
      setError("gameId is required");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.clearGamePlayerMapping?.(gameId, playerNum);
      if (result?.success) {
        await fetchMappings();
      } else {
        setError(result?.error || "Failed to clear mapping");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [gameId, fetchMappings]);

  // Get device for player number
  const getDeviceForPlayer = useCallback((playerNum: number): string | null => {
    const mapping = mappings.find(m => m.player_num === playerNum);
    return mapping?.device_id || null;
  }, [mappings]);

  // Subscribe to daemon events
  useEffect(() => {
    const unsubscribe = bridge?.onDaemonEvent?.((event: any) => {
      if (event.event === "game_player_mapping_changed") {
        if (!gameId || event.game_id === gameId) {
          fetchMappings();
        }
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [gameId, fetchMappings]);

  // Initial fetch
  useEffect(() => {
    if (gameId) {
      fetchMappings();
    }
  }, [gameId, fetchMappings]);

  return {
    mappings,
    loading,
    error,
    fetchMappings,
    setMapping,
    clearMapping,
    getDeviceForPlayer,
  };
}

