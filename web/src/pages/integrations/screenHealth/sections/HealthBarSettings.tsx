import { useScreenHealthHealthBarDraft, useScreenHealthHealthBarDraftControls } from "../draft/HealthBarDraftContext";
import { parseRgbTriplet } from "../utils";

export function HealthBarSettings() {
  const healthBar = useScreenHealthHealthBarDraft();
  const { setMode, setFallbackMode, setFallbackMin, setFilledRgb, setEmptyRgb, setToleranceL1, setHitMinDrop, setHitCooldownMs, setColorPickMode } =
    useScreenHealthHealthBarDraftControls();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-400">Mode</label>
        <select
          value={healthBar.mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          <option value="color_sampling">Color sampling</option>
          <option value="threshold_fallback">Threshold fallback</option>
        </select>
        <div className="text-xs text-slate-500">
          {healthBar.mode === "color_sampling"
            ? "Recommended: sample filled/empty colors."
            : "Fallback: uses brightness/saturation, less precise but easy to configure."}
        </div>
      </div>

      {healthBar.mode === "threshold_fallback" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Fallback mode</label>
            <select
              value={healthBar.fallbackMode}
              onChange={(e) => setFallbackMode(e.target.value as any)}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            >
              <option value="brightness">brightness</option>
              <option value="saturation">saturation</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Fallback min (0..1)</label>
            <input
              type="number"
              step={0.01}
              min={0}
              max={1}
              value={healthBar.fallbackMin}
              onChange={(e) => setFallbackMin(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Filled RGB</label>
          <div className="flex items-center gap-2">
            <input
              value={healthBar.filledRgb.join(",")}
              onChange={(e) => {
                const parsed = parseRgbTriplet(e.target.value);
                if (parsed) setFilledRgb(parsed);
              }}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            />
            <div
              className="h-9 w-9 rounded-lg ring-1 ring-white/10"
              style={{ backgroundColor: `rgb(${healthBar.filledRgb[0]},${healthBar.filledRgb[1]},${healthBar.filledRgb[2]})` }}
            />
            <button
              onClick={() => setColorPickMode(healthBar.colorPickMode === "filled" ? null : "filled")}
              className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
              disabled={healthBar.mode !== "color_sampling"}
              title={healthBar.mode !== "color_sampling" ? "Switch to Color sampling to pick colors" : "Pick from screenshot"}
            >
              {healthBar.colorPickMode === "filled" ? "Picking…" : "Pick"}
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Empty RGB</label>
          <div className="flex items-center gap-2">
            <input
              value={healthBar.emptyRgb.join(",")}
              onChange={(e) => {
                const parsed = parseRgbTriplet(e.target.value);
                if (parsed) setEmptyRgb(parsed);
              }}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            />
            <div
              className="h-9 w-9 rounded-lg ring-1 ring-white/10"
              style={{ backgroundColor: `rgb(${healthBar.emptyRgb[0]},${healthBar.emptyRgb[1]},${healthBar.emptyRgb[2]})` }}
            />
            <button
              onClick={() => setColorPickMode(healthBar.colorPickMode === "empty" ? null : "empty")}
              className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
              disabled={healthBar.mode !== "color_sampling"}
              title={healthBar.mode !== "color_sampling" ? "Switch to Color sampling to pick colors" : "Pick from screenshot"}
            >
              {healthBar.colorPickMode === "empty" ? "Picking…" : "Pick"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Tolerance L1 (0..765)</label>
          <input
            type="number"
            min={0}
            max={765}
            value={healthBar.toleranceL1}
            onChange={(e) => setToleranceL1(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            disabled={healthBar.mode !== "color_sampling"}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hit min drop (0..1)</label>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={healthBar.hitMinDrop}
            onChange={(e) => setHitMinDrop(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hit cooldown (ms)</label>
          <input
            type="number"
            min={0}
            value={healthBar.hitCooldownMs}
            onChange={(e) => setHitCooldownMs(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>
    </div>
  );
}

