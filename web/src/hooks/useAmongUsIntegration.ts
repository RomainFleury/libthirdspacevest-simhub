import { useState, useEffect, useCallback } from 'react';

interface AmongUsStatus {
  enabled: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
}

interface AmongUsGameEvent {
  event_type: string;
  timestamp: number;
}

export function useAmongUsIntegration() {
  const [status, setStatus] = useState<AmongUsStatus>({
    enabled: true,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<AmongUsGameEvent[]>([]);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.amongusStatus?.();
      if (result?.running !== undefined) {
        setStatus({
          enabled: result.running,
          events_received: result.events_received || 0,
          last_event_ts: result.last_event_ts || null,
          last_event_type: result.last_event_type || null,
        });
      }
    } catch (err) {
      console.error('Failed to get Among Us status:', err);
    }
  }, []);

  // Enable Among Us integration
  const enable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.amongusStart?.();
      if (result?.ok) {
        setStatus(prev => ({ ...prev, enabled: true }));
      } else {
        setError(result?.message || 'Failed to enable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disable Among Us integration
  const disable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.amongusStop?.();
      if (result?.ok) {
        setStatus(prev => ({ ...prev, enabled: false }));
      } else {
        setError(result?.message || 'Failed to disable');
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
    const unsubscribe = window.vestBridge?.onDaemonEvent?.((event: { event: string; event_type?: string; ts?: number }) => {
      // Handle Among Us events
      if (event.event === 'amongus_game_event') {
        const gameEvent: AmongUsGameEvent = {
          event_type: event.event_type || 'unknown',
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        setStatus(prev => ({
          ...prev,
          events_received: prev.events_received + 1,
          last_event_ts: gameEvent.timestamp,
          last_event_type: gameEvent.event_type,
        }));
      } else if (event.event === 'amongus_started') {
        setStatus(prev => ({ ...prev, enabled: true }));
      } else if (event.event === 'amongus_stopped') {
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
