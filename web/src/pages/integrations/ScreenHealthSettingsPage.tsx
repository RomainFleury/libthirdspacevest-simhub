import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useScreenHealthProfiles } from "../../hooks/screenHealth/useScreenHealthProfiles";
import { useScreenHealthDaemonStatus } from "../../hooks/screenHealth/useScreenHealthDaemonStatus";

export function ScreenHealthSettingsPage() {
  const profiles = useScreenHealthProfiles();
  const daemon = useScreenHealthDaemonStatus();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    daemon.refreshStatus();
  }, [daemon.refreshStatus]);

  const handleDelete = async (profileId: string) => {
    if (!confirm("Are you sure you want to delete this profile?")) {
      return;
    }
    setDeletingId(profileId);
    try {
      await profiles.deleteProfile(profileId);
    } finally {
      setDeletingId(null);
    }
  };

  const isDisabled = daemon.status.running;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white text-lg font-semibold">Screen Health Settings</div>
          <div className="text-slate-400 text-sm">Manage profiles and configure settings</div>
        </div>
        <Link
          to="/games/screen_health"
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:bg-slate-700"
        >
          ← Back to integration
        </Link>
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
            Stop screen health to access settings
          </div>
        </div>
      )}

      {/* Profile Management Section */}
      <section className="rounded-2xl bg-slate-800/80 p-4 md:p-6 shadow-lg ring-1 ring-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Profile Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => profiles.refreshProfiles()}
              disabled={profiles.loading}
              className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={() => navigate("/games/screen_health/builder")}
              disabled={isDisabled}
              className="rounded-lg bg-emerald-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              Add New Profile
            </button>
          </div>
        </div>

        {profiles.loading && profiles.profiles.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Loading profiles...</div>
        ) : profiles.profiles.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No profiles available</div>
        ) : (
          <div className="space-y-2">
            {profiles.profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg bg-slate-700/30 px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{profile.name}</span>
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
                  {profile.type === "local" && profile.updatedAt && (
                    <div className="text-xs text-slate-400 mt-1">
                      Updated: {new Date(profile.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/games/screen_health/preview/${profile.id}`)}
                    disabled={isDisabled}
                    className="rounded-lg bg-slate-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
                  >
                    View
                  </button>
                  {profile.type === "local" && (
                    <>
                      <button
                        onClick={() => navigate(`/games/screen_health/builder?from=${profile.id}`)}
                        disabled={isDisabled}
                        className="rounded-lg bg-blue-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(profile.id)}
                        disabled={isDisabled || deletingId === profile.id}
                        className="rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
                      >
                        {deletingId === profile.id ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {profiles.error && (
          <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-rose-200 text-sm">
            {profiles.error}
          </div>
        )}
      </section>

      {/* General Settings Section (placeholder for future) */}
      <section className="rounded-2xl bg-slate-800/80 p-4 md:p-6 shadow-lg ring-1 ring-white/5">
        <h2 className="text-lg font-semibold text-white mb-4">General Settings</h2>
        <div className="text-slate-400 text-sm">Additional settings will be available here in the future.</div>
      </section>
    </div>
  );
}
