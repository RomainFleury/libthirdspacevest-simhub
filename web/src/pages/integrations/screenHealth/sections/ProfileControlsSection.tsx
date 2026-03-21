export function ProfileControlsSection(props: {
  onLoad: () => void;
  onExport: () => void;
  /** Overwrites the open local profile (same storage id). */
  onUpdateProfile?: () => void;
  /** Always creates a new local profile entry. */
  onSaveNewCopy?: () => void;
  saveNewCopyLabel?: string;
  saving?: boolean;
  profileName: string;
  setProfileName: (v: string) => void;
}) {
  const {
    onLoad,
    onExport,
    onUpdateProfile,
    onSaveNewCopy,
    saveNewCopyLabel = "Save a new copy",
    saving,
    profileName,
    setProfileName,
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
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={onLoad}
            className="rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
            title="Load a JSON profile into the current draft (not saved to local list until you save)."
          >
            Load JSON
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
          >
            Export JSON
          </button>
          {onUpdateProfile && (
            <button
              type="button"
              onClick={onUpdateProfile}
              disabled={saving}
              className="rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
              title="Overwrite the local profile you opened (same slot in storage). Renaming updates the stored name."
            >
              {saving ? "Saving…" : "Update"}
            </button>
          )}
          {onSaveNewCopy && (
            <button
              type="button"
              onClick={onSaveNewCopy}
              disabled={saving}
              className="rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
              title="Create a new local profile with the current draft (does not replace the one you are editing)."
            >
              {saving ? "Saving…" : saveNewCopyLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
