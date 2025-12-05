import { useState, useEffect, useCallback } from 'react';

interface ArmaReforgerStatus {
  enabled: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
}

interface ArmaReforgerGameEvent {
  event: string;
  params?: Record<string, any>;
  timestamp: number;
}

export function useArmaReforgerIntegration() {
  const [status, setStatus] = useState<ArmaReforgerStatus>({
    enabled: false,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<ArmaReforgerGameEvent[]>([]);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.armaReforgerStatus?.();
      if (result?.running !== undefined) {
        setStatus({
          enabled: result.running,
          events_received: result.events_received || 0,
          last_event_ts: result.last_event_ts || null,
          last_event_type: result.last_event_type || null,
        });
      }
    } catch (err) {
      console.error('Failed to get Arma Reforger status:', err);
    }
  }, []);

  // Enable Arma Reforger integration
  const enable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.armaReforgerStart?.();
      if (result?.success || result?.ok) {
        setStatus(prev => ({ ...prev, enabled: true }));
      } else {
        setError(result?.error || result?.message || 'Failed to enable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disable Arma Reforger integration
  const disable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.armaReforgerStop?.();
      if (result?.success || result?.ok) {
        setStatus(prev => ({ ...prev, enabled: false }));
      } else {
        setError(result?.error || result?.message || 'Failed to disable');
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
    const unsubscribe = window.vestBridge?.onDaemonEvent?.((event: { event: string; [key: string]: any; ts?: number }) => {
      // Handle Arma Reforger events
      if (event.event === 'armareforger_game_event') {
        const gameEventName = (event as any).event_type || 'unknown';
        const gameEvent: ArmaReforgerGameEvent = {
          event: gameEventName,
          params: (event as any).params,
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        setStatus(prev => ({
          ...prev,
          events_received: prev.events_received + 1,
          last_event_ts: gameEvent.timestamp,
          last_event_type: gameEventName,
        }));
      } else if (event.event === 'armareforger_started') {
        setStatus(prev => ({ ...prev, enabled: true }));
      } else if (event.event === 'armareforger_stopped') {
        setStatus(prev => ({ ...prev, enabled: false }));
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
    enable,
    disable,
    clearEvents,
    refreshStatus,
  };
}
