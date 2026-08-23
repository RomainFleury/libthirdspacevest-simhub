import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useScreenHealthProfiles } from "../../hooks/screenHealth/useScreenHealthProfiles";
import { useScreenHealthDaemonStatus } from "../../hooks/screenHealth/useScreenHealthDaemonStatus";
export function ScreenHealthPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profiles = useScreenHealthProfiles();
  const daemon = useScreenHealthDaemonStatus();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    daemon.refreshStatus();
  }, [daemon.refreshStatus]);

  useEffect(() => {
    if (id) {
      profiles.getProfile(id);
    }
  }, [id, profiles]);

  const profile = id ? profiles.profiles.find((p) => p.id === id) : null;

  const isDisabled = daemon.status.running;
  const isLocal = profile?.type === "local";

  const handleDelete = async () => {
    if (!profile || !isLocal) return;
    if (!confirm(`Are you sure you want to delete "${profile.name}"?`)) {
      return;
    }
    setDeleting(true);
    try {
      await profiles.deleteProfile(profile.id);
      navigate("/games/screen_health/settings");
    } catch (e) {
      console.error("Failed to delete profile:", e);
    } finally {
      setDeleting(false);
    }
  };

  if (!id) {
    return (
      <div className="w-full">
        <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
          <span className="text-6xl mb-4 block">❌</span>
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-slate-400 mb-6">No profile ID provided.</p>
          <Link
            to="/games/screen_health/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600/80 px-4 py-2 font-medium text-white transition hover:bg-blue-600"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full">
        <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
          <span className="text-6xl mb-4 block">⏳</span>
          <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
          <p className="text-slate-400">Loading profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white text-lg font-semibold">Profile Preview</div>
          <div className="text-slate-400 text-sm">{profile.name}</div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/games/screen_health/settings"
            className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:bg-slate-700"
          >
            ← Back to Settings
          </Link>
          {isLocal && (
            <button
              onClick={() => navigate(`/games/screen_health/builder?from=${profile.id}`)}
              disabled={isDisabled}
              className="rounded-lg bg-blue-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {isDisabled && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Stop screen health to access profile actions
          </div>
        </div>
      )}

      {/* Profile Info */}
      <section className="rounded-2xl bg-slate-800/80 p-4 md:p-6 shadow-lg ring-1 ring-white/5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">Name:</span>
            <span className="text-slate-300">{profile.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                profile.type === "preset"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-purple-500/20 text-purple-300"
              }`}
            >
              {profile.type === "preset" ? "Global" : "Local"}
            </span>
          </div>
          {isLocal && profile.updatedAt && (
            <div className="text-sm text-slate-400">
              Updated: {new Date(profile.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
      </section>

      {/* Profile JSON */}
      <section className="rounded-2xl bg-slate-800/80 p-4 md:p-6 shadow-lg ring-1 ring-white/5">
        <h2 className="text-lg font-semibold text-white mb-4">Profile Configuration</h2>
        <pre className="rounded-lg bg-slate-900/50 p-4 text-xs text-slate-300 overflow-auto max-h-96">
          {JSON.stringify(profile.profile, null, 2)}
        </pre>
      </section>

      {isLocal && (
        <section className="rounded-2xl bg-slate-800/80 p-4 md:p-6 shadow-lg ring-1 ring-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDelete}
              disabled={isDisabled || deleting}
              className="rounded-lg bg-rose-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Profile"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
