import React from 'react';
import { useTF2Integration } from '../hooks/useTF2Integration';

// TF2 Steam App ID
const TF2_APP_ID = 440;
// Steam URL to launch with -condebug option
const STEAM_LAUNCH_URL = `steam://run/${TF2_APP_ID}//-condebug`;

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  damage_taken: '💥',
  damage_dealt: '🎯',
  kill: '⚔️',
  death: '💀',
  headshot: '🎯',
  backstab: '🗡️',
  ubercharge: '⚡',
  domination: '👑',
  revenge: '🔥',
  round_start: '🏁',
  round_end: '🏆',
  capture: '🚩',
  ignite: '🔥',
};

// Event colors
const EVENT_COLORS: Record<string, string> = {
  damage_taken: 'text-red-400',
  damage_dealt: 'text-green-400',
  kill: 'text-amber-400',
  death: 'text-red-500',
  headshot: 'text-purple-400',
  backstab: 'text-rose-400',
  ubercharge: 'text-blue-400',
  domination: 'text-yellow-400',
  revenge: 'text-orange-400',
  round_start: 'text-green-300',
  round_end: 'text-slate-300',
  capture: 'text-cyan-400',
  ignite: 'text-orange-300',
};

export function TF2IntegrationPanel() {
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
  } = useTF2Integration();

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

    if (event.event === "damage_taken") {
      const parts: string[] = [];
      if (params.damage !== undefined) {
        parts.push(`${params.damage} damage`);
      }
      if (params.attacker && params.attacker !== "unknown") {
        parts.push(`from ${params.attacker}`);
      }
      return parts.join(" ");
    }
    if (event.event === "damage_dealt") {
      const parts: string[] = [];
      if (params.damage !== undefined) {
        parts.push(`${params.damage} damage`);
      }
      if (params.victim && params.victim !== "unknown") {
        parts.push(`to ${params.victim}`);
      }
      return parts.join(" ");
    }
    if (event.event === "kill") {
      const parts: string[] = [];
      if (params.victim) {
        parts.push(`Killed ${params.victim}`);
      }
      if (params.weapon) {
        parts.push(`with ${params.weapon}`);
      }
      if (params.headshot) {
        parts.push('(headshot)');
      }
      if (params.critical) {
        parts.push('(crit)');
      }
      return parts.join(" ");
    }
    if (event.event === "death") {
      const parts: string[] = [];
      if (params.killer && params.killer !== "unknown") {
        parts.push(`Killed by ${params.killer}`);
      }
      if (params.weapon && params.weapon !== "unknown") {
        parts.push(`(${params.weapon})`);
      }
      return parts.join(" ");
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
          <h3 className="text-2xl font-semibold text-white">🎯 Team Fortress 2</h3>
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
            {status.last_event_type && (
              <div className="text-xs text-slate-500 mt-1">{formatEventName(status.last_event_type)}</div>
            )}
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
            Default: Steam/steamapps/common/Team Fortress 2/tf/console.log
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
            Used to detect when you are killed (for death haptics)
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
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
        
        {/* Launch via Steam button */}
        <a
          href={STEAM_LAUNCH_URL}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600/80 to-orange-700/80 px-4 py-2 font-medium text-white transition hover:from-orange-600 hover:to-orange-700"
          title="Launch TF2 via Steam with -condebug option"
        >
          {/* Steam icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
          </svg>
          Launch via Steam
        </a>
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
            {gameEvents.map((event, idx) => {
              const params = event.params || {};
              
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3 text-sm"
                >
                  <span className="text-2xl">
                    {EVENT_ICONS[event.event] || '📌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${EVENT_COLORS[event.event] || 'text-white'} flex items-center gap-2`}>
                      {formatEventName(event.event)}
                      {params.headshot && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                          Headshot
                        </span>
                      )}
                      {params.critical && (
                        <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                          Crit
                        </span>
                      )}
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
              );
            })}
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
          <li>Start the integration before launching the game</li>
          <li>Events will be detected from console.log</li>
        </ol>
        <p className="mt-3 text-slate-500">
          <strong>Detected Events:</strong> Damage taken, kills, deaths, headshots, criticals, ÜberCharge, dominations, revenge, round events, and more!
        </p>
      </div>
    </div>
  );
}
