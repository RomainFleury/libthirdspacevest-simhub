export function ScreenshotsSection(props: {
  settings: any;
  updateSettings: (patch: any) => void;
  chooseScreenshotsDir: () => void;
  openScreenshotsDir?: () => void;
  clearScreenshots: () => void;
}) {
  const {
    settings,
    updateSettings,
    chooseScreenshotsDir,
    openScreenshotsDir,
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
        {openScreenshotsDir && (
          <button
            onClick={openScreenshotsDir}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
            title="Open screenshots folder"
          >
            Open folder
          </button>
        )}
        <button
          onClick={() => clearScreenshots()}
          className="rounded-lg bg-rose-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
        >
          Clear all
        </button>
      </div>

      <div className="rounded-xl bg-slate-900/50 p-3 text-sm text-slate-400">
        For performance, screenshots are not listed inline. Use "Open folder" to inspect files in your file manager.
      </div>
    </div>
  );
}
