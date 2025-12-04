import { useState, useEffect, useCallback } from 'react';

interface HL2DMStatus {
  running: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
  log_path: string | null;
}

interface HL2DMGameEvent {
  event: string;
  params?: {
    victim?: string;
    attacker?: string;
    damage?: number;
    weapon?: string;
    player?: string;
  };
  timestamp: number;
}

export function useHL2DMIntegration() {
  const [status, setStatus] = useState<HL2DMStatus>({
    running: false,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
    log_path: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<HL2DMGameEvent[]>([]);
  const [logPath, setLogPath] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  // Load saved settings
  const loadSettings = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.hl2dmGetSettings?.();
      if (result?.success) {
        if (result.logPath) {
          setLogPath(result.logPath);
        }
        if (result.playerName) {
          setPlayerName(result.playerName);
        }
      }
    } catch (err) {
      console.error('Failed to load HL2DM settings:', err);
    }
  }, []);

  // Save log path
  const saveLogPath = useCallback(async (path: string | null) => {
    try {
      // @ts-ignore - window.vestBridge
      await window.vestBridge?.hl2dmSetLogPath?.(path);
      setLogPath(path || '');
    } catch (err) {
      console.error('Failed to save log path:', err);
    }
  }, []);

  // Save player name
  const savePlayerName = useCallback(async (name: string | null) => {
    try {
      // @ts-ignore - window.vestBridge
      await window.vestBridge?.hl2dmSetPlayerName?.(name);
      setPlayerName(name || '');
    } catch (err) {
      console.error('Failed to save player name:', err);
    }
  }, []);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.hl2dmStatus?.();
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
  const start = useCallback(async (customLogPath?: string, customPlayerName?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const path = customLogPath || logPath || undefined;
      const name = customPlayerName || playerName || undefined;
      
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.hl2dmStart?.(path, name);
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
  }, [logPath, playerName, refreshStatus, saveLogPath]);

  // Stop integration
  const stop = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.hl2dmStop?.();
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
      const result = await window.vestBridge?.hl2dmBrowseLogPath?.();
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

    const handleHL2DMEvent = (event: any) => {
      if (event.event === 'hl2dm_game_event') {
        const gameEvent: HL2DMGameEvent = {
          event: event.event_type || 'unknown',
          params: event.params,
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        refreshStatus();
      } else if (event.event === 'hl2dm_started') {
        refreshStatus();
      } else if (event.event === 'hl2dm_stopped') {
        refreshStatus();
      }
    };

    // Use onDaemonEvent to subscribe to daemon events
    const unsubscribe = bridge.onDaemonEvent?.(handleHL2DMEvent);

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
    playerName,
    setPlayerName: savePlayerName,
    refreshStatus,
    start,
    stop,
    clearEvents,
    browseLogPath,
  };
}
