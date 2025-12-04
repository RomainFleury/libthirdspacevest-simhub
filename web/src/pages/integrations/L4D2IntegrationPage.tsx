import { useL4D2Integration } from "../../hooks/useL4D2Integration";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent, EventDisplayInfo } from "../../types/integratedGames";
import { useState } from "react";

const game = getIntegratedGame("l4d2")!;

// Event type to display info mapping
// Keys match event types from the daemon (player_damage, player_death, etc.)
const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  player_damage: { label: "Damage Taken", icon: "💥", color: "text-red-400" },
  player_death: { label: "Player Killed", icon: "💀", color: "text-red-500" },
  player_incap: { label: "Incapacitated", icon: "🩸", color: "text-orange-500" },
  adrenaline_used: { label: "Adrenaline", icon: "💉", color: "text-yellow-400" },
  health_pickup: { label: "Health Pickup", icon: "🩹", color: "text-green-300" },
  player_healed: { label: "Healed", icon: "💚", color: "text-green-400" },
  ammo_pickup: { label: "Ammo Pickup", icon: "🔫", color: "text-blue-300" },
  weapon_fire: { label: "Weapon Fire", icon: "🔫", color: "text-slate-400" },
  infected_spawn: { label: "Infected Spawn", icon: "👾", color: "text-purple-400" },
  infected_hit: { label: "Hit Infected", icon: "🎯", color: "text-green-400" },
  player_kill: { label: "Player Kill", icon: "☠️", color: "text-emerald-400" },
  teammate_death: { label: "Teammate Death", icon: "💔", color: "text-gray-400" },
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
    gameDir,
    modStatus,
    start,
    stop,
    clearEvents,
    browseLogPath,
    browseGameDir,
    installMod,
  } = useL4D2Integration();

  const [installMessage, setInstallMessage] = useState<string | null>(null);

  // Handle mod installation
  const handleInstallMod = async () => {
    setInstallMessage(null);
    const result = await installMod();
    if (result.success) {
      setInstallMessage(`✓ Mod installed successfully! Files copied: ${result.copiedFiles?.join(', ')}`);
    } else {
      setInstallMessage(`✗ Installation failed: ${result.error}`);
    }
  };

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
      {/* Mod Installation Section */}
      <div className="rounded-lg bg-slate-800/60 p-4 ring-1 ring-white/10">
        <h4 className="text-sm font-medium text-slate-200 mb-3">📦 VScript Mod Installation</h4>
        
        {/* Game Directory */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 block mb-1">L4D2 Game Directory</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={gameDir}
              readOnly
              placeholder="Click 'Browse' to select left4dead2 folder"
              className="flex-1 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10"
            />
            <button
              onClick={browseGameDir}
              disabled={isLoading}
              className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Select the <code className="bg-slate-700 px-1 rounded">left4dead2</code> folder inside your L4D2 installation
          </p>
        </div>

        {/* Mod Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            {modStatus.installed ? (
              <span className="text-emerald-400">✓ Mod is installed</span>
            ) : gameDir ? (
              <span className="text-yellow-400">⚠ Mod not installed</span>
            ) : (
              <span className="text-slate-500">Select game directory first</span>
            )}
          </div>
          <button
            onClick={handleInstallMod}
            disabled={isLoading || !gameDir}
            className="rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {modStatus.installed ? 'Reinstall Mod' : 'Install Mod'}
          </button>
        </div>

        {/* Install Message */}
        {installMessage && (
          <p className={`text-xs mt-2 ${installMessage.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
            {installMessage}
          </p>
        )}
      </div>

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
        Left 4 Dead 2 integration requires a VScript mod and console logging enabled.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-slate-400">
        <li>
          <strong className="text-slate-300">Install the VScript mod:</strong>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Select your L4D2 game directory above</li>
            <li>Click "Install Mod" to copy the scripts automatically</li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-300">Enable console logging:</strong>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Steam → Right-click L4D2 → Properties → Launch Options</li>
            <li>Add: <code className="bg-slate-700 px-1 rounded">-condebug</code></li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-300">Start the game:</strong>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Launch L4D2 and start a Campaign game</li>
            <li>The mod auto-loads in Campaign mode</li>
          </ul>
        </li>
        <li>
          <strong className="text-slate-300">Activate haptics:</strong>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Click "Start" in this app</li>
            <li>Take damage in-game to feel the haptic feedback!</li>
          </ul>
        </li>
      </ol>
      <div className="rounded-lg bg-amber-900/30 ring-1 ring-amber-500/30 p-3 mt-4">
        <p className="text-amber-200 text-xs">
          <strong>⚠️ Important:</strong> The mod only works in <strong>Campaign mode</strong> (not Versus, Survival, etc.). 
          The VScript hooks are only enabled in Scripted Mode which Campaign uses.
        </p>
      </div>
      <p className="text-slate-500 text-xs mt-2">
        💡 Haptic events: Taking damage (directional), incapacitation, death, adrenaline injection
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
