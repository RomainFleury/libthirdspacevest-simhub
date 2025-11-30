import React, { useState } from 'react';
import { useL4D2Integration } from '../hooks/useL4D2Integration';

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  player_death: '💀',
  player_kill: '🎯',
  player_damage: '💥',
  player_attack: '⚔️',
  weapon_fire: '🔫',
  health_pickup: '💚',
  ammo_pickup: '🔫',
  infected_spawn: '🧟',
  teammate_death: '💀',
};

export function Left4Dead2IntegrationPanel() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    start,
    stop,
    clearEvents,
    browseLogPath,
    logPath,
    setLogPath,
    playerName,
    setPlayerName,
  } = useL4D2Integration();

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString();
  };

  const formatEventName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatEventDetails = (event: { event: string; params?: any }): string => {
    const params = event.params;
    if (!params) return "";

    if (event.event === "player_death" && params.victim) {
      return `${params.victim} → ${params.attacker || 'Unknown'}`;
    }
    if (event.event === "player_kill" && params.victim) {
      return params.victim;
    }
    if (event.event === "player_damage" && params.damage) {
      return `${params.damage} damage from ${params.attacker || 'Unknown'}`;
    }
    if (event.event === "weapon_fire" && params.weapon) {
      return params.weapon;
    }
    if (event.event === "player_attack" && params.target) {
      return `Attacked ${params.target}`;
    }
    if (event.event === "health_pickup" && params.player) {
      return params.player;
    }
    if (event.event === "ammo_pickup" && params.player) {
      return params.player;
    }
    if (event.event === "infected_spawn" && params.infected) {
      return params.infected;
    }
    return "";
  };

  const handleStart = () => {
    start(logPath || undefined, playerName || undefined);
  };

  const handleBrowse = async () => {
    await browseLogPath();
  };

  return (
    <div className="rounded-2xl bg-slate-800/80 p-6 shadow-lg ring-1 ring-white/5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-white">🧟 Left 4 Dead 2</h3>
          <p className="text-sm text-slate-400 mt-1">
            Console.log file watching integration
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          status.running 
            ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
            : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
        }`}>
          {status.running ? 'Active' : 'Inactive'}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Status Info */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-900/50 p-4">
          <div className="text-xs text-slate-400 mb-1">Events Received</div>
          <div className="text-2xl font-bold text-white">{status.events_received}</div>
        </div>
        {status.last_event_ts && (
          <div className="rounded-lg bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Last Event</div>
            <div className="text-sm font-medium text-white">{formatTime(status.last_event_ts)}</div>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Console.log Path
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={logPath}
              onChange={(e) => setLogPath(e.target.value)}
              placeholder="Auto-detect or browse..."
              className="flex-1 rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleBrowse}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Default: Steam/steamapps/common/Left 4 Dead 2/left4dead2/console.log
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Player Name (Optional)
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your in-game name"
            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Used to filter events for your character
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleStart}
          disabled={isLoading || status.running}
          className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
        >
          {isLoading ? 'Starting...' : 'Start'}
        </button>
        <button
          onClick={stop}
          disabled={isLoading || !status.running}
          className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
        >
          {isLoading ? 'Stopping...' : 'Stop'}
        </button>
      </div>

      {/* Live Events */}
      {gameEvents.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-300">Live Events</h4>
            <button
              onClick={clearEvents}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {gameEvents.map((event, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3 text-sm"
              >
                <span className="text-2xl">
                  {EVENT_ICONS[event.event] || '📌'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">
                    {formatEventName(event.event)}
                  </div>
                  {formatEventDetails(event) && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatEventDetails(event)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {formatTime(event.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-slate-900/30 p-4 text-xs text-slate-400">
        <p className="mb-2">
          <strong className="text-slate-300">Setup:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Add <code className="bg-slate-800 px-1 rounded">-condebug</code> to Steam launch options</li>
          <li>Enable Developer Console in game settings</li>
          <li>Start the integration before launching the game</li>
        </ol>
        <p className="mt-2 text-slate-400">
          <strong>Current Limitations:</strong> Vanilla L4D2 only logs attack events to console.log (e.g., "Player attacked Target"). 
          Damage amounts and types are not available without a mod. A VScript mod is planned for Phase 2.
        </p>
      </div>
    </div>
  );
}

