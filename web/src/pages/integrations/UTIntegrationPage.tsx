import { useUTIntegration } from "../../hooks/useUTIntegration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo } from "../../types/integratedGames";

const game = getIntegratedGame("ut")!;

// Event type to display info mapping
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  PlayerDamage: { label: "Damage Taken", icon: "💥", color: "text-red-400" },
  PlayerDeath: { label: "Player Killed", icon: "💀", color: "text-red-500" },
  WeaponFire: { label: "Weapon Fire", icon: "🔫", color: "text-slate-400" },
  Dodge: { label: "Dodge", icon: "💨", color: "text-blue-400" },
  JumpBoots: { label: "Jump Boots", icon: "🦿", color: "text-yellow-400" },
  ShieldBelt: { label: "Shield Belt", icon: "🛡️", color: "text-cyan-400" },
  FlagGrab: { label: "Flag Grabbed", icon: "🚩", color: "text-orange-400" },
  FlagCapture: { label: "Flag Captured", icon: "🏆", color: "text-emerald-400" },
  FlagReturn: { label: "Flag Returned", icon: "↩️", color: "text-blue-300" },
  KillingSpree: { label: "Killing Spree", icon: "🔥", color: "text-orange-500" },
  MultiKill: { label: "Multi Kill", icon: "⚡", color: "text-yellow-500" },
  Headshot: { label: "Headshot", icon: "🎯", color: "text-red-300" },
  Translocator: { label: "Translocator", icon: "🌀", color: "text-purple-400" },
  ImpactHammer: { label: "Impact Hammer", icon: "🔨", color: "text-gray-400" },
  HealthPack: { label: "Health Pickup", icon: "💚", color: "text-green-400" },
  ArmorPickup: { label: "Armor Pickup", icon: "🛡️", color: "text-blue-300" },
};

function formatEventDetails(event: GameEvent): string {
  const params = event.params as {
    damage?: number;
    attacker?: string;
    direction?: number;
    weapon?: string;
    killer?: string;
    headshot?: boolean;
    team?: string;
    count?: number;
    amount?: number;
    type?: string;
    hand?: string;
  };
  
  if (event.type === "PlayerDamage" && params?.damage) {
    const parts: string[] = [`${params.damage} HP`];
    if (params.attacker) parts.push(`by ${params.attacker}`);
    if (params.weapon) parts.push(`(${params.weapon})`);
    return parts.join(" ");
  }
  if (event.type === "PlayerDeath") {
    const parts: string[] = [];
    if (params?.killer) parts.push(`by ${params.killer}`);
    if (params?.weapon) parts.push(`(${params.weapon})`);
    if (params?.headshot) parts.push("💀");
    return parts.join(" ");
  }
  if (event.type === "WeaponFire" && params?.weapon) {
    return params.weapon;
  }
  if (event.type === "Dodge" && params?.direction) {
    return params.direction as unknown as string;
  }
  if (event.type === "KillingSpree" && params?.count) {
    const labels: Record<number, string> = {
      3: "Killing Spree!",
      4: "Rampage!",
      5: "Dominating!",
      6: "Unstoppable!",
      7: "Godlike!",
    };
    return labels[params.count] || `${params.count} kills!`;
  }
  if (event.type === "MultiKill" && params?.count) {
    const labels: Record<number, string> = {
      2: "Double Kill!",
      3: "Multi Kill!",
      4: "Ultra Kill!",
      5: "Monster Kill!",
    };
    return labels[params.count] || `${params.count}x Kill!`;
  }
  if (event.type === "FlagGrab" && params?.team) {
    return `${params.team} Flag`;
  }
  if (event.type === "FlagCapture" && params?.team) {
    return `${params.team} Flag Captured!`;
  }
  if (event.type === "HealthPack" && params?.amount) {
    return `+${params.amount} HP`;
  }
  if (event.type === "ArmorPickup" && params?.type) {
    return params.type;
  }
  return "";
}

export function UTIntegrationPage() {
  const {
    status,
    isLoading,
    error,
    gameEvents,
    logPath,
    setLogPath,
    start,
    stop,
    clearEvents,
    browseLogPath,
  } = useUTIntegration();

  // Convert UT events to generic GameEvent format
  const events: GameEvent[] = gameEvents.map((e, i) => ({
    id: `ut-${e.timestamp}-${i}`,
    type: e.event,
    ts: e.timestamp,
    params: e.params as Record<string, unknown>,
  }));

  // Configuration panel
  const configurationPanel = (
    <div className="space-y-4">
      {/* Log Path */}
      <div>
        <label className="text-sm text-slate-400 block mb-2">Game Log Path</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={logPath}
            onChange={(e) => setLogPath(e.target.value || null)}
            placeholder="Auto-detect (tries multiple UT versions)"
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
        <p className="text-xs text-slate-500 mt-1">
          Default paths tried: UT Alpha, UT3, UT2004, UT99
        </p>
      </div>
    </div>
  );

  // Setup guide
  const setupGuide = (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">
        Unreal Tournament integration monitors the game log for events and triggers haptic feedback.
      </p>
      
      <div className="rounded-lg bg-slate-700/30 p-3">
        <h4 className="font-medium text-slate-200 mb-2">📍 Supported Games</h4>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li><strong className="text-slate-300">UT Alpha (2014)</strong> - %LOCALAPPDATA%\UnrealTournament\Saved\Logs\</li>
          <li><strong className="text-slate-300">UT3</strong> - Documents\My Games\Unreal Tournament 3\UTGame\Logs\</li>
          <li><strong className="text-slate-300">UT2004</strong> - UT2004\Logs\</li>
          <li><strong className="text-slate-300">UT99</strong> - UnrealTournament\Logs\</li>
        </ul>
      </div>
      
      <ol className="list-decimal list-inside space-y-2 text-slate-400">
        <li>
          <strong className="text-slate-300">Start the integration:</strong>
          <p className="ml-4 mt-1">Click "Start" above - the integration will auto-detect your game log.</p>
        </li>
        <li>
          <strong className="text-slate-300">Launch Unreal Tournament:</strong>
          <p className="ml-4 mt-1">Start a match and experience haptic feedback!</p>
        </li>
      </ol>

      <div className="rounded-lg bg-blue-900/30 ring-1 ring-blue-500/30 p-3 mt-4">
        <h4 className="font-medium text-blue-200 mb-2">🎮 Haptic Events</h4>
        <ul className="list-disc list-inside space-y-1 text-blue-300/80 text-xs">
          <li><strong>Damage:</strong> Directional haptics based on hit angle</li>
          <li><strong>Weapons:</strong> Recoil feedback per weapon type</li>
          <li><strong>Movement:</strong> Dodge direction feedback, jump boots</li>
          <li><strong>CTF:</strong> Flag grabs, captures, returns</li>
          <li><strong>Pickups:</strong> Health, armor, power-ups</li>
          <li><strong>Sprees:</strong> Killing sprees, multi-kills</li>
        </ul>
      </div>

      <div className="rounded-lg bg-amber-900/30 ring-1 ring-amber-500/30 p-3 mt-4">
        <p className="text-amber-200 text-xs">
          <strong>💡 Enhanced Mode:</strong> For more detailed events, install the optional ThirdSpaceVest mutator. 
          Without the mutator, basic events are parsed from native game logs.
        </p>
      </div>
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
