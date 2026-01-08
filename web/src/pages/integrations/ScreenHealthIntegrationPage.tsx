import { useEffect, useMemo, useRef, useState } from "react";
import { GameIntegrationPage } from "../../components/GameIntegrationPage";
import { getIntegratedGame } from "../../data/integratedGames";
import type { EventDisplayInfo, GameEvent } from "../../types/integratedGames";
import { useScreenHealthIntegration } from "../../hooks/useScreenHealthIntegration";

const game = getIntegratedGame("screen_health")!;

const EVENT_DISPLAY_MAP: Record<string, EventDisplayInfo> = {
  hit_recorded: { label: "Hit", icon: "💥", color: "text-red-400" },
};

const DIRECTION_KEYS = [
  "",
  "front",
  "back",
  "left",
  "right",
  "front_left",
  "front_right",
  "back_left",
  "back_right",
];

type RoiDraft = {
  name: string;
  direction?: string | null;
  rect: { x: number; y: number; w: number; h: number };
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function ScreenHealthIntegrationPage() {
  const {
    status,
    loading,
    error,
    events,
    clearEvents,
    profiles,
    activeProfileId,
    activeProfile,
    saveProfile,
    deleteProfile,
    setActive,
    exportProfile,
    importProfile,
    settings,
    updateSettings,
    chooseScreenshotsDir,
    screenshots,
    screenshotPreview,
    loadScreenshotPreview,
    deleteScreenshot,
    clearScreenshots,
    lastCapturedImage,
    captureCalibrationScreenshot,
    captureRoiDebugImages,
    start,
    stop,
  } = useScreenHealthIntegration();

  // Draft editor state (derived from activeProfile)
  const [profileName, setProfileName] = useState<string>("Default");
  const [monitorIndex, setMonitorIndex] = useState<number>(1);
  const [tickMs, setTickMs] = useState<number>(50);
  const [minScore, setMinScore] = useState<number>(0.35);
  const [cooldownMs, setCooldownMs] = useState<number>(200);
  const [rois, setRois] = useState<RoiDraft[]>([]);

  useEffect(() => {
    if (!activeProfile?.profile) return;
    const p = activeProfile.profile;
    setProfileName(activeProfile.name || p.name || "Unnamed Profile");
    setMonitorIndex(Number(p.capture?.monitor_index || 1));
    setTickMs(Number(p.capture?.tick_ms || 50));
    const det = Array.isArray(p.detectors) ? p.detectors.find((d: any) => d.type === "redness_rois") : null;
    setMinScore(Number(det?.threshold?.min_score ?? 0.35));
    setCooldownMs(Number(det?.cooldown_ms ?? 200));
    const srcRois: any[] = Array.isArray(det?.rois) ? det.rois : [];
    setRois(
      srcRois.map((r, idx) => ({
        name: String(r.name || `roi_${idx}`),
        direction: r.direction || "",
        rect: {
          x: Number(r.rect?.x ?? 0),
          y: Number(r.rect?.y ?? 0),
          w: Number(r.rect?.w ?? 0.1),
          h: Number(r.rect?.h ?? 0.1),
        },
      }))
    );
  }, [activeProfile]);

  const daemonProfile = useMemo(() => {
    return {
      schema_version: 0,
      name: profileName,
      capture: {
        source: "monitor",
        monitor_index: monitorIndex,
        tick_ms: tickMs,
      },
      detectors: [
        {
          type: "redness_rois",
          cooldown_ms: cooldownMs,
          threshold: { min_score: minScore },
          rois: rois.map((r) => ({
            name: r.name,
            direction: r.direction || undefined,
            rect: {
              x: clamp01(r.rect.x),
              y: clamp01(r.rect.y),
              w: clamp01(r.rect.w),
              h: clamp01(r.rect.h),
            },
          })),
        },
      ],
    };
  }, [profileName, monitorIndex, tickMs, cooldownMs, minScore, rois]);

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!activeProfileId) return;
    setSaving(true);
    try {
      await saveProfile({
        id: activeProfileId,
        name: profileName,
        profile: daemonProfile,
        createdAt: activeProfile?.createdAt,
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleNewProfile = async () => {
    const saved = await saveProfile({
      name: `Profile ${profiles.length + 1}`,
      profile: daemonProfile,
    } as any);
    await setActive(saved.id);
  };

  const handleCapture = async () => {
    await captureCalibrationScreenshot(monitorIndex);
  };

  // ROI drawing on lastCapturedImage
  const imgContainerRef = useRef<HTMLDivElement | null>(null);
  const [drawing, setDrawing] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing({ startX: x, startY: y, curX: x, curY: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing({ ...drawing, curX: x, curY: y });
  };

  const handleMouseUp = () => {
    if (!drawing || !imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x1 = Math.min(drawing.startX, drawing.curX);
    const y1 = Math.min(drawing.startY, drawing.curY);
    const x2 = Math.max(drawing.startX, drawing.curX);
    const y2 = Math.max(drawing.startY, drawing.curY);
    const w = x2 - x1;
    const h = y2 - y1;
    setDrawing(null);
    if (w < 5 || h < 5) return;

    const roi: RoiDraft = {
      name: `roi_${rois.length + 1}`,
      direction: "",
      rect: {
        x: clamp01(x1 / rect.width),
        y: clamp01(y1 / rect.height),
        w: clamp01(w / rect.width),
        h: clamp01(h / rect.height),
      },
    };
    setRois((prev) => [...prev, roi]);
  };

  const configurationPanel = (
    <div className="space-y-6">
      {/* Profile controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-400">Active profile</label>
          <select
            value={activeProfileId || ""}
            onChange={(e) => setActive(e.target.value)}
            className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleNewProfile}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
          >
            New
          </button>
          <button
            onClick={() => activeProfileId && exportProfile(activeProfileId)}
            disabled={!activeProfileId}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
          >
            Export
          </button>
          <button
            onClick={importProfile}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
          >
            Import
          </button>
          <button
            onClick={() => activeProfileId && deleteProfile(activeProfileId)}
            disabled={!activeProfileId || profiles.length <= 1}
            className="rounded-lg bg-rose-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
            title={profiles.length <= 1 ? "Keep at least one profile" : "Delete profile"}
          >
            Delete
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Profile name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSave}
              disabled={!activeProfileId || saving}
              className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Capture settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Monitor index</label>
          <input
            type="number"
            min={1}
            value={monitorIndex}
            onChange={(e) => setMonitorIndex(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Tick (ms)</label>
          <input
            type="number"
            min={10}
            value={tickMs}
            onChange={(e) => setTickMs(parseInt(e.target.value, 10) || 50)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleCapture}
            className="rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            Capture screenshot
          </button>
        </div>
      </div>

      {/* Screenshot + ROI editor */}
      {lastCapturedImage && (
        <div className="space-y-3">
          <div className="text-sm text-slate-400">
            Drag on the image to add ROIs. (Saved ROIs will be sent to the daemon when you click Start.)
          </div>
          <div
            ref={imgContainerRef}
            className="relative w-full overflow-hidden rounded-xl ring-1 ring-white/10 bg-slate-900/30"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: "crosshair" }}
          >
            <img src={lastCapturedImage.dataUrl} className="block w-full select-none" draggable={false} />

            {/* Existing ROIs */}
            {rois.map((r, idx) => (
              <div
                key={`${r.name}-${idx}`}
                className="absolute border-2 border-emerald-400/80 bg-emerald-400/10"
                style={{
                  left: `${r.rect.x * 100}%`,
                  top: `${r.rect.y * 100}%`,
                  width: `${r.rect.w * 100}%`,
                  height: `${r.rect.h * 100}%`,
                }}
                title={r.name}
              />
            ))}

            {/* Drawing ROI */}
            {drawing && (
              <div
                className="absolute border-2 border-blue-400/80 bg-blue-400/10"
                style={{
                  left: `${(Math.min(drawing.startX, drawing.curX) / (imgContainerRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
                  top: `${(Math.min(drawing.startY, drawing.curY) / (imgContainerRef.current?.getBoundingClientRect().height || 1)) * 100}%`,
                  width: `${(Math.abs(drawing.curX - drawing.startX) / (imgContainerRef.current?.getBoundingClientRect().width || 1)) * 100}%`,
                  height: `${(Math.abs(drawing.curY - drawing.startY) / (imgContainerRef.current?.getBoundingClientRect().height || 1)) * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Detector settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Min redness score (0-1)</label>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={minScore}
            onChange={(e) => setMinScore(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Cooldown (ms)</label>
          <input
            type="number"
            min={0}
            value={cooldownMs}
            onChange={(e) => setCooldownMs(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      {/* ROIs list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">ROIs</h3>
          <button
            onClick={() => rois.length && captureRoiDebugImages(monitorIndex, rois)}
            disabled={!rois.length}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
            title="Capture current ROI crops for debugging"
          >
            Capture ROI crops
          </button>
        </div>

        {rois.length === 0 ? (
          <div className="text-sm text-slate-500">No ROIs yet. Capture a screenshot and draw one.</div>
        ) : (
          <div className="space-y-2">
            {rois.map((r, idx) => (
              <div key={`${r.name}-${idx}`} className="rounded-lg bg-slate-700/20 p-3 ring-1 ring-white/5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Name</label>
                    <input
                      value={r.name}
                      onChange={(e) =>
                        setRois((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x))
                        )
                      }
                      className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Direction (optional)</label>
                    <select
                      value={r.direction || ""}
                      onChange={(e) =>
                        setRois((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, direction: e.target.value } : x))
                        )
                      }
                      className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                    >
                      {DIRECTION_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k || "(none)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500 font-mono">
                      x={r.rect.x.toFixed(3)} y={r.rect.y.toFixed(3)} w={r.rect.w.toFixed(3)} h={r.rect.h.toFixed(3)}
                    </div>
                    <button
                      onClick={() => setRois((prev) => prev.filter((_, i) => i !== idx))}
                      className="rounded-lg bg-rose-600/70 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screenshot retention + gallery */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Captured screenshots</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={chooseScreenshotsDir}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
          >
            Choose folder
          </button>
          <button
            onClick={() => clearScreenshots()}
            className="rounded-lg bg-rose-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
          >
            Clear all
          </button>
          {settings && (
            <div className="text-xs text-slate-500">
              retention: {settings.retentionMaxCount} files / {settings.retentionMaxAgeDays} days
            </div>
          )}
        </div>

        <div className="rounded-xl bg-slate-900/50 p-3">
          {screenshots.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-4">No screenshots yet.</div>
          ) : (
            <ul className="space-y-2">
              {screenshots.map((s) => (
                <li key={s.filename} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{s.filename}</div>
                    <div className="text-xs text-slate-500 truncate">{s.path}</div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => loadScreenshotPreview(s.filename)}
                      className="rounded-lg bg-slate-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-600"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => deleteScreenshot(s.filename)}
                      className="rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {screenshotPreview && (
          <div className="rounded-xl bg-slate-900/50 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-white">{screenshotPreview.filename}</div>
              <button
                onClick={() => loadScreenshotPreview(screenshotPreview.filename)}
                className="text-xs text-slate-400 hover:text-white"
                title="Refresh preview"
              >
                refresh
              </button>
            </div>
            <img src={screenshotPreview.dataUrl} className="w-full rounded-lg ring-1 ring-white/10" />
          </div>
        )}

        {/* Retention quick edits */}
        {settings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Retention max count</label>
              <input
                type="number"
                min={1}
                value={settings.retentionMaxCount}
                onChange={(e) => updateSettings({ retentionMaxCount: parseInt(e.target.value, 10) || 1 })}
                className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Retention max age (days)</label>
              <input
                type="number"
                min={1}
                value={settings.retentionMaxAgeDays}
                onChange={(e) => updateSettings({ retentionMaxAgeDays: parseInt(e.target.value, 10) || 1 })}
                className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
              />
            </div>
          </div>
        )}
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
        <li>Pick a monitor index and click “Capture screenshot”.</li>
        <li>Drag on the screenshot to draw one or more ROIs where a red “damage” cue appears.</li>
        <li>Tune the threshold/cooldown and click “Save profile”.</li>
        <li>Click “Start” to enable the watcher in the daemon.</li>
      </ol>
      <p className="text-slate-500 text-xs">
        Tip: Use “Capture ROI crops” to verify you’re sampling the right pixels.
      </p>
    </div>
  );

  const additionalStats = (
    <div className="rounded-lg bg-slate-700/30 px-4 py-2">
      <span className="text-slate-400 text-sm">Profile:</span>{" "}
      <span className="font-mono text-white">{status.profile_name ?? "(none)"}</span>
    </div>
  );

  const gameEvents: GameEvent[] = events.map((e) => ({
    id: e.id,
    type: e.type,
    ts: e.ts,
    params: { roi: e.roi, direction: e.direction, score: e.score },
  }));

  const formatEventDetails = (e: GameEvent) => {
    const roi = e.params?.roi as string | undefined;
    const direction = e.params?.direction as string | undefined;
    const score = e.params?.score as number | undefined;
    const parts = [];
    if (roi) parts.push(`roi=${roi}`);
    if (direction) parts.push(`dir=${direction}`);
    if (typeof score === "number") parts.push(`score=${score.toFixed(3)}`);
    return parts.join(" ");
  };

  return (
    <GameIntegrationPage
      game={game}
      status={status}
      loading={loading}
      error={error}
      events={gameEvents}
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

