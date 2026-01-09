export function ScreenshotsSection(props: {
  settings: any;
  updateSettings: (patch: any) => void;
  chooseScreenshotsDir: () => void;
  screenshots: any[];
  screenshotPreview: { filename: string; dataUrl: string } | null;
  loadScreenshotPreview: (filename: string) => void;
  deleteScreenshot: (filename: string) => void;
  clearScreenshots: () => void;
}) {
  const {
    settings,
    updateSettings,
    chooseScreenshotsDir,
    screenshots,
    screenshotPreview,
    loadScreenshotPreview,
    deleteScreenshot,
    clearScreenshots,
  } = props;

  return (
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
  );
}

