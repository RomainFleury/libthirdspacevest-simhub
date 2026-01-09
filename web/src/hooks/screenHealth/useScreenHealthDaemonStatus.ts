import { useCallback, useState } from "react";
import { ScreenHealthStatus, screenHealthStart, screenHealthStatus, screenHealthStop } from "../../lib/bridgeApi";

export function useScreenHealthDaemonStatus() {
  const [status, setStatus] = useState<ScreenHealthStatus>({ running: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const s = await screenHealthStatus();
    setStatus(s);
    setError(s.error || null);
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await screenHealthStart();
      if (!result.success) setError(result.error || "Failed to start");
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const stop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await screenHealthStop();
      if (!result.success) setError(result.error || "Failed to stop");
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  return { status, setStatus, loading, error, setError, refreshStatus, start, stop };
}

