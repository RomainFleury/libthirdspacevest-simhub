/**
 * Hook for managing multiple vests.
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
        }
      });

      return () => {
        unsubscribe?.();
      };
    }, [fetchDevices]);

  // Initial fetch
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

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
    mainDeviceId,
    loading,
    error,
    fetchDevices,
    setMainDevice,
    disconnectDevice,
    createMockDevice,
    removeMockDevice,
  };
}

