import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchEffects, fetchStatus, stopAll, triggerEffect } from "../lib/bridgeApi";
import { defaultEffects } from "../data/effects";
import { LogEntry, VestEffect, VestStatus } from "../types";

const FALLBACK_STATUS: VestStatus = {
  connected: false,
  last_error: "Bridge offline – running in demo mode",
};

export function useVestDebugger() {
  const [status, setStatus] = useState<VestStatus>(FALLBACK_STATUS);
  const [effects, setEffects] = useState<VestEffect[]>(defaultEffects);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const pushLog = useCallback((message: string, level: LogEntry["level"] = "info") => {
    setLogs((prev) => [
      {
        id: crypto.randomUUID(),
        message,
        level,
        ts: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await fetchStatus();
      setStatus(next);
      pushLog(next.connected ? "Vest connected" : "Vest disconnected");
    } catch (error) {
      setStatus(FALLBACK_STATUS);
      pushLog(
        error instanceof Error ? error.message : "Failed to reach bridge",
        "error",
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
        await triggerEffect(effect);
        pushLog(`Effect "${effect.label}" fired`);
      } catch (error) {
        pushLog(
          error instanceof Error ? error.message : "Failed to trigger effect",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    [pushLog],
  );

  const haltAll = useCallback(async () => {
    setLoading(true);
    try {
      await stopAll();
      pushLog("Stop all command sent");
    } catch (error) {
      pushLog(
        error instanceof Error ? error.message : "Failed to stop all",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [pushLog]);

  useEffect(() => {
    refreshStatus();
    refreshEffects();
  }, [refreshStatus, refreshEffects]);

  const derived = useMemo(
    () => ({
      status,
      effects,
      logs,
      loading,
      refreshStatus,
      sendEffect,
      haltAll,
    }),
    [status, effects, logs, loading, refreshStatus, sendEffect, haltAll],
  );

  return derived;
}

