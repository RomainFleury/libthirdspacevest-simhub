import type { ScreenHealthStoredProfile } from "../../../../lib/bridgeApi";

export function ProfileControlsSection(props: {
  profiles: ScreenHealthStoredProfile[];
  activeProfileId: string | null;
  setActive: (id: string) => void;
  onNew: () => void;
  onExport: () => void;
  onImport: () => void;
  onDelete: () => void;
  profileName: string;
  setProfileName: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { profiles, activeProfileId, setActive, onNew, onExport, onImport, onDelete, profileName, setProfileName, onSave, saving } =
    props;

  return (
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
          onClick={onNew}
          className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          New
        </button>
        <button
          onClick={onExport}
          disabled={!activeProfileId}
          className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
        >
          Export
        </button>
        <button
          onClick={onImport}
          className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          Import
        </button>
        <button
          onClick={onDelete}
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
            onClick={onSave}
            disabled={!activeProfileId || saving}
            className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

