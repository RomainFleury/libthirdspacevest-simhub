import { useState, useEffect, useCallback, useRef } from "react";
import {
  chivalry2Start,
  chivalry2Stop,
  chivalry2Status,
  subscribeToDaemonEvents,
  Chivalry2Status,
  DaemonEvent,
} from "../lib/bridgeApi";

export type Chivalry2GameEvent = {
  id: string;
  type: string;
  ts: number;
  params?: Record<string, unknown>;
};

const MAX_EVENTS = 50; // Max events to keep in history

export function useChivalry2Integration() {
  const [status, setStatus] = useState<Chivalry2Status>({
    running: false,
    log_path: null,
    events_received: 0,
    last_event_ts: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<Chivalry2GameEvent[]>([]);
  const eventIdCounter = useRef(0);

  // Fetch status on mount and periodically
  const fetchStatus = useCallback(async () => {
    try {
      const result = await chivalry2Status();
      setStatus(result);
      setError(result.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get status");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Subscribe to daemon events for Chivalry 2 game events
  useEffect(() => {
    const unsubscribe = subscribeToDaemonEvents((event: DaemonEvent) => {
      // Handle Chivalry 2-specific events
      if (event.event === "chivalry2_started") {
        setStatus((prev) => ({
          ...prev,
          running: true,
          log_path: event.log_path ?? prev.log_path,
        }));
      } else if (event.event === "chivalry2_stopped") {
        setStatus((prev) => ({
          ...prev,
          running: false,
        }));
      } else if (event.event === "chivalry2_game_event" && event.event_type) {
        // Add game event to history
        const newEvent: Chivalry2GameEvent = {
          id: `chivalry2-${++eventIdCounter.current}`,
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
      const result = await chivalry2Start(logPath);
      if (!result.success) {
        setError(result.error || "Failed to start Chivalry 2 integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Chivalry 2 integration");
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await chivalry2Stop();
      if (!result.success) {
        setError(result.error || "Failed to stop Chivalry 2 integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop Chivalry 2 integration");
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
    start,
    stop,
    clearEvents,
    refresh: fetchStatus,
  };
}
