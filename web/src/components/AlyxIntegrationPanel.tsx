import { useState } from "react";
import { useAlyxIntegration, AlyxGameEvent } from "../hooks/useAlyxIntegration";

// Event type to display info mapping
const EVENT_INFO: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  PlayerHurt: { label: "Damage Taken", icon: "💥", color: "text-red-400" },
  PlayerDeath: { label: "Death", icon: "💀", color: "text-red-500" },
  PlayerShootWeapon: { label: "Weapon Fire", icon: "🔫", color: "text-amber-400" },
  PlayerHealth: { label: "Low Health", icon: "❤️", color: "text-red-300" },
  PlayerHeal: { label: "Healing", icon: "💚", color: "text-green-400" },
  PlayerGrabbityPull: { label: "Gravity Pull", icon: "🧲", color: "text-purple-400" },
  GrabbityGloveCatch: { label: "Gravity Catch", icon: "🤚", color: "text-purple-300" },
  PlayerGrabbedByBarnacle: { label: "Barnacle Grab", icon: "🦑", color: "text-orange-400" },
  PlayerReleasedByBarnacle: { label: "Barnacle Release", icon: "🦑", color: "text-orange-300" },
  PlayerCoughStart: { label: "Coughing", icon: "🫁", color: "text-slate-400" },
  PlayerCoughEnd: { label: "Cough End", icon: "🫁", color: "text-slate-500" },
  TwoHandStart: { label: "Two-Hand Grip", icon: "✊", color: "text-blue-400" },
  TwoHandEnd: { label: "Release Grip", icon: "✊", color: "text-blue-300" },
  Reset: { label: "Player Spawn", icon: "🔄", color: "text-green-400" },
  PlayerDropAmmoInBackpack: { label: "Store Ammo", icon: "🎒", color: "text-amber-300" },
  PlayerDropResinInBackpack: { label: "Store Resin", icon: "🎒", color: "text-amber-300" },
  PlayerRetrievedBackpackClip: { label: "Get Clip", icon: "📦", color: "text-amber-400" },
};

function getEventInfo(type: string) {
  return EVENT_INFO[type] || { label: type, icon: "📡", color: "text-slate-400" };
}

function formatEventDetails(event: AlyxGameEvent): string {
  const params = event.params;
  if (!params) return "";
  
  if (event.type === "PlayerHurt" && params.health !== undefined) {
    return `HP: ${params.health}`;
  }
  if (event.type === "PlayerShootWeapon" && params.weapon) {
    return String(params.weapon);
  }
  return "";
}

export function AlyxIntegrationPanel() {
  const {
    status,
    loading,
    error,
    gameEvents,
    modInfo,
    start,
    stop,
    clearEvents,
  } = useAlyxIntegration();

  const [showModInfo, setShowModInfo] = useState(false);

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Game Integration
          </p>
          <h2 className="text-xl font-semibold text-white">
            Half-Life: Alyx
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
            status.running
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-500/20 text-slate-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status.running ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          {status.running ? "Watching" : "Stopped"}
        </span>
      </header>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Mod Info Banner */}
      {!status.running && modInfo && (
        <div className="mb-4 rounded-xl bg-amber-900/20 border border-amber-700/30 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-200 mb-1">
                ⚠️ Mod Required
              </h3>
              <p className="text-xs text-amber-300/80">
                Half-Life: Alyx requires the bHaptics Tactsuit mod scripts and{" "}
                <code className="bg-slate-800/50 px-1 rounded">-condebug</code> launch option.
              </p>
            </div>
            <button
              onClick={() => setShowModInfo(!showModInfo)}
              className="ml-2 text-xs text-amber-400 hover:text-amber-300 underline"
            >
              {showModInfo ? "Hide" : "Setup Guide"}
            </button>
          </div>

          {/* Expandable mod info */}
          {showModInfo && (
            <div className="mt-3 space-y-3 border-t border-amber-700/30 pt-3">
              {/* Download links */}
              <div className="flex gap-3">
                <a
                  href={modInfo.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  NexusMods
                </a>
                <a
                  href={modInfo.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-600"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              </div>

              {/* Install instructions */}
              <div className="text-xs text-amber-200/80 space-y-1">
                <p className="font-medium">Installation Steps:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-300/70">
                  {modInfo.install_instructions.map((step, i) => (
                    <li key={i}>{step.replace(/^\d+\.\s*/, "")}</li>
                  ))}
                </ol>
              </div>

              {/* Skill manifest snippet */}
              <div className="text-xs">
                <p className="text-amber-200/80 mb-1">Add to <code className="bg-slate-800/50 px-1 rounded">skill_manifest.cfg</code>:</p>
                <pre className="bg-slate-900/50 rounded px-2 py-1 text-slate-300 overflow-x-auto">
                  {modInfo.skill_manifest_addition}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Path Display */}
      {status.log_path && (
        <div className="mb-4 rounded-xl bg-slate-900/50 p-3">
          <h3 className="text-sm font-medium text-slate-300 mb-1">
            Watching Console Log
          </h3>
          <p className="text-xs text-slate-500 truncate" title={status.log_path}>
            {status.log_path}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-3">
          {!status.running ? (
            <button
              onClick={() => start()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600/80 px-4 py-2 font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {loading ? "Starting..." : "Start Watching"}
            </button>
          ) : (
            <button
              onClick={stop}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600/80 px-4 py-2 font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              {loading ? "Stopping..." : "Stop"}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {status.running && (
        <div className="mb-4 flex gap-4 text-sm">
          <div className="rounded-lg bg-slate-700/30 px-3 py-2">
            <span className="text-slate-400">Events:</span>{" "}
            <span className="font-mono text-white">
              {status.events_received ?? 0}
            </span>
          </div>
          {status.last_event_ts && (
            <div className="rounded-lg bg-slate-700/30 px-3 py-2">
              <span className="text-slate-400">Last:</span>{" "}
              <span className="font-mono text-white">
                {new Date(status.last_event_ts * 1000).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

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
              {status.running
                ? "Waiting for Alyx events... (play the game!)"
                : "Start watching to see live events"}
            </p>
          ) : (
            <ul className="space-y-1">
              {gameEvents.map((event) => {
                const info = getEventInfo(event.type);
                const details = formatEventDetails(event);
                return (
                  <li
                    key={event.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5 text-sm"
                  >
                    <span className="text-base">{info.icon}</span>
                    <span className={`font-medium ${info.color}`}>
                      {info.label}
                    </span>
                    {details && (
                      <span className="text-slate-400">({details})</span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">
                      {new Date(event.ts).toLocaleTimeString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

