import { useScreenHealthRednessDraftActions, useScreenHealthRednessDraftState } from "../draft/RednessDraftContext";

export function RednessSettings() {
  const state = useScreenHealthRednessDraftState();
  const { setMinScore, setCooldownMs } = useScreenHealthRednessDraftActions();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-slate-400 block mb-1">Min redness score (0-1)</label>
        <input
          type="number"
          step={0.01}
          min={0}
          max={1}
          value={state.minScore}
          onChange={(e) => setMinScore(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        />
      </div>
      <div>
        <label className="text-sm text-slate-400 block mb-1">Cooldown (ms)</label>
        <input
          type="number"
          min={0}
          value={state.cooldownMs}
          onChange={(e) => setCooldownMs(parseInt(e.target.value, 10) || 0)}
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        />
      </div>
    </div>
  );
}

