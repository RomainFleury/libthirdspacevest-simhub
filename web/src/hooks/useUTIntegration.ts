import { useState, useEffect, useCallback } from 'react';

interface UTStatus {
  running: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
  log_path: string | null;
}

interface UTGameEvent {
  event: string;
  params?: {
    health?: number;
    damage?: number;
    attacker?: string;
    direction?: number;
    weapon?: string;
    killer?: string;
    headshot?: boolean;
    hand?: string;
    team?: string;
    count?: number;
    amount?: number;
    type?: string;
  };
  timestamp: number;
}

export function useUTIntegration() {
  const [status, setStatus] = useState<UTStatus>({
    running: false,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
    log_path: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<UTGameEvent[]>([]);
  const [logPath, setLogPath] = useState<string>('');

  // Load saved settings
  const loadSettings = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.utGetSettings?.();
      if (result?.success) {
        if (result.logPath) {
          setLogPath(result.logPath);
        }
      }
    } catch (err) {
      console.error('Failed to load UT settings:', err);
    }
  }, []);

  // Save log path
  const saveLogPath = useCallback(async (path: string | null) => {
    try {
      // @ts-ignore - window.vestBridge
      await window.vestBridge?.utSetLogPath?.(path);
      setLogPath(path || '');
    } catch (err) {
      console.error('Failed to save log path:', err);
    }
  }, []);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.utStatus?.();
      if (result?.success) {
        setStatus({
          running: result.running || false,
          events_received: result.events_received || 0,
          last_event_ts: result.last_event_ts || null,
          last_event_type: result.last_event_type || null,
          log_path: result.log_path || null,
        });
        if (result.log_path && !logPath) {
          setLogPath(result.log_path);
        }
      } else {
        setError(result?.error || 'Failed to get status');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to get status');
    } finally {
      setIsLoading(false);
    }
  }, [logPath]);

  // Start integration
  const start = useCallback(async (customLogPath?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const path = customLogPath || logPath || undefined;
      
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.utStart?.(path);
      if (result?.success) {
        await refreshStatus();
        if (result.log_path) {
          await saveLogPath(result.log_path);
        }
      } else {
        setError(result?.error || 'Failed to start integration');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start integration');
    } finally {
      setIsLoading(false);
    }
  }, [logPath, refreshStatus, saveLogPath]);

  // Stop integration
  const stop = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.utStop?.();
      if (result?.success) {
        await refreshStatus();
      } else {
        setError(result?.error || 'Failed to stop integration');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to stop integration');
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Browse for log path
  const browseLogPath = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.utBrowseLogPath?.();
      if (result?.success && result.logPath) {
        await saveLogPath(result.logPath);
      }
    } catch (err) {
      console.error('Failed to browse log path:', err);
    }
  }, [saveLogPath]);

  // Clear events
  const clearEvents = useCallback(() => {
    setGameEvents([]);
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    refreshStatus();
  }, [loadSettings, refreshStatus]);

  // Subscribe to daemon events
  useEffect(() => {
    // @ts-ignore - window.vestBridge
    const bridge = window.vestBridge;
    if (!bridge) return;

    const handleUTEvent = (event: any) => {
      if (event.event === 'ut_game_event') {
        const gameEvent: UTGameEvent = {
          event: event.event_type || 'unknown',
          params: event.params,
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        refreshStatus();
      } else if (event.event === 'ut_started') {
        refreshStatus();
      } else if (event.event === 'ut_stopped') {
        refreshStatus();
      }
    };

    // Use onDaemonEvent to subscribe to daemon events
    const unsubscribe = bridge.onDaemonEvent?.(handleUTEvent);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshStatus]);

  return {
    status,
    isLoading,
    error,
    gameEvents,
    logPath,
    setLogPath: saveLogPath,
    refreshStatus,
    start,
    stop,
    clearEvents,
    browseLogPath,
  };
}
