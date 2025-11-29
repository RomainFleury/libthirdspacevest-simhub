import React, { useState } from 'react';
import { useStarCitizenIntegration } from '../hooks/useStarCitizenIntegration';

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  player_death: '💀',
  player_kill: '🎯',
  npc_death: '🤖',
  suicide: '💔',
  death: '💀',
  ship_hit: '🚀',
};

export function StarCitizenIntegrationPanel() {
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
  } = useStarCitizenIntegration();

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

    if (event.event === "player_death" && params.victim_name) {
      return `${params.victim_name} → ${params.killer_name || 'Unknown'}`;
    }
    if (event.event === "player_kill" && params.victim_name) {
      return params.victim_name;
    }
    if (event.event === "ship_hit") {
      const parts: string[] = [];
      if (params.attacker) parts.push(params.attacker);
      if (params.ship) parts.push(params.ship);
      return parts.length > 0 ? parts.join(" → ") : "";
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
          <h3 className="text-2xl font-semibold text-white">🚀 Star Citizen</h3>
          <p className="text-sm text-slate-400 mt-1">
            Game.log file watching integration
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          status.enabled 
            ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
            : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
        }`}>
          {status.enabled ? 'Active' : 'Inactive'}
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
        {status.log_path && (
          <div className="col-span-2 rounded-lg bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Game.log Path</div>
            <div className="text-xs font-mono text-slate-300 break-all">{status.log_path}</div>
          </div>
        )}
      </div>

      {/* Configuration */}
      {!status.enabled && (
        <div className="mb-6 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Game.log Path (optional - auto-detect if empty)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={logPath}
                onChange={(e) => setLogPath(e.target.value)}
                placeholder="C:/Program Files/Roberts Space Industries/StarCitizen/LIVE/Game.log"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleBrowse}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Browse for Game.log file"
              >
                Browse
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Player Name (optional - for identifying player events)
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your in-game name"
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={status.enabled ? stop : handleStart}
          disabled={isLoading}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            status.enabled
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? 'Loading...' : status.enabled ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Live Events */}
      <div className="rounded-xl bg-slate-900/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">Live Events</h3>
          {gameEvents.length > 0 && (
            <button
              onClick={clearEvents}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto">
          {gameEvents.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              {status.enabled
                ? "Waiting for Star Citizen events..."
                : "Start watching to see live events"}
            </p>
          ) : (
            <ul className="space-y-1">
              {gameEvents.map((event, idx) => {
                const details = formatEventDetails(event);
                return (
                  <li
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5 text-sm"
                  >
                    <span className="text-base">
                      {EVENT_ICONS[event.event] || '📋'}
                    </span>
                    <span className="font-medium text-white">
                      {formatEventName(event.event)}
                    </span>
                    {details && (
                      <span className="text-slate-400">({details})</span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">
                      {formatTime(event.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Info */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-slate-400 hover:text-slate-300">
          ℹ️ How It Works
        </summary>
        <div className="mt-3 text-sm text-slate-400 space-y-2">
          <p>
            Star Citizen writes death/kill events to <code className="px-1 py-0.5 rounded bg-slate-900/50">Game.log</code>.
            This integration watches the log file and triggers haptic feedback based on events.
          </p>
          <p>
            <strong>Features:</strong>
          </p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Directional haptic feedback using death event direction vectors</li>
            <li>Player death, kill, NPC death, and suicide detection</li>
            <li>Intensity scaling by damage type (ballistic, energy, explosive)</li>
            <li>Auto-detection of Game.log location</li>
          </ul>
          <p className="pt-2">
            <strong>Note:</strong> No mod required! This works with the vanilla game by reading the log file.
          </p>
        </div>
      </details>
    </div>
  );
}

