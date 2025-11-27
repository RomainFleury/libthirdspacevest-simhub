import { useState, useEffect, useCallback } from 'react';

interface PistolWhipStatus {
  enabled: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
}

interface PistolWhipGameEvent {
  event: string;
  hand?: string;
  priority?: number;
  timestamp: number;
}

export function usePistolWhipIntegration() {
  const [status, setStatus] = useState<PistolWhipStatus>({
    enabled: true,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<PistolWhipGameEvent[]>([]);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.pistolwhipStatus?.();
      if (result?.enabled !== undefined) {
        setStatus({
          enabled: result.enabled,
          events_received: result.events_received || 0,
          last_event_ts: result.last_event_ts || null,
          last_event_type: result.last_event_type || null,
        });
      }
    } catch (err) {
      console.error('Failed to get Pistol Whip status:', err);
    }
  }, []);

  // Enable Pistol Whip integration
  const enable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.pistolwhipStart?.();
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

  // Disable Pistol Whip integration
  const disable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.pistolwhipStop?.();
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
      // Handle Pistol Whip events
      if (event.event === 'pistolwhip_game_event') {
        // event_pistolwhip_game_event uses event_type field (like SUPERHOT)
        const gameEventName = (event as any).event_type || 'unknown';  // This is "gun_fire", "melee_hit", etc.
        const gameEvent: PistolWhipGameEvent = {
          event: gameEventName,
          hand: (event as any).hand,
          priority: undefined,  // Not included in event
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        setStatus(prev => ({
          ...prev,
          events_received: prev.events_received + 1,
          last_event_ts: gameEvent.timestamp,
          last_event_type: gameEventName,
        }));
      } else if (event.event === 'pistolwhip_started') {
        setStatus(prev => ({ ...prev, enabled: true }));
      } else if (event.event === 'pistolwhip_stopped') {
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

