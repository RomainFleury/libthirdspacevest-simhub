import {
  useScreenHealthColorVignetteDraft,
  useScreenHealthColorVignetteDraftControls,
} from "../draft/ColorVignetteDraftContext";
import { useScreenHealthHealthBarDraftControls } from "../draft/HealthBarDraftContext";
import { parseRgbTriplet } from "../utils";

export function ColorVignetteSettings() {
  const state = useScreenHealthColorVignetteDraft();
  const { setMinScore, setCooldownMs, setTargetRgb, setToleranceL1, setPickingColor } =
    useScreenHealthColorVignetteDraftControls();
  const { setColorPickMode } = useScreenHealthHealthBarDraftControls();

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Matches a picked tint in the boxes (orange, white flash, purple, and so on) instead of red-only dominance.
        Pick the vignette color from a screenshot taken while you are taking damage.
      </p>
      <div>
        <label className="text-sm text-slate-400 block mb-1">Target RGB</label>
        <div className="flex items-center gap-2">
          <input
            value={state.targetRgb.join(",")}
            onChange={(e) => {
              const parsed = parseRgbTriplet(e.target.value);
              if (parsed) setTargetRgb(parsed);
            }}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
          <div
            className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/10"
            style={{ backgroundColor: `rgb(${state.targetRgb[0]},${state.targetRgb[1]},${state.targetRgb[2]})` }}
          />
          <button
            type="button"
            onClick={() => {
              setColorPickMode(null);
              setPickingColor(!state.pickingColor);
            }}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
            title="Pick from screenshot"
          >
            {state.pickingColor ? "Picking…" : "Pick"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Tolerance L1 (0..765)</label>
          <input
            type="number"
            min={0}
            max={765}
            value={state.toleranceL1}
            onChange={(e) => setToleranceL1(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Min match score (0-1)</label>
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
    </div>
  );
}
