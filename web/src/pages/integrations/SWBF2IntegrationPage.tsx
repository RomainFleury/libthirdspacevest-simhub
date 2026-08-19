import { useState } from "react";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import { useSWBF2Integration } from "../../hooks/useSWBF2Integration";
import type { SWBF2Settings } from "../../lib/bridgeApi";
import type { EventDisplayInfo, GameEvent } from "../../types/integratedGames";

const game = getIntegratedGame("swbf2")!;

const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  shot_fired: { label: "Shot accepted", icon: "🔫", color: "text-amber-300" },
  damage_received: { label: "Damage received", icon: "💥", color: "text-red-400" },
  player_killed: { label: "Player killed", icon: "💀", color: "text-red-500" },
  player_spawned: { label: "Player spawned", icon: "✨", color: "text-emerald-400" },
};

const STATE_LABELS: Record<string, string> = {
  stopped: "Stopped",
  waiting_for_server: "Waiting for KYBER server",
  waiting_for_player: "Waiting for configured player",
  subscribing: "Subscribing to player",
  subscribed: "Subscribed",
  ambiguous_player_name: "Duplicate player names",
};

function formatEventDetails(event: GameEvent): string {
  const params = event.params as Record<string, unknown>;
  if (event.type === "damage_received") {
    return `${params.amount ?? "?"} damage, ${params.health_remaining ?? "?"} health remaining`;
  }
  if (params.weapon) {
    return String(params.weapon);
  }
  return "";
}

export function SWBF2IntegrationPage() {
  const {
    settings,
    setSettings,
    saveSettings,
    status,
    gameEvents,
    clearEvents,
    isLoading,
    error,
    start,
    stop,
    installPlugin,
  } = useSWBF2Integration();
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  const updateSettings = (partial: Partial<SWBF2Settings>) => {
    setSettings((previous) => ({ ...previous, ...partial }));
  };

  const events: GameEvent[] = gameEvents.map((event, index) => ({
    id: `swbf2-${event.timestamp}-${index}`,
    type: event.event,
    ts: event.timestamp,
    params: event.params,
  }));

  const handleInstall = async () => {
    setInstallMessage(null);
    const result = await installPlugin();
    if (result?.success) {
      setInstallMessage(`Plugin copied to ${result.destination}`);
    } else if (!result?.canceled) {
      setInstallMessage(result?.error || "Plugin installation failed");
    }
  };

  const configurationPanel = (
    <div className="space-y-5">
      <div className="rounded-lg bg-slate-800/60 p-4 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium text-slate-200">KYBER server plugin</h4>
            <p className="mt-1 text-xs text-slate-500">
              Select the KYBER dedicated server&apos;s plugins directory.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Install plugin
          </button>
        </div>
        {installMessage && <p className="mt-2 text-xs text-slate-300">{installMessage}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <label className="space-y-1.5">
          <span className="text-sm text-slate-400">KYBER server IP or hostname</span>
          <input
            value={settings.host}
            disabled={status.running}
            onChange={(event) => updateSettings({ host: event.target.value })}
            onBlur={() => saveSettings(settings)}
            placeholder="192.168.1.50"
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 disabled:opacity-60"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-slate-400">Port</span>
          <input
            type="number"
            min={1}
            max={65535}
            value={settings.port}
            disabled={status.running}
            onChange={(event) => updateSettings({ port: Number(event.target.value) || 5051 })}
            onBlur={() => saveSettings(settings)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10 disabled:opacity-60"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm text-slate-400">Exact in-game display name</span>
        <input
          value={settings.playerName}
          disabled={status.running}
          onChange={(event) => updateSettings({ playerName: event.target.value })}
          onBlur={() => saveSettings(settings)}
          placeholder="Player name shown in KYBER"
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 disabled:opacity-60"
        />
        <p className="text-xs text-slate-500">
          The daemon waits for this name to appear, then subscribes using its KYBER account ID.
        </p>
      </label>

      <div className="rounded-lg bg-slate-900/40 p-4 ring-1 ring-white/10">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-slate-500">State:</span>{" "}
            <span className="text-slate-200">
              {STATE_LABELS[status.connection_state] || status.connection_state}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Matched player:</span>{" "}
            <span className="text-slate-200">{status.matched_player_name || "None"}</span>
          </div>
          <div>
            <span className="text-slate-500">Player ID:</span>{" "}
            <span className="font-mono text-xs text-slate-300">
              {status.matched_player_id || "None"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Roster:</span>{" "}
            <span className="text-slate-200">{status.players?.length || 0} players</span>
          </div>
          <div>
            <span className="text-slate-500">Reconnects:</span>{" "}
            <span className="text-slate-200">{status.reconnect_count}</span>
          </div>
          <div>
            <span className="text-slate-500">Sequence gaps:</span>{" "}
            <span className="text-slate-200">{status.sequence_gaps}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/60 p-4 ring-1 ring-white/10">
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-200">Solenoid recoil on accepted shots</div>
            <div className="text-xs text-slate-500">Requires a relay configured on the Recoil page.</div>
          </div>
          <input
            type="checkbox"
            checked={settings.solenoidRecoil.enabled}
            disabled={status.running}
            onChange={(event) =>
              updateSettings({
                solenoidRecoil: {
                  ...settings.solenoidRecoil,
                  enabled: event.target.checked,
                },
              })
            }
            onBlur={() => saveSettings(settings)}
          />
        </label>
      </div>
    </div>
  );

  const setupGuide = (
    <div className="space-y-3 text-sm text-slate-400">
      <ol className="list-decimal list-inside space-y-2">
        <li>Host a password-protected KYBER server on the trusted LAN.</li>
        <li>Install and enable the bundled ThirdSpaceVestTelemetry server plugin.</li>
        <li>Allow TCP port 5051 from the private LAN only; do not Internet-forward it.</li>
        <li>Enter the server address and your exact in-game display name above.</li>
        <li>Start this integration before or after joining the match.</li>
      </ol>
      <div className="rounded-lg bg-amber-900/20 p-3 text-xs text-amber-200 ring-1 ring-amber-500/30">
        Exact shot and nonlethal-damage events require the companion native KYBER extension.
        The bundled Lua plugin alone still supports roster binding, spawn, and death events.
        Never use native hooks in official EA matchmaking.
      </div>
    </div>
  );

  const additionalStats = (
    <div className="rounded-lg bg-slate-700/30 px-4 py-2 text-sm">
      <span className="text-slate-400">KYBER:</span>{" "}
      <span className="text-white">
        {STATE_LABELS[status.connection_state] || status.connection_state}
      </span>
    </div>
  );

  return (
    <GameIntegrationPage
      game={game}
      status={{
        running: status.running,
        events_received: status.events_received,
        last_event_ts: status.last_event_ts ?? null,
        last_event_type: status.last_event_type ?? null,
      }}
      loading={isLoading}
      error={error}
      events={events}
      eventDisplayMap={EVENT_DISPLAY_MAP}
      onStart={start}
      onStop={stop}
      onClearEvents={clearEvents}
      formatEventDetails={formatEventDetails}
      configurationPanel={configurationPanel}
      setupGuide={setupGuide}
      additionalStats={additionalStats}
    />
  );
}
