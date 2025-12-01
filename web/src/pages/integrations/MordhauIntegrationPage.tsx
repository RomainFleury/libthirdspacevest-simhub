import { useMordhauIntegration, MordhauGameEvent } from "../../hooks/useMordhauIntegration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo } from "../../types/integratedGames";

const game = getIntegratedGame("mordhau")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  DAMAGE: { label: "Damage Taken", icon: "⚔️", color: "text-red-400" },
};

function formatEventDetails(event: GameEvent): string {
  const mordhauEvent = event as unknown as MordhauGameEvent;
  if (mordhauEvent.type === "DAMAGE" && mordhauEvent.params) {
    const direction = mordhauEvent.params.direction ? String(mordhauEvent.params.direction) : "unknown";
    const intensity = mordhauEvent.params.intensity !== undefined ? Number(mordhauEvent.params.intensity) : 0;
    return `${direction} (${intensity}%)`;
  }
  return "";
}

export function MordhauIntegrationPage() {
  const {
    status,
    loading,
    error,
    gameEvents,
    start,
    stop,
    clearEvents,
  } = useMordhauIntegration();

  // Convert Mordhau events to generic GameEvent format
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
        Mordhau integration uses screen capture to detect the red arch damage indicator around the crosshair.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-slate-400">
        <li>Install Python dependencies: <code className="bg-slate-800 px-1 rounded">pip install mss pillow numpy pygetwindow</code></li>
        <li>Run the screen capture script: <code className="bg-slate-800 px-1 rounded">python screen_capture_prototype.py</code></li>
        <li>Launch Mordhau and take damage to test detection</li>
        <li>Click "Start" above to begin watching for events</li>
      </ol>
      <p className="text-slate-500 text-xs">
        💡 The screen capture script writes events to: <code className="bg-slate-800 px-1 rounded">%LOCALAPPDATA%\Mordhau\haptic_events.log</code>
      </p>
      <p className="text-slate-500 text-xs">
        📁 Script location: <code className="bg-slate-800 px-1 rounded">misc-documentations/bhaptics-svg-24-nov/mordhau/screen_capture_prototype.py</code>
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

