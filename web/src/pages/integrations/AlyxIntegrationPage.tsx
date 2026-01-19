import { useAlyxIntegration, AlyxGameEvent } from "../../hooks/useAlyxIntegration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo, ModInfo } from "../../types/integratedGames";

const game = getIntegratedGame("alyx")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
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

const EFFECT_TOGGLE_ORDER: string[] = [
  // Core
  "PlayerHurt",
  "PlayerDeath",

  // Combat + health
  "PlayerShootWeapon",
  "PlayerHealth",
  "PlayerHeal",
  "PlayerUsingHealthstation",

  // Gravity gloves
  "PlayerGrabbityPull",
  "PlayerGrabbityLockStart",
  "PlayerGrabbityLockStop",
  "GrabbityGloveCatch",

  // Environment / interactions
  "PlayerGrabbedByBarnacle",
  "PlayerReleasedByBarnacle",
  "PlayerCoughStart",
  "PlayerCoughEnd",
  "TwoHandStart",
  "TwoHandEnd",
  "Reset",

  // Backpack / itemholder
  "PlayerDropAmmoInBackpack",
  "PlayerDropResinInBackpack",
  "PlayerRetrievedBackpackClip",
  "PlayerStoredItemInItemholder",
  "PlayerRemovedItemFromItemholder",
  "ItemPickup",
  "ItemReleased",

  // Reload / weapon interactions
  "PlayerPistolClipInserted",
  "PlayerPistolChamberedRound",
  "PlayerShotgunShellLoaded",
  "PlayerShotgunLoadedShells",
  "PlayerShotgunUpgradeGrenadeLauncherState",
];

const EVENT_TOGGLE_LABEL_OVERRIDES: Record<string, string> = {
  PlayerUsingHealthstation: "Use Health Station",
  PlayerGrabbityLockStart: "Gravity Lock Start",
  PlayerGrabbityLockStop: "Gravity Lock Stop",
  PlayerStoredItemInItemholder: "Item Holder Store",
  PlayerRemovedItemFromItemholder: "Item Holder Remove",
  ItemPickup: "Item Pickup",
  ItemReleased: "Item Released",
  PlayerPistolClipInserted: "Pistol Reload: Clip Inserted",
  PlayerPistolChamberedRound: "Pistol Reload: Chamber Round",
  PlayerShotgunShellLoaded: "Shotgun Reload: Shell Loaded",
  PlayerShotgunLoadedShells: "Shotgun Reload: Loaded Shells",
  PlayerShotgunUpgradeGrenadeLauncherState: "Shotgun: Grenade Launcher State",
};

function getToggleLabel(eventType: string): string {
  return EVENT_TOGGLE_LABEL_OVERRIDES[eventType] || EVENT_DISPLAY_MAP[eventType]?.label || eventType;
}

function formatEventDetails(event: GameEvent): string {
  const alyxEvent = event as unknown as AlyxGameEvent;
  if (alyxEvent.type === "PlayerHurt" && alyxEvent.params?.health !== undefined) {
    return `HP: ${alyxEvent.params.health}`;
  }
  if (alyxEvent.type === "PlayerShootWeapon" && alyxEvent.params?.weapon) {
    return String(alyxEvent.params.weapon);
  }
  return "";
}

export function AlyxIntegrationPage() {
  const {
    status,
    loading,
    error,
    gameEvents,
    modInfo,
    savedLogPath,
    enabledEvents,
    restartRequired,
    start,
    stop,
    clearEvents,
    browseLogPath,
    setEventEnabled,
  } = useAlyxIntegration();

  // Convert Alyx events to generic GameEvent format
  const events: GameEvent[] = gameEvents.map(e => ({
    id: e.id,
    type: e.type,
    ts: e.ts,
    params: e.params,
  }));

  // Mod info for setup
  const modInfoData: ModInfo | undefined = modInfo ? {
    name: "bHaptics Tactsuit Mod",
    downloadUrl: modInfo.download_url,
    githubUrl: modInfo.github_url,
    installInstructions: modInfo.install_instructions.map(s => s.replace(/^\d+\.\s*/, "")),
  } : undefined;

  // Configuration panel for log path
  const configurationPanel = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Console Log Path
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={savedLogPath || status.log_path || ""}
            placeholder="Auto-detect or browse to select..."
            className="flex-1 rounded-lg bg-slate-900/50 border border-slate-600 px-3 py-2 text-sm text-slate-300 placeholder-slate-500"
          />
          <button
            onClick={browseLogPath}
            className="rounded-lg bg-slate-600 hover:bg-slate-500 px-4 py-2 text-sm font-medium text-white transition"
          >
            Browse...
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Usually located at: <code className="bg-slate-800 px-1 rounded">Steam/steamapps/common/Half-Life Alyx/game/hlvr/console.log</code>
        </p>
        {savedLogPath && (
          <p className="mt-1 text-xs text-emerald-400">
            ✓ Custom path saved
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-700/60">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">Haptics (per-event)</h3>
          <span className="text-xs text-slate-500">
            Defaults: damage/death ON, others OFF
          </span>
        </div>

        {restartRequired && status.running && (
          <div className="mt-3 rounded-lg bg-amber-900/20 border border-amber-700/30 px-3 py-2 text-xs text-amber-200">
            Settings saved. Stop and Start the Alyx integration to apply changes.
          </div>
        )}

        {!enabledEvents ? (
          <p className="mt-3 text-sm text-slate-500">Loading settings…</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {EFFECT_TOGGLE_ORDER.map((eventType) => {
              const checked = Boolean(enabledEvents[eventType]);
              const label = getToggleLabel(eventType);
              return (
                <label
                  key={eventType}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/40 border border-slate-700/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 truncate">{label}</div>
                    <div className="text-xs text-slate-500 font-mono truncate">{eventType}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setEventEnabled(eventType, e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Setup guide
  const setupGuide = modInfo ? (
    <div className="space-y-3 text-sm">
      {/* Skill manifest snippet */}
      <div>
        <p className="text-slate-300 mb-2">
          Add to <code className="bg-slate-800 px-1 rounded">skill_manifest.cfg</code>:
        </p>
        <pre className="bg-slate-900/50 rounded-lg px-3 py-2 text-slate-300 overflow-x-auto text-xs">
          {modInfo.skill_manifest_addition}
        </pre>
      </div>

      <p className="text-slate-500 text-xs">
        💡 The <code className="bg-slate-800 px-1 rounded">-condebug</code> launch option is required. 
        Use the "Launch via Steam" button to start the game correctly.
      </p>
    </div>
  ) : undefined;

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
      modInfo={modInfoData}
      setupGuide={setupGuide}
      configurationPanel={configurationPanel}
      additionalStats={additionalStats}
    />
  );
}
