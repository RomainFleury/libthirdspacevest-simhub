import { useState, useEffect, useCallback } from 'react';

interface StarCitizenStatus {
  enabled: boolean;
  events_received: number;
  last_event_ts: number | null;
  last_event_type: string | null;
  log_path: string | null;
}

interface StarCitizenGameEvent {
  event: string;
  params?: {
    victim_name?: string;
    killer_name?: string;
    weapon?: string;
    ship?: string;
    damage_type?: string;
    direction?: { x: number; y: number; z: number };
    is_npc?: boolean;
    is_suicide?: boolean;
  };
  timestamp: number;
}

export function useStarCitizenIntegration() {
  const [status, setStatus] = useState<StarCitizenStatus>({
    enabled: false,
    events_received: 0,
    last_event_ts: null,
    last_event_type: null,
    log_path: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameEvents, setGameEvents] = useState<StarCitizenGameEvent[]>([]);

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.starcitizenStatus?.();
      if (result?.enabled !== undefined) {
        setStatus({
          enabled: result.enabled,
          events_received: result.events_received || 0,
          last_event_ts: result.last_event_ts || null,
          last_event_type: result.last_event_type || null,
          log_path: result.log_path || null,
        });
      }
    } catch (err) {
      console.error('Failed to get Star Citizen status:', err);
    }
  }, []);

  // Start Star Citizen integration
  const start = useCallback(async (logPath?: string, playerName?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.starcitizenStart?.(logPath, playerName);
      if (result?.success) {
        setStatus(prev => ({ 
          ...prev, 
          enabled: true,
          log_path: result.log_path || prev.log_path,
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

  // Stop Star Citizen integration
  const stop = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - window.vestBridge
      const result = await window.vestBridge?.starcitizenStop?.();
      if (result?.success) {
        setStatus(prev => ({ ...prev, enabled: false }));
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
    const unsubscribe = window.vestBridge?.onDaemonEvent?.((event: { event: string; [key: string]: any; ts?: number }) => {
      // Handle Star Citizen events
      if (event.event === 'starcitizen_game_event') {
        const gameEventType = (event as any).event_type || 'unknown';
        const gameEvent: StarCitizenGameEvent = {
          event: gameEventType,
          params: (event as any).params,
          timestamp: event.ts || Date.now() / 1000,
        };
        setGameEvents(prev => [gameEvent, ...prev].slice(0, 50)); // Keep last 50
        setStatus(prev => ({
          ...prev,
          events_received: prev.events_received + 1,
          last_event_ts: gameEvent.timestamp,
          last_event_type: gameEventType,
        }));
      } else if (event.event === 'starcitizen_started') {
        setStatus(prev => ({ 
          ...prev, 
          enabled: true,
          log_path: (event as any).log_path || prev.log_path,
        }));
      } else if (event.event === 'starcitizen_stopped') {
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
    start,
    stop,
    clearEvents,
    refreshStatus,
  };
}

