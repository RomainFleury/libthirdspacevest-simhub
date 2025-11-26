import { useState, useEffect, useCallback } from 'react';
import { onDaemonEvent } from '../lib/bridgeApi';

interface SuperHotStatus {
  enabled: boolean;
  events_received: number;
  last_event_ts: number | null;
}

interface SuperHotGameEvent {
  event_type: string;
  hand?: string;
  timestamp: number;
}

export function useSuperHotIntegration() {
  const [status, setStatus] = useState<SuperHotStatus>({
    enabled: true,
    events_received: 0,
    last_event_ts: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<SuperHotGameEvent[]>([]);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.superhotStatus?.();
      if (result?.running !== undefined) {
        setStatus({
          enabled: result.running,
          events_received: result.events_received || 0,
          last_event_ts: result.last_event_ts || null,
        });
      }
    } catch (err) {
      console.error('Failed to get SuperHot status:', err);
    }
  }, []);

  // Enable SuperHot integration
  const enable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.superhotStart?.();
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

  // Disable SuperHot integration
  const disable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.superhotStop?.();
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
    const unsubscribe = onDaemonEvent((event) => {
      // Handle SuperHot events
      if (event.event === 'superhot_game_event') {
        const gameEvent: SuperHotGameEvent = {
          event_type: event.event_type || 'unknown',
          hand: event.hand,
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        setStatus(prev => ({
          ...prev,
          events_received: prev.events_received + 1,
          last_event_ts: gameEvent.timestamp,
        }));
      } else if (event.event === 'superhot_started') {
        setStatus(prev => ({ ...prev, enabled: true }));
      } else if (event.event === 'superhot_stopped') {
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

