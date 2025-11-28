/**
 * Hook for managing multiple vests and player assignments.
 */

import { useState, useEffect, useCallback } from "react";

// @ts-ignore - window.vestBridge
const bridge = window.vestBridge;

export interface ConnectedDevice {
  device_id: string;
  is_main: boolean;
  bus?: number;
  address?: number;
  serial_number?: string;
  is_mock?: boolean;  // True if this is a mock device
}

export interface Player {
  player_id: string;
  device_id: string | null;
  name: string | null;
}

export function useMultiVest() {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [mainDeviceId, setMainDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected devices
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.listConnectedDevices?.();
      if (result?.success && result.devices) {
        setDevices(result.devices);
        // Find main device
        const main = result.devices.find((d: ConnectedDevice) => d.is_main);
        setMainDeviceId(main?.device_id || null);
      } else {
        setError(result?.error || "Failed to fetch devices");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch players
  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.listPlayers?.();
      if (result?.success && result.devices) {
        setPlayers(result.devices);
      } else {
        setError(result?.error || "Failed to fetch players");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Set main device
  const setMainDevice = useCallback(async (deviceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.setMainDevice?.(deviceId);
      if (result?.success) {
        await fetchDevices();
      } else {
        setError(result?.error || "Failed to set main device");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchDevices]);

  // Disconnect device
  const disconnectDevice = useCallback(async (deviceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.disconnectDevice?.(deviceId);
      if (result?.success) {
        await fetchDevices();
      } else {
        setError(result?.error || "Failed to disconnect device");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchDevices]);

  // Create player
  const createPlayer = useCallback(async (playerId: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.createPlayer?.(playerId, name);
      if (result?.success) {
        await fetchPlayers();
      } else {
        setError(result?.error || "Failed to create player");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchPlayers]);

  // Assign player to device
  const assignPlayer = useCallback(async (playerId: string, deviceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.assignPlayer?.(playerId, deviceId);
      if (result?.success) {
        await fetchPlayers();
      } else {
        setError(result?.error || "Failed to assign player");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchPlayers]);

  // Unassign player
  const unassignPlayer = useCallback(async (playerId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.unassignPlayer?.(playerId);
      if (result?.success) {
        await fetchPlayers();
      } else {
        setError(result?.error || "Failed to unassign player");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchPlayers]);

    // Subscribe to daemon events
    useEffect(() => {
      const unsubscribe = bridge?.onDaemonEvent?.((event: any) => {
        // Handle device events
        if (event.event === "device_connected" || 
            event.event === "device_disconnected" ||
            event.event === "mock_device_created" ||
            event.event === "mock_device_removed") {
          fetchDevices();
        } else if (event.event === "main_device_changed") {
          fetchDevices();
        } else if (event.event === "player_assigned" || event.event === "player_unassigned") {
          fetchPlayers();
        }
      });

      return () => {
        unsubscribe?.();
      };
    }, [fetchDevices, fetchPlayers]);

  // Initial fetch
  useEffect(() => {
    fetchDevices();
    fetchPlayers();
  }, [fetchDevices, fetchPlayers]);

  // Create mock device
  const createMockDevice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.createMockDevice?.();
      if (result?.success) {
        await fetchDevices(); // Refresh device list
      } else {
        setError(result?.error || "Failed to create mock device");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchDevices]);

  // Remove mock device
  const removeMockDevice = useCallback(async (deviceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await bridge?.removeMockDevice?.(deviceId);
      if (result?.success) {
        await fetchDevices(); // Refresh device list
      } else {
        setError(result?.error || "Failed to remove mock device");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchDevices]);

  return {
    devices,
    players,
    mainDeviceId,
    loading,
    error,
    fetchDevices,
    fetchPlayers,
    setMainDevice,
    disconnectDevice,
    createPlayer,
    assignPlayer,
    unassignPlayer,
    createMockDevice,
    removeMockDevice,
  };
}

