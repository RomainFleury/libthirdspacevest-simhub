export function ProfileControlsSection(props: {
  onExport: () => void;
  profileName: string;
  setProfileName: (v: string) => void;
  onTest?: () => void;
  testing?: boolean;
}) {
  const {
    onExport,
    profileName,
    setProfileName,
    onTest,
    testing,
  } = props;

  return (
    <div className="space-y-3">
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
            onClick={onExport}
            className="rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
          >
            Export JSON
          </button>
          {onTest && (
            <button
              onClick={onTest}
              disabled={testing}
              className="rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
              title="Ask the daemon to validate and run one evaluation pass (captures ROI crops and returns timings)."
            >
              {testing ? "Testing..." : "Test config"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

