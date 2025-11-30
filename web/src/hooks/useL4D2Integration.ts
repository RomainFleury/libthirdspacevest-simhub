import { useState, useEffect, useCallback } from 'react';

interface L4D2Status {
  running: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
  log_path: string | null;
}

interface L4D2GameEvent {
  event: string;
  params?: {
    victim?: string;
    attacker?: string;
    damage?: number;
    angle?: number;
    damage_type?: string;
    weapon?: string;
    player?: string;
    infected?: string;
    item?: string;
    amount?: number;
    killer?: string;
  };
  timestamp: number;
}

export function useL4D2Integration() {
  const [status, setStatus] = useState<L4D2Status>({
    running: false,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
    log_path: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<L4D2GameEvent[]>([]);
  const [logPath, setLogPath] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  // Load saved settings
  const loadSettings = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.l4d2GetSettings?.();
      if (result?.success) {
        if (result.logPath) {
          setLogPath(result.logPath);
        }
        if (result.playerName) {
          setPlayerName(result.playerName);
        }
      }
    } catch (err) {
      console.error('Failed to load L4D2 settings:', err);
    }
  }, []);

  // Save log path
  const saveLogPath = useCallback(async (path: string | null) => {
    try {
      // @ts-ignore - window.vestBridge
      await window.vestBridge?.l4d2SetLogPath?.(path);
      setLogPath(path || '');
    } catch (err) {
      console.error('Failed to save log path:', err);
    }
  }, []);

  // Save player name
  const savePlayerName = useCallback(async (name: string | null) => {
    try {
      // @ts-ignore - window.vestBridge
      await window.vestBridge?.l4d2SetPlayerName?.(name);
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
      const result = await window.vestBridge?.l4d2Status?.();
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
      const result = await window.vestBridge?.l4d2Start?.(path, name);
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
      const result = await window.vestBridge?.l4d2Stop?.();
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
      const result = await window.vestBridge?.l4d2BrowseLogPath?.();
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

    const handleL4D2Event = (event: any) => {
      if (event.event === 'l4d2_game_event') {
        const gameEvent: L4D2GameEvent = {
          event: event.event_type || 'unknown',
          params: event.params,
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        refreshStatus();
      } else if (event.event === 'l4d2_started') {
        refreshStatus();
      } else if (event.event === 'l4d2_stopped') {
        refreshStatus();
      }
    };

    bridge.on?.('daemon_event', handleL4D2Event);

    return () => {
      bridge.off?.('daemon_event', handleL4D2Event);
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

