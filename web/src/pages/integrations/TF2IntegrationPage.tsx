import { useTF2Integration } from "../../hooks/useTF2Integration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo } from "../../types/integratedGames";

const game = getIntegratedGame("tf2")!;

// Event type to display info mapping
// Keys match event types from the daemon (damage_taken, kill, etc.)
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  damage_taken: { label: "Damage Taken", icon: "💥", color: "text-red-400" },
  damage_dealt: { label: "Damage Dealt", icon: "🎯", color: "text-green-400" },
  kill: { label: "Kill", icon: "⚔️", color: "text-amber-400" },
  death: { label: "Death", icon: "💀", color: "text-red-500" },
  headshot: { label: "Headshot", icon: "🎯", color: "text-purple-400" },
  backstab: { label: "Backstab", icon: "🗡️", color: "text-rose-400" },
  ubercharge: { label: "ÜberCharge", icon: "⚡", color: "text-blue-400" },
  domination: { label: "Domination", icon: "👑", color: "text-yellow-400" },
  revenge: { label: "Revenge", icon: "🔥", color: "text-orange-400" },
  round_start: { label: "Round Start", icon: "🏁", color: "text-green-300" },
  round_end: { label: "Round End", icon: "🏆", color: "text-slate-300" },
  capture: { label: "Capture", icon: "🚩", color: "text-cyan-400" },
  ignite: { label: "On Fire", icon: "🔥", color: "text-orange-300" },
};

function formatEventDetails(event: GameEvent): string {
  const params = event.params as {
    damage?: number;
    attacker?: string;
    victim?: string;
    killer?: string;
    weapon?: string;
    headshot?: boolean;
    critical?: boolean;
  };
  
  const parts: string[] = [];
  
  if (params?.damage) {
    parts.push(`${params.damage} HP`);
  }
  if (params?.attacker && params.attacker !== "unknown") {
    parts.push(`by ${params.attacker}`);
  }
  if (params?.victim) {
    parts.push(`${params.victim}`);
  }
  if (params?.weapon) {
    parts.push(`(${params.weapon})`);
  }
  if (params?.headshot) {
    parts.push("🎯 Headshot");
  }
  if (params?.critical) {
    parts.push("💥 Crit");
  }
  
  return parts.join(" ");
}

export function TF2IntegrationPage() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    logPath,
    setLogPath,
    playerName,
    setPlayerName,
    start,
    stop,
    clearEvents,
    browseLogPath,
  } = useTF2Integration();

  // Convert TF2 events to generic GameEvent format
  const events: GameEvent[] = gameEvents.map((e, i) => ({
    id: `tf2-${e.timestamp}-${i}`,
    type: e.event,
    ts: e.timestamp,
    params: e.params as Record<string, unknown>,
  }));

  // Configuration panel
  const configurationPanel = (
    <div className="space-y-4">
      {/* Log Path */}
      <div>
        <label className="text-sm text-slate-400 block mb-2">Console Log Path</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={logPath}
            onChange={(e) => setLogPath(e.target.value || null)}
            placeholder="Auto-detect (default: Steam/steamapps/common/Team Fortress 2/tf/console.log)"
            className="flex-1 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={browseLogPath}
            disabled={isLoading}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
          >
            Browse
          </button>
        </div>
        {status.log_path && (
          <p className="text-xs text-emerald-400 mt-1">
            ✓ Watching: {status.log_path}
          </p>
        )}
      </div>

      {/* Player Name Filter */}
      <div>
        <label className="text-sm text-slate-400 block mb-2">Player Name (optional)</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value || null)}
          placeholder="Your in-game name for death detection"
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Enter your player name to detect when you are killed
        </p>
      </div>
    </div>
  );

  // Setup guide
  const setupGuide = (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">
        Team Fortress 2 integration monitors the game's console log for haptic events.
        No mods required - just enable console logging!
      </p>
      <ol className="list-decimal list-inside space-y-2 text-slate-400">
        <li>
          <strong className="text-slate-300">Enable console logging:</strong>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Steam → Right-click TF2 → Properties → Launch Options</li>
            <li>Add: <code className="bg-slate-700 px-1 rounded">-condebug</code></li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-300">Start the integration:</strong>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Click "Start" in this app</li>
            <li>The integration will auto-detect your console.log location</li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-300">Launch Team Fortress 2:</strong>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Start TF2 and join a game</li>
            <li>Take damage, get kills, and feel the haptic feedback!</li>
          </ul>
        </li>
      </ol>
      <div className="rounded-lg bg-emerald-900/30 ring-1 ring-emerald-500/30 p-3 mt-4">
        <p className="text-emerald-200 text-xs">
          <strong>✓ No mod required!</strong> TF2 integration works by monitoring the game's 
          console output - just enable <code className="bg-slate-800 px-1 rounded">-condebug</code> 
          and you're ready to go.
        </p>
      </div>
      <p className="text-slate-500 text-xs mt-2">
        💡 Haptic events: Damage taken, kills (with crit/headshot), deaths, ÜberCharge, 
        backstabs, dominations, revenge, round events, captures, and more!
      </p>
    </div>
  );

  return (
    <GameIntegrationPage
      game={game}
      status={{
        running: status.running,
        events_received: status.events_received,
        last_event_ts: status.last_event_ts,
        last_event_type: status.last_event_type,
      }}
      loading={isLoading}
      error={error}
      events={events}
      eventDisplayMap={EVENT_DISPLAY_MAP}
      onStart={() => start()}
      onStop={stop}
      onClearEvents={clearEvents}
      formatEventDetails={formatEventDetails}
      configurationPanel={configurationPanel}
      setupGuide={setupGuide}
    />
  );
}
