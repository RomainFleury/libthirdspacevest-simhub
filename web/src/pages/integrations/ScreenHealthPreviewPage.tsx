import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useScreenHealthProfiles } from "../../hooks/screenHealth/useScreenHealthProfiles";
import { useScreenHealthDaemonStatus } from "../../hooks/screenHealth/useScreenHealthDaemonStatus";
import { screenHealthTest, screenHealthDeleteProfile } from "../../lib/bridgeApi";

export function ScreenHealthPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profiles = useScreenHealthProfiles();
  const daemon = useScreenHealthDaemonStatus();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, any> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
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

  const handleTest = async () => {
    if (!profile) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const result = await screenHealthTest(profile.profile);
      if (!result.success) {
        setTestError(result.error || "Test failed");
      } else {
        setTestResult(result.test_result || null);
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

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
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
          <span className="text-6xl mb-4 block">❌</span>
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-slate-400 mb-6">No profile ID provided.</p>
          <Link
            to="/games/screen_health"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600/80 px-4 py-2 font-medium text-white transition hover:bg-blue-600"
          >
            ← Back to Integration
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
          <span className="text-6xl mb-4 block">⏳</span>
          <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
          <p className="text-slate-400">Loading profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white text-lg font-semibold">Profile Preview</div>
          <div className="text-slate-400 text-sm">{profile.name}</div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/games/screen_health"
            className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:bg-slate-700"
          >
            ← Back
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

      {/* Actions */}
      <section className="rounded-2xl bg-slate-800/80 p-4 md:p-6 shadow-lg ring-1 ring-white/5">
        <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTest}
            disabled={isDisabled || testing}
            className="rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Profile"}
          </button>
          {isLocal && (
            <button
              onClick={handleDelete}
              disabled={isDisabled || deleting}
              className="rounded-lg bg-rose-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Profile"}
            </button>
          )}
        </div>

        {testError && (
          <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-rose-200 text-sm">
            {testError}
          </div>
        )}

        {testResult && (
          <div className="mt-4 rounded-xl bg-slate-900/40 p-3 ring-1 ring-white/5 text-sm">
            <div className="text-white font-medium mb-1">Test Result</div>
            <div className="text-xs text-slate-300 space-y-1">
              <div className="font-mono text-slate-400">
                total_ms={typeof testResult.total_ms === "number" ? testResult.total_ms.toFixed(2) : "?"} output_dir=
                {typeof testResult.output_dir === "string" ? testResult.output_dir : "(none)"}
              </div>
              {Array.isArray(testResult.detectors) && (
                <div className="space-y-1">
                  {testResult.detectors.slice(0, 8).map((d: any, idx: number) => (
                    <div key={idx} className="font-mono text-slate-400">
                      {d.type}:{d.name}{" "}
                      {typeof d.score === "number" ? `score=${d.score.toFixed(3)}` : ""}
                      {typeof d.percent === "number" ? ` percent=${(d.percent * 100).toFixed(1)}%` : ""}
                      {typeof d.read === "number" ? ` read=${d.read}` : d.read === null ? " read=null" : ""}
                      {typeof d.image_path === "string" ? ` file=${d.image_path}` : ""}
                      {typeof d.capture_ms === "number" ? ` cap=${d.capture_ms.toFixed(2)}ms` : ""}
                      {typeof d.eval_ms === "number" ? ` eval=${d.eval_ms.toFixed(2)}ms` : ""}
                    </div>
                  ))}
                </div>
              )}
              {Array.isArray(testResult.errors) && testResult.errors.length > 0 && (
                <div className="text-amber-200/80">
                  {testResult.errors.slice(0, 3).map((e: string, i: number) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
