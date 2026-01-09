import { useCallback, useEffect, useRef, useState } from "react";
import type { DaemonEvent, ScreenHealthStatus } from "../../lib/bridgeApi";
import { subscribeToDaemonEvents } from "../../lib/bridgeApi";
import { MAX_SCREEN_HEALTH_EVENTS, ScreenHealthGameEvent } from "./types";

export function useScreenHealthDaemonEvents(opts: { setStatus: React.Dispatch<React.SetStateAction<ScreenHealthStatus>> }) {
  const { setStatus } = opts;

  const [events, setEvents] = useState<ScreenHealthGameEvent[]>([]);
  const eventIdCounter = useRef(0);

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
        setEvents((prev) => [newEvent, ...prev].slice(0, MAX_SCREEN_HEALTH_EVENTS));
        setStatus((prev) => ({
          ...prev,
          events_received: (prev.events_received ?? 0) + 1,
          last_event_ts: event.ts,
          last_hit_ts: event.ts,
        }));
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
        setEvents((prev) => [newEvent, ...prev].slice(0, MAX_SCREEN_HEALTH_EVENTS));
        setStatus((prev) => ({
          ...prev,
          events_received: (prev.events_received ?? 0) + 1,
          last_event_ts: event.ts,
        }));
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
        setEvents((prev) => [newEvent, ...prev].slice(0, MAX_SCREEN_HEALTH_EVENTS));
        setStatus((prev) => ({
          ...prev,
          events_received: (prev.events_received ?? 0) + 1,
          last_event_ts: event.ts,
        }));
      }
    });
    return unsubscribe;
  }, [setStatus]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, clearEvents };
}

