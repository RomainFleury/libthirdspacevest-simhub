import { usePistolWhipIntegration } from "../../hooks/usePistolWhipIntegration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo, ModInfo } from "../../types/integratedGames";

const game = getIntegratedGame("pistolwhip")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  gun_fire: { label: "Gun Fire", icon: "🔫", color: "text-amber-400" },
  shotgun_fire: { label: "Shotgun Fire", icon: "💥", color: "text-orange-500" },
  melee_hit: { label: "Melee Hit", icon: "👊", color: "text-orange-400" },
  reload_hip: { label: "Reload (Hip)", icon: "🔄", color: "text-blue-400" },
  reload_shoulder: { label: "Reload (Shoulder)", icon: "⬆️", color: "text-blue-300" },
  player_hit: { label: "Player Hit", icon: "💔", color: "text-red-400" },
  death: { label: "Death", icon: "💀", color: "text-red-500" },
  low_health: { label: "Low Health", icon: "❤️", color: "text-red-300" },
  healing: { label: "Healing", icon: "💚", color: "text-green-400" },
  empty_gun_fire: { label: "Empty Click", icon: "❌", color: "text-slate-400" },
};

const MOD_INFO: ModInfo = {
  name: "ThirdSpace_PistolWhip",
  downloadUrl: "https://github.com/RomainFleury/libthirdspacevest-simhub/releases",
  githubUrl: "https://github.com/RomainFleury/libthirdspacevest-simhub/tree/master/pistolwhip-mod",
  installInstructions: [
    "Install MelonLoader 0.6.x (Il2Cpp version) from https://github.com/LavaGang/MelonLoader/releases",
    "Download ThirdSpace_PistolWhip.dll from releases",
    "Copy to Pistol Whip/Mods/ folder",
    "Start the Third Space daemon",
    "Launch Pistol Whip",
  ],
};

export function PistolWhipIntegrationPage() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    enable,
    disable,
    clearEvents,
  } = usePistolWhipIntegration();

  // Convert to GameIntegrationStatus format
  const integrationStatus = {
    running: status.enabled,
    events_received: status.events_received,
    last_event_ts: status.last_event_ts,
    last_event_type: status.last_event_type,
  };

  // Convert events
  const events: GameEvent[] = gameEvents.map((e, idx) => ({
    id: `pistolwhip-${idx}-${e.timestamp}`,
    type: e.event,
    ts: e.timestamp,
  }));

  // Setup guide
  const setupGuide = (
    <div className="space-y-3 text-sm text-slate-400">
      <p>
        Pistol Whip uses MelonLoader for Il2Cpp games. The mod automatically connects 
        to the daemon when the game starts.
      </p>
      <p className="text-slate-500 text-xs">
        💡 Make sure the daemon is running before launching the game.
      </p>
    </div>
  );

  return (
    <GameIntegrationPage
      game={game}
      status={integrationStatus}
      loading={isLoading}
      error={error}
      events={events}
      eventDisplayMap={EVENT_DISPLAY_MAP}
      onStart={enable}
      onStop={disable}
      onClearEvents={clearEvents}
      modInfo={MOD_INFO}
      setupGuide={setupGuide}
    />
  );
}
