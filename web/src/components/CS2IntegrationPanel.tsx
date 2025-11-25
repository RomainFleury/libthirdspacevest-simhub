import { useCS2Integration, CS2GameEvent } from "../hooks/useCS2Integration";

// Event type to display info mapping
const EVENT_INFO: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  damage: { label: "Damage", icon: "💥", color: "text-red-400" },
  death: { label: "Death", icon: "💀", color: "text-red-500" },
  flash: { label: "Flashbang", icon: "✨", color: "text-yellow-400" },
  bomb_planted: { label: "Bomb Planted", icon: "💣", color: "text-orange-400" },
  bomb_exploded: { label: "Bomb Exploded", icon: "🔥", color: "text-orange-500" },
  round_start: { label: "Round Start", icon: "🎯", color: "text-green-400" },
  kill: { label: "Kill", icon: "🎖️", color: "text-blue-400" },
};

function getEventInfo(type: string) {
  return EVENT_INFO[type] || { label: type, icon: "📡", color: "text-slate-400" };
}

function formatEventDetails(event: CS2GameEvent): string {
  if (event.type === "damage" && event.amount) {
    return `${event.amount} HP`;
  }
  if (event.type === "flash" && event.intensity) {
    return `intensity ${event.intensity}`;
  }
  return "";
}

export function CS2IntegrationPanel() {
  const {
    status,
    gsiPort,
    setGsiPort,
    loading,
    error,
    gameEvents,
    start,
    stop,
    generateConfig,
    clearEvents,
    // Config path management
    configPath,
    configExists,
    saveSuccess,
    autoDetect,
    browseForPath,
    saveConfigToCS2,
    clearSaveSuccess,
  } = useCS2Integration();

  const handleDownloadConfig = async () => {
    const result = await generateConfig();
    if (result) {
      // Create and trigger download
      const blob = new Blob([result.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Game Integration
          </p>
          <h2 className="text-xl font-semibold text-white">
            Counter-Strike 2
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
            status.running
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-500/20 text-slate-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status.running ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          {status.running ? "Running" : "Stopped"}
        </span>
      </header>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Success display */}
      {saveSuccess && (
        <div className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 flex items-center justify-between">
          <span>✅ {saveSuccess}</span>
          <button
            onClick={clearSaveSuccess}
            className="text-emerald-400 hover:text-emerald-300"
          >
            ×
          </button>
        </div>
      )}

      {/* CS2 Config Path */}
      <div className="mb-4 rounded-xl bg-slate-900/50 p-3">
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          CS2 Config Folder
        </h3>
        <div className="space-y-2">
          {/* Path display */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={configPath || ""}
              readOnly
              placeholder="Not set - click Browse or Auto-detect"
              className="flex-1 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none"
            />
            <button
              onClick={browseForPath}
              disabled={loading}
              className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              Browse
            </button>
            <button
              onClick={autoDetect}
              disabled={loading}
              className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
              title="Auto-detect CS2 installation folder"
            >
              Auto
            </button>
          </div>

          {/* Config status and save button */}
          <div className="flex items-center gap-3">
            {configPath && (
              <span className="text-xs text-slate-500">
                {configExists ? (
                  <span className="text-emerald-400">✓ Config file exists</span>
                ) : (
                  <span className="text-amber-400">⚠ No config file yet</span>
                )}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={saveConfigToCS2}
              disabled={loading || !configPath}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
              title={configPath ? "Save config directly to CS2 folder" : "Set CS2 folder first"}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save to CS2
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 space-y-3">
        {/* GSI Port input */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400 min-w-[80px]">GSI Port</label>
          <input
            type="number"
            value={gsiPort}
            onChange={(e) => setGsiPort(parseInt(e.target.value, 10) || 3000)}
            disabled={status.running || loading}
            min={1024}
            max={65535}
            className="w-24 rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="text-xs text-slate-500">
            {status.running && status.gsi_port
              ? `Listening on :${status.gsi_port}`
              : "Default: 3000"}
          </span>
        </div>

        {/* Start/Stop buttons */}
        <div className="flex gap-3">
          {!status.running ? (
            <button
              onClick={start}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600/80 px-4 py-2 font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {loading ? "Starting..." : "Start GSI"}
            </button>
          ) : (
            <button
              onClick={stop}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600/80 px-4 py-2 font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              {loading ? "Stopping..." : "Stop GSI"}
            </button>
          )}

          <button
            onClick={handleDownloadConfig}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-600/80 px-4 py-2 font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
            title="Download config file to save manually"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Stats */}
      {status.running && (
        <div className="mb-4 flex gap-4 text-sm">
          <div className="rounded-lg bg-slate-700/30 px-3 py-2">
            <span className="text-slate-400">Events:</span>{" "}
            <span className="font-mono text-white">
              {status.events_received ?? 0}
            </span>
          </div>
          {status.last_event_ts && (
            <div className="rounded-lg bg-slate-700/30 px-3 py-2">
              <span className="text-slate-400">Last:</span>{" "}
              <span className="font-mono text-white">
                {new Date(status.last_event_ts * 1000).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Live Events */}
      <div className="rounded-xl bg-slate-900/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">Live Events</h3>
          {gameEvents.length > 0 && (
            <button
              onClick={clearEvents}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto">
          {gameEvents.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              {status.running
                ? "Waiting for CS2 events..."
                : "Start GSI to see live events"}
            </p>
          ) : (
            <ul className="space-y-1">
              {gameEvents.map((event) => {
                const info = getEventInfo(event.type);
                const details = formatEventDetails(event);
                return (
                  <li
                    key={event.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5 text-sm"
                  >
                    <span className="text-base">{info.icon}</span>
                    <span className={`font-medium ${info.color}`}>
                      {info.label}
                    </span>
                    {details && (
                      <span className="text-slate-400">({details})</span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">
                      {new Date(event.ts).toLocaleTimeString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
