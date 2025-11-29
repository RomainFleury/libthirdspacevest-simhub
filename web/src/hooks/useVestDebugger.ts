import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
import { playEffectSound, getPlaySoundPreference, playMp3Sound, playSound } from "../utils/sound";
import { useMultiVest } from "./useMultiVest";

const FALLBACK_STATUS: VestStatus = {
  connected: false,
  last_error: "Bridge offline – running in demo mode",
};

/**
 * Format a daemon event for display in the log panel.
 * Returns the formatted message and extracts device info.
 */
function formatDaemonEvent(event: DaemonEvent): { message: string; device_id?: string; player_num?: number; game_id?: string } {
  const device_id = (event as any).device_id;
  const player_num = (event as any).player_num;
  const game_id = (event as any).game_id;

  let message = "";
  let context = "";

  // Build context string for device info
  if (game_id && player_num !== undefined) {
    context = ` [${game_id} - Player ${player_num}]`;
  } else if (device_id) {
    const deviceShortId = device_id.slice(-6);
    context = ` [Device ${deviceShortId}]`;
  }

  switch (event.event) {
    case "effect_triggered":
      message = `🎯 Effect triggered: cell ${event.cell}, speed ${event.speed}${context}`;
      break;
    case "all_stopped":
      message = `⏹️ All effects stopped${context}`;
      break;
    case "connected":
      message = `🔌 Connected to vest${event.device?.serial_number ? ` (${event.device.serial_number})` : ""}${context}`;
      break;
    case "disconnected":
      message = `🔌 Disconnected from vest${context}`;
      break;
    case "device_connected":
      message = `🔌 Device connected${event.device?.serial_number ? ` (${event.device.serial_number})` : ""}${context}`;
      break;
    case "device_disconnected":
      message = `🔌 Device disconnected${context}`;
      break;
    case "device_selected":
      message = `📱 Device selected: bus ${event.device?.bus}, addr ${event.device?.address}${context}`;
      break;
    case "device_cleared":
      message = "📱 Device selection cleared";
      break;
    case "main_device_changed":
      message = `📱 Main device changed${context}`;
      break;
    case "game_player_mapping_changed":
      message = `🎮 Game mapping changed: ${game_id || "unknown"} - Player ${player_num || "?"}${context}`;
      break;
    case "client_connected":
      message = `👤 Client connected: ${event.client_id}`;
      break;
    case "client_disconnected":
      message = `👤 Client disconnected: ${event.client_id}`;
      break;
    case "error":
      message = `❌ Error: ${event.message}${context}`;
      break;
    default:
      message = `📡 ${event.event}${context}`;
  }

  return {
    message,
    device_id,
    player_num,
    game_id,
  };
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
  const { mainDeviceId } = useMultiVest();
  
  // Track last processed event to prevent duplicate sound plays
  const lastEventRef = useRef<{ ts: number; cell?: number; device_id?: string } | null>(null);

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
    (message: string, level: LogEntry["level"] = "info", metadata?: { device_id?: string; player_num?: number; game_id?: string }) => {
      setLogs((prev) => {
        const newLog = {
          id: crypto.randomUUID(),
          message,
          level,
          ts: Date.now(),
          device_id: metadata?.device_id,
          player_num: metadata?.player_num,
          game_id: metadata?.game_id,
        };
        // Keep only the last 200 logs for performance
        const updated = [newLog, ...prev];
        return updated.slice(0, 200);
      });
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
              // Front cells: Upper Left (2), Upper Right (5), Lower Left (3), Lower Right (4)
              cellsToTrigger.push(2, 5, 3, 4);
              break;
            case "back":
              // Back cells: Upper Left (1), Upper Right (6), Lower Left (0), Lower Right (7)
              cellsToTrigger.push(1, 6, 0, 7);
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

  const sendCustomCommand = useCallback(
    async (cell: number, speed: number) => {
      setLoading(true);
      try {
        await triggerEffect({ label: `Custom Cell ${cell}`, cell, speed });
      } catch (error) {
        pushLog(
          error instanceof Error ? error.message : "Failed to send custom command",
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [pushLog]
  );

  // Subscribe to daemon events
  useEffect(() => {
    let unsubscribeEvents: (() => void) | undefined;
    let unsubscribeStatus: (() => void) | undefined;

    try {
      // Subscribe to daemon events
      unsubscribeEvents = subscribeToDaemonEvents((event) => {
        const formatted = formatDaemonEvent(event);
        const level = isErrorEvent(event) ? "error" : "info";
        pushLog(formatted.message, level, {
          device_id: formatted.device_id,
          player_num: formatted.player_num,
          game_id: formatted.game_id,
        });

        // Update status on connection events
        if (event.event === "connected" || event.event === "disconnected") {
          refreshStatus();
        }

        // Flash cell on effect triggered
        if (event.event === "effect_triggered" && event.cell !== undefined) {
          flashCell(event.cell);
          
          // Play sound if enabled and effect is on main device
          // Use event timestamp and cell to prevent duplicate plays
          const device_id = (event as any).device_id;
          const eventKey = `${event.ts}_${event.cell}_${device_id || 'none'}`;
          const lastKey = lastEventRef.current 
            ? `${lastEventRef.current.ts}_${lastEventRef.current.cell}_${lastEventRef.current.device_id || 'none'}`
            : null;
          
          // Only play sound if this is a new event (not a duplicate)
          if (eventKey !== lastKey && getPlaySoundPreference() && device_id === mainDeviceId) {
            lastEventRef.current = { ts: event.ts, cell: event.cell, device_id };
            playSound("mp3");
          }
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
  }, [pushLog, refreshStatus, flashCell, mainDeviceId]);

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
      sendCustomCommand,
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
      sendCustomCommand,
      haltAll,
    ]
  );

  return derived;
}
