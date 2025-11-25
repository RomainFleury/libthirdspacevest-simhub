import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchEffects,
  fetchStatus,
  stopAll,
  triggerEffect,
  subscribeToDaemonEvents,
  subscribeToDaemonStatus,
  DaemonEvent,
} from "../lib/bridgeApi";
import {
  actuatorEffects,
  combinedEffects,
  defaultEffects,
} from "../data/effects";
import { LogEntry, VestEffect, VestStatus } from "../types";

const FALLBACK_STATUS: VestStatus = {
  connected: false,
  last_error: "Bridge offline – running in demo mode",
};

/**
 * Format a daemon event for display in the log panel.
 */
function formatDaemonEvent(event: DaemonEvent): string {
  switch (event.event) {
    case "effect_triggered":
      return `🎯 Effect triggered: cell ${event.cell}, speed ${event.speed}`;
    case "all_stopped":
      return "⏹️ All effects stopped";
    case "connected":
      return `🔌 Connected to vest${event.device?.serial_number ? ` (${event.device.serial_number})` : ""}`;
    case "disconnected":
      return "🔌 Disconnected from vest";
    case "device_selected":
      return `📱 Device selected: bus ${event.device?.bus}, addr ${event.device?.address}`;
    case "device_cleared":
      return "📱 Device selection cleared";
    case "client_connected":
      return `👤 Client connected: ${event.client_id}`;
    case "client_disconnected":
      return `👤 Client disconnected: ${event.client_id}`;
    case "error":
      return `❌ Error: ${event.message}`;
    default:
      return `📡 ${event.event}`;
  }
}

/**
 * Determine if an event is an error.
 */
function isErrorEvent(event: DaemonEvent): boolean {
  return event.event === "error";
}

export function useVestDebugger() {
  const [status, setStatus] = useState<VestStatus>(FALLBACK_STATUS);
  const [effects, setEffects] = useState<VestEffect[]>(defaultEffects);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [daemonConnected, setDaemonConnected] = useState(false);
  const [activeCells, setActiveCells] = useState<Set<number>>(new Set());

  // Track active cells with auto-clear after animation
  const flashCell = useCallback((cell: number) => {
    setActiveCells((prev) => new Set(prev).add(cell));
    // Clear after animation duration
    setTimeout(() => {
      setActiveCells((prev) => {
        const next = new Set(prev);
        next.delete(cell);
        return next;
      });
    }, 400); // 400ms flash duration
  }, []);

  const pushLog = useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      setLogs((prev) => [
        {
          id: crypto.randomUUID(),
          message,
          level,
          ts: Date.now(),
        },
        ...prev,
      ]);
    },
    []
  );

  const refreshStatus = useCallback(async () => {
    try {
      const next = await fetchStatus();
      setStatus(next);
      pushLog(next.connected ? "Vest connected" : "Vest disconnected");
    } catch (error) {
      setStatus(FALLBACK_STATUS);
      pushLog(
        error instanceof Error ? error.message : "Failed to reach bridge",
        "error"
      );
    }
  }, [pushLog]);

  const refreshEffects = useCallback(async () => {
    try {
      const next = await fetchEffects();
      setEffects(next.length ? next : defaultEffects);
    } catch {
      setEffects(defaultEffects);
    }
  }, []);

  const sendEffect = useCallback(
    async (effect: VestEffect) => {
      setLoading(true);
      try {
        // Handle preset effects that trigger multiple cells
        if (effect.preset) {
          const cellsToTrigger: number[] = [];
          switch (effect.preset) {
            case "front":
              cellsToTrigger.push(0, 1, 2, 3);
              break;
            case "back":
              cellsToTrigger.push(4, 5, 6, 7);
              break;
            case "all":
              cellsToTrigger.push(0, 1, 2, 3, 4, 5, 6, 7);
              break;
          }
          // Trigger all cells in the preset
          for (const cell of cellsToTrigger) {
            await triggerEffect({ ...effect, cell });
          }
        } else {
          // Single cell trigger
          await triggerEffect(effect);
        }
        // Note: The log will come from the daemon event, not here
      } catch (error) {
        pushLog(
          error instanceof Error ? error.message : "Failed to trigger effect",
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [pushLog]
  );

  const haltAll = useCallback(async () => {
    setLoading(true);
    try {
      await stopAll();
      // Note: The log will come from the daemon event, not here
      // pushLog("Stop all command sent");
    } catch (error) {
      pushLog(
        error instanceof Error ? error.message : "Failed to stop all",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [pushLog]);

  // Subscribe to daemon events
  useEffect(() => {
    let unsubscribeEvents: (() => void) | undefined;
    let unsubscribeStatus: (() => void) | undefined;

    try {
      // Subscribe to daemon events
      unsubscribeEvents = subscribeToDaemonEvents((event) => {
        const message = formatDaemonEvent(event);
        const level = isErrorEvent(event) ? "error" : "info";
        pushLog(message, level);

        // Update status on connection events
        if (event.event === "connected" || event.event === "disconnected") {
          refreshStatus();
        }

        // Flash cell on effect triggered
        if (event.event === "effect_triggered" && event.cell !== undefined) {
          flashCell(event.cell);
        }
      });

      // Subscribe to daemon connection status
      unsubscribeStatus = subscribeToDaemonStatus((status) => {
        setDaemonConnected(status.connected);
        if (status.connected) {
          pushLog("🟢 Connected to daemon");
        } else {
          pushLog("🔴 Disconnected from daemon", "error");
        }
      });

      // Mark daemon as initially connected (we subscribed successfully)
      setDaemonConnected(true);
    } catch (error) {
      // Bridge not available (running outside Electron)
      console.warn("Daemon event subscription not available:", error);
    }

    return () => {
      unsubscribeEvents?.();
      unsubscribeStatus?.();
    };
  }, [pushLog, refreshStatus, flashCell]);

  // Initial fetch
  useEffect(() => {
    refreshStatus();
    refreshEffects();
  }, [refreshStatus, refreshEffects]);

  // Separate actuators from combined effects
  // Actuators are cells 0-7, combined effects have negative cell values (presets)
  const actuators = useMemo(
    () =>
      effects.filter((e) => e.cell >= 0 && e.cell <= 7).length >= 8
        ? effects.filter((e) => e.cell >= 0 && e.cell <= 7)
        : actuatorEffects,
    [effects]
  );
  const combined = useMemo(
    () =>
      effects.filter((e) => e.cell < 0 || e.preset).length
        ? effects.filter((e) => e.cell < 0 || e.preset)
        : combinedEffects,
    [effects]
  );

  const derived = useMemo(
    () => ({
      status,
      actuators,
      combined,
      logs,
      loading,
      daemonConnected,
      activeCells,
      refreshStatus,
      sendEffect,
      haltAll,
    }),
    [
      status,
      actuators,
      combined,
      logs,
      loading,
      daemonConnected,
      activeCells,
      refreshStatus,
      sendEffect,
      haltAll,
    ]
  );

  return derived;
}
