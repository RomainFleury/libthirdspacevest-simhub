import { useState, useEffect, useCallback, useRef } from "react";
import {
  alyxStart,
  alyxStop,
  alyxStatus,
  alyxGetModInfo,
  subscribeToDaemonEvents,
  AlyxStatus,
  AlyxModInfo,
  DaemonEvent,
} from "../lib/bridgeApi";

export type AlyxGameEvent = {
  id: string;
  type: string;
  ts: number;
  params?: Record<string, unknown>;
};

const MAX_EVENTS = 50; // Max events to keep in history

export function useAlyxIntegration() {
  const [status, setStatus] = useState<AlyxStatus>({
    running: false,
    log_path: null,
    events_received: 0,
    last_event_ts: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<AlyxGameEvent[]>([]);
  const [modInfo, setModInfo] = useState<AlyxModInfo | null>(null);
  const eventIdCounter = useRef(0);

  // Fetch status on mount and periodically
  const fetchStatus = useCallback(async () => {
    try {
      const result = await alyxStatus();
      setStatus(result);
      setError(result.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get status");
    }
  }, []);

  // Fetch mod info on mount
  const fetchModInfo = useCallback(async () => {
    try {
      const result = await alyxGetModInfo();
      if (result.success && result.mod_info) {
        setModInfo(result.mod_info);
      }
    } catch (err) {
      console.error("Failed to get mod info:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchModInfo();
    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchModInfo]);

  // Subscribe to daemon events for Alyx game events
  useEffect(() => {
    const unsubscribe = subscribeToDaemonEvents((event: DaemonEvent) => {
      // Handle Alyx-specific events
      if (event.event === "alyx_started") {
        setStatus((prev) => ({
          ...prev,
          running: true,
          log_path: event.log_path ?? prev.log_path,
        }));
      } else if (event.event === "alyx_stopped") {
        setStatus((prev) => ({
          ...prev,
          running: false,
        }));
      } else if (event.event === "alyx_game_event" && event.event_type) {
        // Add game event to history
        const newEvent: AlyxGameEvent = {
          id: `alyx-${++eventIdCounter.current}`,
          type: event.event_type,
          ts: event.ts * 1000, // Convert to milliseconds
          params: event.params,
        };
        setGameEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
        // Update events received counter
        setStatus((prev) => ({
          ...prev,
          events_received: (prev.events_received ?? 0) + 1,
          last_event_ts: event.ts,
        }));
      }
    });

    return unsubscribe;
  }, []);

  const start = useCallback(async (logPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await alyxStart(logPath);
      if (!result.success) {
        setError(result.error || "Failed to start Alyx integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Alyx integration");
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await alyxStop();
      if (!result.success) {
        setError(result.error || "Failed to stop Alyx integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop Alyx integration");
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const clearEvents = useCallback(() => {
    setGameEvents([]);
  }, []);

  return {
    status,
    loading,
    error,
    gameEvents,
    modInfo,
    start,
    stop,
    clearEvents,
    refresh: fetchStatus,
  };
}

