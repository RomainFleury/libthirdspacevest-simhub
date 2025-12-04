import { useSuperHotIntegration } from "../../hooks/useSuperHotIntegration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo, ModInfo } from "../../types/integratedGames";

const game = getIntegratedGame("superhot")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  death: { label: "Death", icon: "💀", color: "text-red-500" },
  punch_hit: { label: "Punch Hit", icon: "👊", color: "text-orange-400" },
  bullet_parry: { label: "Bullet Parry", icon: "🛡️", color: "text-blue-400" },
  pistol_recoil: { label: "Pistol Fire", icon: "🔫", color: "text-amber-400" },
  shotgun_recoil: { label: "Shotgun Fire", icon: "💥", color: "text-orange-500" },
  uzi_recoil: { label: "Uzi Fire", icon: "🔥", color: "text-red-400" },
  no_ammo: { label: "No Ammo", icon: "❌", color: "text-slate-400" },
  grab_object: { label: "Grab Object", icon: "✋", color: "text-purple-400" },
  grab_pyramid: { label: "Grab Pyramid", icon: "🔺", color: "text-purple-300" },
  throw: { label: "Throw", icon: "🎯", color: "text-green-400" },
  mindwave_charge: { label: "Mindwave Charge", icon: "⚡", color: "text-yellow-400" },
  mindwave_release: { label: "Mindwave Release", icon: "💫", color: "text-yellow-300" },
};

const MOD_INFO: ModInfo = {
  name: "ThirdSpace_SuperhotVR",
  downloadUrl: "https://github.com/RomainFleury/libthirdspacevest-simhub/releases",
  githubUrl: "https://github.com/RomainFleury/libthirdspacevest-simhub/tree/master/superhot-mod",
  installInstructions: [
    "Install MelonLoader 0.7.0+ from https://github.com/LavaGang/MelonLoader/releases",
    "Download ThirdSpace_SuperhotVR.dll from releases",
    "Copy to SUPERHOT VR/Mods/ folder",
    "Start the Third Space daemon",
    "Launch SUPERHOT VR",
  ],
};

export function SuperHotIntegrationPage() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    enable,
    disable,
    clearEvents,
  } = useSuperHotIntegration();

  // Convert to GameIntegrationStatus format
  const integrationStatus = {
    running: status.enabled,
    events_received: status.events_received,
    last_event_ts: status.last_event_ts,
  };

  // Convert events
  const events: GameEvent[] = gameEvents.map((e, idx) => ({
    id: `superhot-${idx}-${e.timestamp}`,
    type: e.event_type,
    ts: e.timestamp,
  }));

  // Setup guide
  const setupGuide = (
    <div className="space-y-3 text-sm text-slate-400">
      <p>
        SUPERHOT VR uses MelonLoader for mod injection. The mod automatically connects 
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
