import { useCallback, useEffect, useState } from "react";
import type { SWBF2Settings, SWBF2Status } from "../lib/bridgeApi";

const DEFAULT_SETTINGS: SWBF2Settings = {
  host: "",
  port: 5051,
  playerName: "",
  solenoidRecoil: {
    enabled: true,
    durationMs: 40,
  },
};

const DEFAULT_STATUS: SWBF2Status = {
  running: false,
  connection_state: "stopped",
  port: 5051,
  players: [],
  events_received: 0,
  reconnect_count: 0,
  sequence_gaps: 0,
};

export interface SWBF2GameEvent {
  event: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export function useSWBF2Integration() {
  const [settings, setSettings] = useState<SWBF2Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<SWBF2Status>(DEFAULT_STATUS);
  const [gameEvents, setGameEvents] = useState<SWBF2GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const result = await window.vestBridge?.swbf2GetSettings?.();
    if (result?.success && result.settings) {
      setSettings(result.settings);
    }
  }, []);

  const saveSettings = useCallback(async (next: SWBF2Settings) => {
    setSettings(next);
    const result = await window.vestBridge?.swbf2SetSettings?.(next);
    if (!result?.success) {
      setError(result?.error || "Failed to save Battlefront II settings");
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const result = await window.vestBridge?.swbf2Status?.();
      if (result?.success && result.status) {
        setStatus(result.status);
        if (result.status.last_error) {
          setError(result.status.last_error);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to get KYBER status");
    }
  }, []);

  const start = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!settings.host.trim()) {
        setError("KYBER server IP or hostname is required");
        return;
      }
      if (!settings.playerName.trim()) {
        setError("Player display name is required");
        return;
      }
      const saved = await window.vestBridge?.swbf2SetSettings?.(settings);
      if (!saved?.success) {
        setError(saved?.error || "Failed to save settings");
        return;
      }
      const result = await window.vestBridge?.swbf2Start?.(settings);
      if (!result?.success) {
        setError(result?.error || "Failed to start KYBER integration");
        return;
      }
      if (result.status) {
        setStatus(result.status);
      }
      await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to start KYBER integration");
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, settings]);

  const stop = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.vestBridge?.swbf2Stop?.();
      if (!result?.success) {
        setError(result?.error || "Failed to stop KYBER integration");
      }
      await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to stop KYBER integration");
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const installPlugin = useCallback(async () => {
    const result = await window.vestBridge?.modsSaveToFolder?.("swbf2_kyber");
    if (!result?.success && !result?.canceled) {
      setError(result?.error || "Failed to copy the KYBER plugin");
    }
    return result;
  }, []);

  useEffect(() => {
    loadSettings();
    refreshStatus();
  }, [loadSettings, refreshStatus]);

  useEffect(() => {
    const bridge = window.vestBridge;
    if (!bridge?.onDaemonEvent) return;
    return bridge.onDaemonEvent((event: any) => {
      if (event.event === "swbf2_state_changed" && event.params) {
        setStatus(event.params as SWBF2Status);
        if (event.params.last_error) {
          setError(String(event.params.last_error));
        }
      } else if (event.event === "swbf2_started" && event.params) {
        setStatus(event.params as SWBF2Status);
      } else if (event.event === "swbf2_stopped") {
        setStatus((previous) => ({
          ...previous,
          running: false,
          connection_state: "stopped",
        }));
      } else if (event.event === "swbf2_game_event") {
        setGameEvents((previous) =>
          [
            {
              event: event.event_type || "unknown",
              params: event.params || {},
              timestamp: event.ts || Date.now() / 1000,
            },
            ...previous,
          ].slice(0, 50)
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!status.running) return;
    const timer = window.setInterval(refreshStatus, 2000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, status.running]);

  return {
    settings,
    setSettings,
    saveSettings,
    status,
    gameEvents,
    clearEvents: () => setGameEvents([]),
    isLoading,
    error,
    setError,
    start,
    stop,
    refreshStatus,
    installPlugin,
  };
}
