import { useArmaReforgerIntegration } from "../../hooks/useArmaReforgerIntegration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo } from "../../types/integratedGames";

const game = getIntegratedGame("armareforger")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  player_damage: { label: "Damage Taken", icon: "💥", color: "text-red-400" },
  player_death: { label: "Player Killed", icon: "💀", color: "text-red-500" },
  player_heal: { label: "Healed", icon: "💚", color: "text-green-400" },
  player_suppressed: { label: "Suppressed", icon: "😰", color: "text-yellow-400" },
  weapon_fire_rifle: { label: "Rifle Fire", icon: "🔫", color: "text-slate-400" },
  weapon_fire_mg: { label: "MG Fire", icon: "⚔️", color: "text-orange-400" },
  weapon_fire_pistol: { label: "Pistol Fire", icon: "🔫", color: "text-slate-300" },
  weapon_fire_launcher: { label: "Launcher Fire", icon: "🚀", color: "text-red-300" },
  weapon_reload: { label: "Reload", icon: "🔄", color: "text-blue-300" },
  grenade_throw: { label: "Grenade Throw", icon: "💣", color: "text-orange-500" },
  vehicle_collision: { label: "Vehicle Collision", icon: "💥", color: "text-yellow-500" },
  vehicle_damage: { label: "Vehicle Damage", icon: "🚗", color: "text-orange-400" },
  vehicle_explosion: { label: "Vehicle Explosion", icon: "🔥", color: "text-red-500" },
  helicopter_rotor: { label: "Helicopter Rotor", icon: "🚁", color: "text-blue-400" },
  explosion_nearby: { label: "Explosion Nearby", icon: "💣", color: "text-red-400" },
  bullet_impact_near: { label: "Bullet Impact Near", icon: "⚡", color: "text-yellow-300" },
};

function formatEventDetails(event: GameEvent): string {
  const params = event.params as {
    damage?: number;
    angle?: number;
    weapon?: string;
    intensity?: number;
    distance?: number;
  };
  
  if (params?.damage) {
    return `${params.damage} HP`;
  }
  if (params?.angle !== undefined) {
    return `${params.angle}°`;
  }
  if (params?.intensity !== undefined) {
    return `Intensity: ${params.intensity}`;
  }
  if (params?.distance !== undefined) {
    return `${params.distance}m`;
  }
  if (params?.weapon) {
    return params.weapon;
  }
  return "";
}

export function ArmaReforgerIntegrationPage() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    enable,
    disable,
    clearEvents,
  } = useArmaReforgerIntegration();

  // Convert Arma Reforger events to generic GameEvent format
  const events: GameEvent[] = gameEvents.map((e, i) => ({
    id: `arma-${e.timestamp}-${i}`,
    type: e.event,
    ts: e.timestamp,
    params: e.params as Record<string, unknown>,
  }));

  // Setup guide content
  const setupGuide = (
    <div className="space-y-4 text-sm text-slate-300">
      <div className="p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
        <p className="text-amber-300 font-medium">⚠️ Mod Not Yet Published</p>
        <p className="text-amber-200/80 text-xs mt-1">
          Arma Reforger requires mods to be on Steam Workshop. This mod needs to be built with 
          Arma Reforger Workbench and published first.
        </p>
      </div>
      
      <p className="font-medium text-slate-200">For Developers:</p>
      <ol className="list-decimal list-inside space-y-2 ml-2">
        <li>Install <span className="text-blue-400">Arma Reforger Workbench</span> from Steam (free)</li>
        <li>Create a new addon and import files from <code className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">armareforger-mod/</code></li>
        <li>Build and test via Workbench (F5 to run)</li>
        <li>Publish to Steam Workshop when ready</li>
      </ol>
      
      <p className="font-medium text-slate-200 mt-4">When Published:</p>
      <ol className="list-decimal list-inside space-y-2 ml-2">
        <li>Subscribe to the mod on Steam Workshop</li>
        <li>Enable the mod in Arma Reforger's mod menu</li>
        <li>Click "Start Integration" above</li>
        <li>Launch Arma Reforger - mod connects to daemon on port 5050</li>
      </ol>
      
      <p className="mt-4 text-xs text-slate-400">
        See <code className="px-1 bg-slate-700 rounded">armareforger-mod/README.md</code> for full development instructions.
      </p>
    </div>
  );

  // Configuration panel
  const configurationPanel = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-400">TCP Port:</span>
          <span className="ml-2 text-white">5050 (default daemon port)</span>
        </div>
        <div>
          <span className="text-slate-400">Mod Required:</span>
          <span className="ml-2 text-white">Yes - Third Space Vest Mod</span>
        </div>
      </div>
    </div>
  );

  return (
    <GameIntegrationPage
      game={game}
      status={{
        enabled: status.enabled,
        eventsReceived: status.events_received,
        lastEventTs: status.last_event_ts,
        lastEventType: status.last_event_type,
      }}
      loading={isLoading}
      error={error}
      events={events}
      eventDisplayMap={EVENT_DISPLAY_MAP}
      onStart={enable}
      onStop={disable}
      onClearEvents={clearEvents}
      formatEventDetails={formatEventDetails}
      setupGuide={setupGuide}
      configurationPanel={configurationPanel}
    />
  );
}
