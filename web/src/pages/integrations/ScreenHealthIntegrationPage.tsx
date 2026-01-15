import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent } from "../../types/integratedGames";
import { useScreenHealthIntegration } from "../../hooks/useScreenHealthIntegration";
import { EVENT_DISPLAY_MAP } from "./screenHealth/constants";

const game = getIntegratedGame("screen_health")!;

export function ScreenHealthIntegrationPage() {
  const integration = useScreenHealthIntegration();
  const navigate = useNavigate();
  const [browsingProfileId, setBrowsingProfileId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Initialize browsing profile to first available profile
  useEffect(() => {
    if (!browsingProfileId && integration.profiles.length > 0) {
      setBrowsingProfileId(integration.profiles[0].id);
    }
  }, [browsingProfileId, integration.profiles]);

  const handleUseProfile = () => {
    if (browsingProfileId) {
      setSelectedProfileId(browsingProfileId);
    }
  };

  const selectedProfile = selectedProfileId
    ? integration.profiles.find((p) => p.id === selectedProfileId)
    : null;

  const profileSelector = (
    <div className="space-y-2 flex-1">
      <label className="text-sm font-medium text-white">Profile</label>
      <div className="flex gap-2">
        <select
          value={browsingProfileId}
          onChange={(e) => setBrowsingProfileId(e.target.value)}
          className="flex-1 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {integration.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} {profile.type === "preset" ? "[Global]" : "[Local]"}
            </option>
          ))}
        </select>
        <button
          onClick={handleUseProfile}
          disabled={!browsingProfileId || browsingProfileId === selectedProfileId}
          className="rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          title="Use this profile for starting screen health"
        >
          Use this one
        </button>
      </div>
      {selectedProfile && (
        <div className="text-xs text-slate-300">
          <span className="font-medium">Active:</span> {selectedProfile.name}{" "}
          {selectedProfile.type === "preset" ? "(Global preset)" : "(Local profile)"}
        </div>
      )}
      {!selectedProfile && (
        <div className="text-xs text-slate-400">No profile selected. Choose one and click "Use this one".</div>
      )}
    </div>
  );

  const configurationPanel = null; // Removed - profile selection is now in main controls

  const setupGuide = (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">
        This integration detects <span className="text-white font-medium">hits</span> by watching on-screen regions
        (ROIs). It does not require a mod.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-slate-400">
        <li>Run your game in borderless/windowed mode (recommended for capture reliability).</li>
        <li>Open “Calibration & settings”.</li>
        <li>Capture a screenshot and draw ROIs for your detector.</li>
        <li>Tune settings and export the JSON (developer workflow).</li>
        <li>Click “Start” to enable the watcher in the daemon.</li>
      </ol>
      <p className="text-slate-500 text-xs">Tip: Use “Capture ROI crop(s)” to verify you’re sampling the right pixels.</p>
    </div>
  );

  const additionalStats = (
    <div className="space-y-2">
      <div className="rounded-lg bg-slate-700/30 px-4 py-2">
        <span className="text-slate-400 text-sm">Profile:</span>{" "}
        <span className="font-mono text-white">{integration.status.profile_name ?? "(none)"}</span>
      </div>
      {integration.latestDebug && Object.keys(integration.latestDebug).length > 0 && (
        <div className="rounded-lg bg-slate-700/20 px-4 py-2 text-xs text-slate-300">
          <div className="text-slate-400 mb-1">Live debug (latest)</div>
          <div className="space-y-1">
            {Object.entries(integration.latestDebug)
              .slice(0, 4)
              .map(([det, d]) => (
                <div key={det} className="font-mono">
                  {det}: {d.kind}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  const gameEvents: GameEvent[] = integration.events.map((e) => ({
    id: e.id,
    type: e.type,
    ts: e.ts,
    params: {
      roi: e.roi,
      direction: e.direction,
      score: e.score,
      detector: e.detector,
      health_percent: e.health_percent,
      health_value: e.health_value,
      debug_kind: e.debug_kind,
      debug: e.debug,
    },
  }));

  const formatEventDetails = (e: GameEvent) => {
    const roi = e.params?.roi as string | undefined;
    const direction = e.params?.direction as string | undefined;
    const score = e.params?.score as number | undefined;
    const detector = e.params?.detector as string | undefined;
    const hp = e.params?.health_percent as number | undefined;
    const hv = e.params?.health_value as number | undefined;
    const dk = e.params?.debug_kind as string | undefined;
    const dbg = e.params?.debug as Record<string, unknown> | undefined;
    const parts = [];
    if (roi) parts.push(`roi=${roi}`);
    if (direction) parts.push(`dir=${direction}`);
    if (typeof score === "number") parts.push(`score=${score.toFixed(3)}`);
    if (typeof hp === "number") parts.push(`hp=${(hp * 100).toFixed(1)}%`);
    if (typeof hv === "number") parts.push(`hv=${hv}`);
    if (detector) parts.push(`det=${detector}`);
    if (dk) parts.push(`kind=${dk}`);
    if (dbg && typeof dbg.saved_filename === "string") parts.push(`file=${dbg.saved_filename}`);
    return parts.join(" ");
  };

  return (
    <>

      <GameIntegrationPage
        game={game}
        status={integration.status}
        loading={integration.loading}
        error={integration.error}
        events={gameEvents}
        eventDisplayMap={EVENT_DISPLAY_MAP}
        onStart={selectedProfileId ? () => integration.start(selectedProfileId) : undefined}
        onStop={integration.stop}
        onClearEvents={integration.clearEvents}
        formatEventDetails={formatEventDetails}
        configurationPanel={configurationPanel}
        setupGuide={setupGuide}
        additionalStats={additionalStats}
      >
            {/* Profile Selector Section */}
      <section className="max-w-4xl mx-auto rounded-2xl bg-slate-800/80 p-4 md:p-6 shadow-lg ring-1 ring-white/5">
        <div className="flex flex-wrap items-center gap-4">
          {profileSelector}
          <button
            onClick={() => navigate("/games/screen_health/settings")}
            disabled={integration.status.running}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title={integration.status.running ? "Stop screen health to access settings" : "Open settings"}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </section>
    </GameIntegrationPage>
    </>
  );
}

