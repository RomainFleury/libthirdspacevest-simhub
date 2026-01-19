import { useEffect, useState, useCallback } from "react";
import { useScreenHealthDaemonEvents } from "./screenHealth/useScreenHealthDaemonEvents";
import { useScreenHealthDaemonStatus } from "./screenHealth/useScreenHealthDaemonStatus";
import { useScreenHealthProfiles, type UnifiedProfile } from "./screenHealth/useScreenHealthProfiles";
import { screenHealthStart } from "../lib/bridgeApi";
export type { ScreenHealthGameEvent } from "./screenHealth/types";

export function useScreenHealthIntegration() {
  const daemon = useScreenHealthDaemonStatus();
  const events = useScreenHealthDaemonEvents({ setStatus: daemon.setStatus });
  const profiles = useScreenHealthProfiles();

  useEffect(() => {
    daemon.refreshStatus();

    const interval = setInterval(daemon.refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [daemon.refreshStatus]);

  const start = useCallback(async (selectedProfileId: string | null) => {
    if (!selectedProfileId) {
      daemon.setError("Please select a profile");
      return;
    }

    const profile = profiles.profiles.find((p) => p.id === selectedProfileId);
    if (!profile) {
      daemon.setError("Selected profile not found");
      return;
    }

    // Use startWithProfile which manages loading state internally
    await daemon.startWithProfile(profile.profile);
  }, [profiles.profiles, daemon]);

  return {
    status: daemon.status,
    loading: daemon.loading,
    error: daemon.error,

    events: events.events,
    latestDebug: events.latestDebug,
    clearEvents: events.clearEvents,

    profiles: profiles.profiles,
    start,
    stop: daemon.stop,
    refreshStatus: daemon.refreshStatus,
  };
}

