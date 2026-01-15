import { useCallback, useEffect, useRef, useState } from "react";
import type { DaemonEvent, ScreenHealthStatus } from "../../lib/bridgeApi";
import { subscribeToDaemonEvents } from "../../lib/bridgeApi";
import { MAX_SCREEN_HEALTH_EVENTS, ScreenHealthGameEvent } from "./types";

export function useScreenHealthDaemonEvents(opts: { setStatus: React.Dispatch<React.SetStateAction<ScreenHealthStatus>> }) {
  const { setStatus } = opts;

  const [events, setEvents] = useState<ScreenHealthGameEvent[]>([]);
  const [latestDebug, setLatestDebug] = useState<Record<string, { kind: string; ts: number; data: Record<string, unknown> }>>({});
  const eventIdCounter = useRef(0);

  // Buffer incoming daemon events to avoid freezing renderer:
  // If we call setState on every TCP event we can easily overwhelm React/Electron.
  const pendingEventsRef = useRef<ScreenHealthGameEvent[]>([]);
  const pendingLatestDebugRef = useRef<Record<string, { kind: string; ts: number; data: Record<string, unknown> }>>({});
  const pendingStatusRef = useRef<{ delta: number; last_event_ts?: number; last_hit_ts?: number }>({ delta: 0 });
  const flushTimerRef = useRef<number | null>(null);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;

      const batch = pendingEventsRef.current;
      pendingEventsRef.current = [];
      if (batch.length) {
        setEvents((prev) => {
          // newest-first
          const next = [...batch.reverse(), ...prev];
          return next.slice(0, MAX_SCREEN_HEALTH_EVENTS);
        });
      }

      const dbg = pendingLatestDebugRef.current;
      if (Object.keys(dbg).length) {
        pendingLatestDebugRef.current = {};
        setLatestDebug((prev) => ({ ...prev, ...dbg }));
      }

      const st = pendingStatusRef.current;
      pendingStatusRef.current = { delta: 0 };
      if (st.delta || st.last_event_ts != null || st.last_hit_ts != null) {
        setStatus((prev) => ({
          ...prev,
          events_received: (prev.events_received ?? 0) + (st.delta || 0),
          last_event_ts: st.last_event_ts ?? prev.last_event_ts,
          last_hit_ts: st.last_hit_ts ?? prev.last_hit_ts,
        }));
      }
    }, 100); // 10Hz flush
  }, [setStatus]);

  // Subscribe to daemon events
  useEffect(() => {
    const unsubscribe = subscribeToDaemonEvents((event: DaemonEvent) => {
      if (event.event === "screen_health_started") {
        setStatus((prev) => ({ ...prev, running: true, profile_name: event.profile_name ?? prev.profile_name }));
        return;
      }
      if (event.event === "screen_health_stopped") {
        setStatus((prev) => ({ ...prev, running: false }));
        return;
      }
      if (event.event === "screen_health_hit") {
        const roi = (event.params?.roi as string | undefined) ?? null;
        const newEvent: ScreenHealthGameEvent = {
          id: `sh-${++eventIdCounter.current}`,
          type: "hit_recorded",
          ts: event.ts * 1000,
          roi,
          direction: (event.direction as string | undefined) ?? null,
          score: typeof event.score === "number" ? event.score : undefined,
        };
        pendingEventsRef.current.push(newEvent);
        pendingStatusRef.current.delta += 1;
        pendingStatusRef.current.last_event_ts = event.ts;
        pendingStatusRef.current.last_hit_ts = event.ts;
        scheduleFlush();
        return;
      }
      if (event.event === "screen_health_health") {
        const newEvent: ScreenHealthGameEvent = {
          id: `sh-${++eventIdCounter.current}`,
          type: "health_percent",
          ts: event.ts * 1000,
          detector: (event.detector as string | undefined) ?? null,
          health_percent: typeof event.health_percent === "number" ? event.health_percent : undefined,
        };
        pendingEventsRef.current.push(newEvent);
        pendingStatusRef.current.delta += 1;
        pendingStatusRef.current.last_event_ts = event.ts;
        scheduleFlush();
        return;
      }
      if (event.event === "screen_health_value") {
        const newEvent: ScreenHealthGameEvent = {
          id: `sh-${++eventIdCounter.current}`,
          type: "health_value",
          ts: event.ts * 1000,
          detector: (event.detector as string | undefined) ?? null,
          health_value: typeof event.health_value === "number" ? event.health_value : undefined,
        };
        pendingEventsRef.current.push(newEvent);
        pendingStatusRef.current.delta += 1;
        pendingStatusRef.current.last_event_ts = event.ts;
        scheduleFlush();
        return;
      }
      if (event.event === "screen_health_debug") {
        const params = (event.params || {}) as Record<string, unknown>;
        const kind = (params.kind as string | undefined) || "debug";
        const detector = (params.detector as string | undefined) || (event.detector as string | undefined) || "(unknown)";

        const newEvent: ScreenHealthGameEvent = {
          id: `sh-${++eventIdCounter.current}`,
          type: "debug",
          ts: event.ts * 1000,
          detector,
          debug_kind: kind,
          debug: params,
        };
        pendingEventsRef.current.push(newEvent);
        pendingLatestDebugRef.current[detector] = { kind, ts: event.ts * 1000, data: params };
        pendingStatusRef.current.delta += 1;
        pendingStatusRef.current.last_event_ts = event.ts;
        scheduleFlush();
      }
    });
    return () => {
      unsubscribe();
      if (flushTimerRef.current != null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingEventsRef.current = [];
      pendingLatestDebugRef.current = {};
      pendingStatusRef.current = { delta: 0 };
    };
  }, [setStatus, scheduleFlush]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, latestDebug, clearEvents };
}

