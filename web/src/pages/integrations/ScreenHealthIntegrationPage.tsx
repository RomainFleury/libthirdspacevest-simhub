import { Link } from "react-router-dom";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { GameEvent } from "../../types/integratedGames";
import { useScreenHealthIntegration } from "../../hooks/useScreenHealthIntegration";
import { EVENT_DISPLAY_MAP } from "./screenHealth/constants";

const game = getIntegratedGame("screen_health")!;

export function ScreenHealthIntegrationPage() {
  const integration = useScreenHealthIntegration();

  const configurationPanel = (
    <div className="space-y-3">
      <div className="text-sm text-slate-400">
        Calibration (screenshots + ROI drawing) is in a separate page to avoid UI freezes.
      </div>
      <Link
        to="/games/screen_health/calibration"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
      >
        Open calibration & settings →
      </Link>
      <div className="text-xs text-slate-500">
        Tip: keep this page open while playing; do calibration once, then come back here.
      </div>
    </div>
  );

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
    <GameIntegrationPage
      game={game}
      status={integration.status}
      loading={integration.loading}
      error={integration.error}
      events={gameEvents}
      eventDisplayMap={EVENT_DISPLAY_MAP}
      onStart={integration.start}
      onStop={integration.stop}
      onClearEvents={integration.clearEvents}
      formatEventDetails={formatEventDetails}
      configurationPanel={configurationPanel}
      setupGuide={setupGuide}
      additionalStats={additionalStats}
    />
  );
}

