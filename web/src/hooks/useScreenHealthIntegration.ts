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
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    daemon.refreshStatus();

    const interval = setInterval(daemon.refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [daemon.refreshStatus]);

  // Auto-select first profile if none selected and profiles are loaded
  useEffect(() => {
    if (selectedProfileId === null && profiles.profiles.length > 0) {
      setSelectedProfileId(profiles.profiles[0].id);
    }
  }, [selectedProfileId, profiles.profiles]);

  const start = useCallback(async () => {
    if (!selectedProfileId) {
      daemon.setError("Please select a profile");
      return;
    }

    const profile = profiles.profiles.find((p) => p.id === selectedProfileId);
    if (!profile) {
      daemon.setError("Selected profile not found");
      return;
    }

    daemon.setLoading(true);
    daemon.setError(null);
    try {
      const result = await screenHealthStart(profile.profile);
      if (!result.success) {
        daemon.setError(result.error || "Failed to start");
      } else {
        await daemon.refreshStatus();
      }
    } catch (e) {
      daemon.setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      daemon.setLoading(false);
    }
  }, [selectedProfileId, profiles.profiles, daemon]);

  return {
    status: daemon.status,
    loading: daemon.loading,
    error: daemon.error,

    events: events.events,
    latestDebug: events.latestDebug,
    clearEvents: events.clearEvents,

    profiles: profiles.profiles,
    selectedProfileId,
    setSelectedProfileId,
    start,
    stop: daemon.stop,
    refreshStatus: daemon.refreshStatus,
  };
}

