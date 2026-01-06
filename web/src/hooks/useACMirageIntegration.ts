import { useState, useEffect, useCallback } from 'react';

interface ACMirageStatus {
  running: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
  log_path: string | null;
}

interface ACMirageGameEvent {
  event_type: string;
  damage?: number;
  direction?: string;
  timestamp: number;
}

export function useACMirageIntegration() {
  const [status, setStatus] = useState<ACMirageStatus>({
    running: false,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
    log_path: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<ACMirageGameEvent[]>([]);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.acmirageStatus?.();
      if (result) {
        setStatus({
          running: result.running ?? false,
          events_received: result.events_received ?? 0,
          last_event_ts: result.last_event_ts ?? null,
          last_event_type: result.last_event_type ?? null,
          log_path: result.log_path ?? null,
        });
      }
    } catch (err) {
      console.error('Failed to get AC Mirage status:', err);
    }
  }, []);

  // Start AC Mirage integration
  const start = useCallback(async (logPath?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.acmirageStart?.(logPath);
      if (result?.success) {
        setStatus(prev => ({ 
          ...prev, 
          running: true, 
          log_path: result.log_path ?? null 
        }));
      } else {
        setError(result?.error || 'Failed to start');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop AC Mirage integration
  const stop = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.acmirageStop?.();
      if (result?.success) {
        setStatus(prev => ({ ...prev, running: false }));
      } else {
        setError(result?.error || 'Failed to stop');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear game events log
  const clearEvents = useCallback(() => {
    setGameEvents([]);
  }, []);

  // Subscribe to daemon events
  useEffect(() => {
    // @ts-ignore - window.vestBridge
    const unsubscribe = window.vestBridge?.onDaemonEvent?.((event: { 
      event: string; 
      event_type?: string; 
      params?: { 
        event_type?: string;
        damage?: number;
        direction?: string;
      };
      ts?: number 
    }) => {
      // Handle AC Mirage events
      if (event.event === 'acmirage_game_event') {
        const gameEvent: ACMirageGameEvent = {
          event_type: event.params?.event_type || event.event_type || 'unknown',
          damage: event.params?.damage,
          direction: event.params?.direction,
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        setStatus(prev => ({
          ...prev,
          events_received: prev.events_received + 1,
          last_event_ts: gameEvent.timestamp,
          last_event_type: gameEvent.event_type,
        }));
      } else if (event.event === 'acmirage_started') {
        setStatus(prev => ({ ...prev, running: true }));
      } else if (event.event === 'acmirage_stopped') {
        setStatus(prev => ({ ...prev, running: false }));
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Initial status fetch
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    isLoading,
    error,
    gameEvents,
    start,
    stop,
    clearEvents,
    refreshStatus,
  };
}
