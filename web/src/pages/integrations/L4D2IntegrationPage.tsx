import { useL4D2Integration } from "../../hooks/useL4D2Integration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo } from "../../types/integratedGames";

const game = getIntegratedGame("l4d2")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  damage: { label: "Damage Taken", icon: "💥", color: "text-red-400" },
  killed: { label: "Player Killed", icon: "💀", color: "text-red-500" },
  incapped: { label: "Incapacitated", icon: "🩸", color: "text-orange-500" },
  revived: { label: "Revived", icon: "💚", color: "text-green-400" },
  healed: { label: "Healed", icon: "🩹", color: "text-green-300" },
  adrenaline: { label: "Adrenaline", icon: "💉", color: "text-yellow-400" },
  pills: { label: "Pills", icon: "💊", color: "text-blue-300" },
  defib: { label: "Defibrillator", icon: "⚡", color: "text-cyan-400" },
  pounced: { label: "Hunter Pounce", icon: "🐆", color: "text-purple-400" },
  charged: { label: "Charger Hit", icon: "🦏", color: "text-orange-400" },
  smoked: { label: "Smoker Grab", icon: "💨", color: "text-gray-400" },
  jockeyed: { label: "Jockey Ride", icon: "🎭", color: "text-pink-400" },
  boomed: { label: "Boomer Bile", icon: "🤢", color: "text-green-500" },
  spit: { label: "Spitter Acid", icon: "🧪", color: "text-lime-400" },
  tank: { label: "Tank Hit", icon: "👊", color: "text-red-600" },
  witch: { label: "Witch Attack", icon: "😱", color: "text-slate-300" },
  explosion: { label: "Explosion", icon: "💣", color: "text-orange-500" },
  fire: { label: "Fire Damage", icon: "🔥", color: "text-orange-400" },
  friendly_fire: { label: "Friendly Fire", icon: "⚠️", color: "text-yellow-500" },
  melee: { label: "Melee Hit", icon: "🪓", color: "text-slate-400" },
  fall: { label: "Fall Damage", icon: "⬇️", color: "text-blue-400" },
};

function formatEventDetails(event: GameEvent): string {
  const params = event.params as {
    damage?: number;
    attacker?: string;
    weapon?: string;
    infected?: string;
    player?: string;
    item?: string;
    amount?: number;
  };
  
  if (params?.damage) {
    return `${params.damage} HP`;
  }
  if (params?.amount) {
    return `+${params.amount} HP`;
  }
  if (params?.attacker) {
    return `by ${params.attacker}`;
  }
  if (params?.infected) {
    return params.infected;
  }
  if (params?.weapon) {
    return params.weapon;
  }
  return "";
}

export function L4D2IntegrationPage() {
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
  } = useL4D2Integration();

  // Convert L4D2 events to generic GameEvent format
  const events: GameEvent[] = gameEvents.map((e, i) => ({
    id: `l4d2-${e.timestamp}-${i}`,
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
            placeholder="Auto-detect (default: Steam/steamapps/common/Left 4 Dead 2/left4dead2/console.log)"
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
          placeholder="Filter events for specific player"
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Leave empty to receive all damage events
        </p>
      </div>
    </div>
  );

  // Setup guide
  const setupGuide = (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">
        Left 4 Dead 2 integration uses console log monitoring to detect in-game events.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-slate-400">
        <li>
          Add <code className="bg-slate-800 px-1 rounded">-condebug</code> to L4D2 launch options in Steam
        </li>
        <li>Configure the log path above (or leave empty for auto-detect)</li>
        <li>Optionally set your player name to filter events</li>
        <li>Start L4D2 and join a game</li>
        <li>Click "Start" above to begin receiving haptic feedback</li>
      </ol>
      <div className="rounded-lg bg-slate-800/80 p-3 mt-4">
        <p className="text-slate-400 text-xs">
          <strong className="text-slate-300">Setting launch options:</strong><br />
          Steam → Right-click L4D2 → Properties → Launch Options → Add: <code className="bg-slate-700 px-1 rounded">-condebug</code>
        </p>
      </div>
      <p className="text-slate-500 text-xs mt-2">
        💡 The console.log file is typically at: <br />
        <code className="bg-slate-800 px-1 rounded">Steam/steamapps/common/Left 4 Dead 2/left4dead2/console.log</code>
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
