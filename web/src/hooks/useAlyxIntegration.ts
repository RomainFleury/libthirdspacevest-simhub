import { useState, useEffect, useCallback, useRef } from "react";
import {
  alyxStart,
  alyxStop,
  alyxStatus,
  alyxGetModInfo,
  alyxBrowseLogPath,
  alyxGetSettings,
  alyxSetSettings,
  alyxSetLogPath,
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

export type AlyxEnabledEvents = Record<string, boolean>;

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
  const [savedLogPath, setSavedLogPath] = useState<string | null>(null);
  const [enabledEvents, setEnabledEvents] = useState<AlyxEnabledEvents | null>(null);
  const [restartRequired, setRestartRequired] = useState(false);
  const eventIdCounter = useRef(0);

  // Fetch status on mount and periodically
  const fetchStatus = useCallback(async (preserveError = false) => {
    try {
      const result = await alyxStatus();
      setStatus(result);
      // Only update error from status if not preserving a previous error
      if (!preserveError) {
        setError(result.error || null);
      }
    } catch (err) {
      if (!preserveError) {
        setError(err instanceof Error ? err.message : "Failed to get status");
      }
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

  // Fetch saved settings on mount
  const fetchSettings = useCallback(async () => {
    try {
      const result = await alyxGetSettings();
      if (result.success) {
        setSavedLogPath(result.logPath || null);
        setEnabledEvents(result.enabledEvents || null);
      }
    } catch (err) {
      console.error("Failed to get Alyx settings:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchModInfo();
    fetchSettings();
    // Poll status every 5 seconds, but preserve any existing error
    const interval = setInterval(() => fetchStatus(true), 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchModInfo, fetchSettings]);

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
      console.log("[Alyx] Starting integration...", logPath);
      const result = await alyxStart(logPath);
      console.log("[Alyx] Start result:", result);
      if (!result.success) {
        const errorMsg = result.error || "Failed to start Alyx integration";
        console.error("[Alyx] Start failed:", errorMsg);
        setError(errorMsg);
        return; // Don't fetch status if failed
      }
      setRestartRequired(false);
      await fetchStatus();
    } catch (err) {
      console.error("[Alyx] Start exception:", err);
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
      // If settings were changed while running, they apply on next start.
      setRestartRequired(false);
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

  // Browse for log file
  const browseLogPath = useCallback(async () => {
    try {
      const result = await alyxBrowseLogPath();
      if (result.success && result.path) {
        setSavedLogPath(result.path);
        setError(null);
        return result.path;
      }
      return null;
    } catch (err) {
      console.error("Failed to browse for log path:", err);
      return null;
    }
  }, []);

  // Set log path manually
  const setLogPath = useCallback(async (logPath: string | null) => {
    try {
      const result = await alyxSetLogPath(logPath);
      if (result.success) {
        setSavedLogPath(logPath);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to set log path:", err);
    }
  }, []);

  const setEventEnabled = useCallback(async (eventType: string, enabled: boolean) => {
    const prev = enabledEvents || {};
    const next: AlyxEnabledEvents = { ...prev, [eventType]: enabled };
    setEnabledEvents(next);
    try {
      const result = await alyxSetSettings({ enabledEvents: next });
      if (!result.success) {
        setError(result.error || "Failed to save Alyx settings");
      } else {
        setError(null);
        // Changes apply on next Start.
        if (status.running) setRestartRequired(true);
      }
    } catch (err) {
      console.error("Failed to save Alyx settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save Alyx settings");
    }
  }, [enabledEvents, status.running]);

  return {
    status,
    loading,
    error,
    gameEvents,
    modInfo,
    savedLogPath,
    enabledEvents,
    restartRequired,
    start,
    stop,
    clearEvents,
    browseLogPath,
    setLogPath,
    setEventEnabled,
    refresh: fetchStatus,
  };
}

