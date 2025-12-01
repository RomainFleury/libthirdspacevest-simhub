import { useState, useEffect, useCallback, useRef } from "react";
import {
  mordhauStart,
  mordhauStop,
  mordhauStatus,
  subscribeToDaemonEvents,
  MordhauStatus,
  DaemonEvent,
} from "../lib/bridgeApi";

export type MordhauGameEvent = {
  id: string;
  type: string;
  ts: number;
  params?: Record<string, unknown>;
};

const MAX_EVENTS = 50; // Max events to keep in history

export function useMordhauIntegration() {
  const [status, setStatus] = useState<MordhauStatus>({
    running: false,
    log_path: null,
    events_received: 0,
    last_event_ts: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<MordhauGameEvent[]>([]);
  const eventIdCounter = useRef(0);

  // Fetch status on mount and periodically
  const fetchStatus = useCallback(async () => {
    try {
      const result = await mordhauStatus();
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

  // Subscribe to daemon events for Mordhau game events
  useEffect(() => {
    const unsubscribe = subscribeToDaemonEvents((event: DaemonEvent) => {
      // Handle Mordhau-specific events
      if (event.event === "mordhau_started") {
        setStatus((prev) => ({
          ...prev,
          running: true,
          log_path: event.log_path ?? prev.log_path,
        }));
      } else if (event.event === "mordhau_stopped") {
        setStatus((prev) => ({
          ...prev,
          running: false,
        }));
      } else if (event.event === "mordhau_game_event" && event.event_type) {
        // Add game event to history
        const newEvent: MordhauGameEvent = {
          id: `mordhau-${++eventIdCounter.current}`,
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
      const result = await mordhauStart(logPath);
      if (!result.success) {
        setError(result.error || "Failed to start Mordhau integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Mordhau integration");
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mordhauStop();
      if (!result.success) {
        setError(result.error || "Failed to stop Mordhau integration");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop Mordhau integration");
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

