import { useEffect } from "react";
import { useScreenHealthDaemonEvents } from "./screenHealth/useScreenHealthDaemonEvents";
import { useScreenHealthDaemonStatus } from "./screenHealth/useScreenHealthDaemonStatus";
export type { ScreenHealthGameEvent } from "./screenHealth/types";

export function useScreenHealthIntegration() {
  const daemon = useScreenHealthDaemonStatus();
  const events = useScreenHealthDaemonEvents({ setStatus: daemon.setStatus });

  useEffect(() => {
    daemon.refreshStatus();

    const interval = setInterval(daemon.refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [daemon.refreshStatus]);

  return {
    status: daemon.status,
    loading: daemon.loading,
    error: daemon.error,

    events: events.events,
    latestDebug: events.latestDebug,
    clearEvents: events.clearEvents,

    start: daemon.start,
    stop: daemon.stop,
    refreshStatus: daemon.refreshStatus,
  };
}

