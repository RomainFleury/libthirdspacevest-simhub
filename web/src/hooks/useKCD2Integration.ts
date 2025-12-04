import { useState, useEffect, useCallback, useRef } from "react";
import {
  kcd2Start,
  kcd2Stop,
  kcd2Status,
  kcd2GetModInfo,
  subscribeToDaemonEvents,
  KCD2Status,
  KCD2ModInfo,
  DaemonEvent,
} from "../lib/bridgeApi";

export type KCD2GameEvent = {
  id: string;
  type: string;
  ts: number;
  params?: Record<string, unknown>;
};

const MAX_EVENTS = 50; // Max events to keep in history

export function useKCD2Integration() {
  const [status, setStatus] = useState<KCD2Status>({
    running: false,
    log_path: null,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<KCD2GameEvent[]>([]);
  const [modInfo, setModInfo] = useState<KCD2ModInfo | null>(null);
  const eventIdCounter = useRef(0);

  // Fetch status on mount and periodically
  const fetchStatus = useCallback(async () => {
    try {
      const result = await kcd2Status();
      setStatus(result);
      setError(result.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get status");
    }
  }, []);

  // Fetch mod info on mount
  const fetchModInfo = useCallback(async () => {
    try {
      const result = await kcd2GetModInfo();
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

  // Subscribe to daemon events for KCD2 game events
  useEffect(() => {
    const unsubscribe = subscribeToDaemonEvents((event: DaemonEvent) => {
      // Handle KCD2-specific events
      if (event.event === "kcd2_started") {
        setStatus((prev) => ({
          ...prev,
          running: true,
          log_path: event.log_path ?? prev.log_path,
        }));
      } else if (event.event === "kcd2_stopped") {
        setStatus((prev) => ({
          ...prev,
          running: false,
        }));
      } else if (event.event === "kcd2_game_event" && event.event_type) {
        // Add game event to history
        const newEvent: KCD2GameEvent = {
          id: `kcd2-${++eventIdCounter.current}`,
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
          last_event_type: event.event_type,
        }));
      }
    });

    return unsubscribe;
  }, []);

  const start = useCallback(async (logPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await kcd2Start(logPath);
      if (!result.success) {
        setError(result.error || "Failed to start KCD2 integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start KCD2 integration");
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await kcd2Stop();
      if (!result.success) {
        setError(result.error || "Failed to stop KCD2 integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop KCD2 integration");
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
