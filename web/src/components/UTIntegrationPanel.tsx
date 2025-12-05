import React from 'react';
import { useUTIntegration } from '../hooks/useUTIntegration';

// Event icons for visual feedback
const EVENT_ICONS: Record<string, string> = {
  PlayerDamage: '💥',
  PlayerDeath: '💀',
  WeaponFire: '🔫',
  Dodge: '💨',
  JumpBoots: '🦿',
  ShieldBelt: '🛡️',
  FlagGrab: '🚩',
  FlagCapture: '🏆',
  FlagReturn: '↩️',
  KillingSpree: '🔥',
  MultiKill: '⚡',
  Headshot: '🎯',
  Translocator: '🌀',
  ImpactHammer: '🔨',
  HealthPack: '💚',
  ArmorPickup: '🛡️',
};

export function UTIntegrationPanel() {
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
  } = useUTIntegration();

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString();
  };

  const formatEventName = (name: string) => {
    // Convert CamelCase to Title Case with spaces
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  const getAngleDirection = (angle: number): string => {
    if (angle <= 45 || angle >= 315) return '↑ Front';
    if (angle > 45 && angle <= 135) return '→ Right';
    if (angle > 135 && angle <= 225) return '↓ Back';
    if (angle > 225 && angle < 315) return '← Left';
    return '';
  };

  const formatEventDetails = (event: { event: string; params?: any }): string => {
    const params = event.params;
    if (!params) return "";

    if (event.event === "PlayerDamage") {
      const parts: string[] = [];
      if (params.damage !== undefined) {
        parts.push(`${params.damage} damage`);
      }
      if (params.attacker && params.attacker !== "unknown") {
        parts.push(`from ${params.attacker}`);
      }
      if (params.weapon) {
        parts.push(`(${params.weapon})`);
      }
      if (params.direction !== undefined && params.direction !== 0) {
        parts.push(`@ ${Math.round(params.direction)}°`);
      }
      return parts.join(" ");
    }
    if (event.event === "PlayerDeath") {
      const parts: string[] = [];
      if (params.killer) {
        parts.push(`killed by ${params.killer}`);
      }
      if (params.weapon) {
        parts.push(`(${params.weapon})`);
      }
      if (params.headshot) {
        parts.push('💀 Headshot');
      }
      return parts.join(" ");
    }
    if (event.event === "WeaponFire" && params.weapon) {
      return params.weapon;
    }
    if (event.event === "Dodge" && params.direction) {
      return params.direction;
    }
    if (event.event === "FlagGrab" && params.team) {
      return `${params.team} Flag`;
    }
    if (event.event === "FlagCapture" && params.team) {
      return `${params.team} Flag Captured!`;
    }
    if (event.event === "KillingSpree" && params.count) {
      const labels: Record<number, string> = {
        3: 'Killing Spree!',
        4: 'Rampage!',
        5: 'Dominating!',
        6: 'Unstoppable!',
        7: 'Godlike!',
      };
      return labels[params.count] || `${params.count} kills!`;
    }
    if (event.event === "MultiKill" && params.count) {
      const labels: Record<number, string> = {
        2: 'Double Kill!',
        3: 'Multi Kill!',
        4: 'Ultra Kill!',
        5: 'Monster Kill!',
      };
      return labels[params.count] || `${params.count}x Kill!`;
    }
    if (event.event === "HealthPack" && params.amount) {
      return `+${params.amount} HP`;
    }
    if (event.event === "ArmorPickup" && params.type) {
      return params.type;
    }
    return "";
  };

  const handleStart = () => {
    start(logPath || undefined);
  };

  const handleBrowse = async () => {
    await browseLogPath();
  };

  return (
    <div className="rounded-2xl bg-slate-800/80 p-6 shadow-lg ring-1 ring-white/5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-white">🎮 Unreal Tournament</h3>
          <p className="text-sm text-slate-400 mt-1">
            Game log file watching integration
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
              <div className="text-xs text-slate-500">{formatEventName(status.last_event_type)}</div>
            )}
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Game Log Path
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
            Default: %LOCALAPPDATA%\UnrealTournament\Saved\Logs\UnrealTournament.log
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
            {gameEvents.map((event, idx) => {
              const params = event.params || {};
              const hasAngle = params.direction !== undefined && params.direction !== 0;
              
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3 text-sm"
                >
                  <span className="text-2xl">
                    {EVENT_ICONS[event.event] || '📌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white flex items-center gap-2">
                      {formatEventName(event.event)}
                      {hasAngle && (
                        <span className="text-xs text-blue-400 font-normal">
                          {getAngleDirection(params.direction as number)}
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

      {/* Supported Games Info */}
      <div className="rounded-lg bg-slate-900/30 p-4 text-xs text-slate-400">
        <p className="mb-2">
          <strong className="text-slate-300">Supported Games:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Unreal Tournament (2014 Alpha) - UE4</li>
          <li>Unreal Tournament 3 - UE3</li>
          <li>Unreal Tournament 2004 - UE2.5</li>
          <li>Unreal Tournament 99 GOTY - UE1</li>
        </ul>
        <p className="mt-3 mb-2">
          <strong className="text-slate-300">Haptic Events:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Directional damage (8 zones)</li>
          <li>Weapon-specific recoil</li>
          <li>Dodge movements</li>
          <li>Flag captures & kills</li>
          <li>Power-up pickups</li>
        </ul>
        <p className="mt-3 text-slate-500">
          💡 For enhanced events, install the optional ThirdSpaceVest mutator.
        </p>
      </div>
    </div>
  );
}
