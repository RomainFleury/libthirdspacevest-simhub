import { useChivalry2Integration, Chivalry2GameEvent } from "../../hooks/useChivalry2Integration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo } from "../../types/integratedGames";

const game = getIntegratedGame("chivalry2")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  DAMAGE: { label: "Damage Taken", icon: "⚔️", color: "text-red-400" },
  DEATH: { label: "Death", icon: "💀", color: "text-red-600" },
  FALL_DAMAGE: { label: "Fall Damage", icon: "⬇️", color: "text-yellow-400" },
  FIRE: { label: "Fire/Burning", icon: "🔥", color: "text-orange-400" },
  BLOCK: { label: "Block", icon: "🛡️", color: "text-blue-400" },
  PARRY: { label: "Parry", icon: "✨", color: "text-green-400" },
};

function formatEventDetails(event: GameEvent): string {
  const chivalry2Event = event as unknown as Chivalry2GameEvent;
  if (chivalry2Event.params) {
    const zone = chivalry2Event.params.zone ? String(chivalry2Event.params.zone) : "unknown";
    const intensity = chivalry2Event.params.intensity !== undefined ? Number(chivalry2Event.params.intensity) : 0;
    const damageType = chivalry2Event.params.damage_type ? String(chivalry2Event.params.damage_type) : "";
    const angle = chivalry2Event.params.angle !== undefined ? Number(chivalry2Event.params.angle).toFixed(1) : "";
    
    if (chivalry2Event.type === "DAMAGE") {
      return `${zone} (${angle}°) - ${damageType} - ${intensity}%`;
    } else if (chivalry2Event.type === "DEATH") {
      return "Full body impact";
    } else if (chivalry2Event.type === "FALL_DAMAGE") {
      return `Lower body - ${intensity}%`;
    } else if (chivalry2Event.type === "FIRE") {
      return `Pulsing - ${intensity}%`;
    } else if (chivalry2Event.type === "BLOCK" || chivalry2Event.type === "PARRY") {
      return `${zone} (${angle}°)`;
    }
  }
  return "";
}

export function Chivalry2IntegrationPage() {
  const {
    status,
    loading,
    error,
    gameEvents,
    start,
    stop,
    clearEvents,
  } = useChivalry2Integration();

  // Convert Chivalry 2 events to generic GameEvent format
  const events: GameEvent[] = gameEvents.map(e => ({
    id: e.id,
    type: e.type,
    ts: e.ts,
    params: e.params,
  }));

  // Setup guide
  const setupGuide = (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">
        Chivalry 2 integration uses a Blueprint mod that writes game events to a log file.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-slate-400">
        <li>Install the ThirdSpaceChivalry2 Blueprint mod (ArgonSDK-based)</li>
        <li>Package the mod as a .pak file and place it in <code className="bg-slate-800 px-1 rounded">Chivalry2/Content/Paks/mods/</code></li>
        <li>Launch Chivalry 2 and take damage to test detection</li>
        <li>Click "Start" above to begin watching for events</li>
      </ol>
      <p className="text-slate-500 text-xs">
        💡 The mod writes events to: <code className="bg-slate-800 px-1 rounded">%LOCALAPPDATA%\Chivalry2\ThirdSpaceHaptics\haptic_events.log</code>
      </p>
      <p className="text-slate-500 text-xs">
        📁 Mod location: <code className="bg-slate-800 px-1 rounded">docs-external-integrations-ideas/CHIVALRY2_INTEGRATION.md</code>
      </p>
    </div>
  );

  // Additional stats
  const additionalStats = status.log_path ? (
    <div className="rounded-lg bg-slate-700/30 px-4 py-2">
      <span className="text-slate-400 text-sm">Log:</span>{" "}
      <span className="font-mono text-white text-xs truncate max-w-xs inline-block align-middle" title={status.log_path}>
        ...{status.log_path.slice(-30)}
      </span>
    </div>
  ) : undefined;

  return (
    <GameIntegrationPage
      game={game}
      status={status}
      loading={loading}
      error={error}
      events={events}
      eventDisplayMap={EVENT_DISPLAY_MAP}
      onStart={() => start()}
      onStop={stop}
      onClearEvents={clearEvents}
      formatEventDetails={formatEventDetails}
      setupGuide={setupGuide}
      additionalStats={additionalStats}
    />
  );
}
