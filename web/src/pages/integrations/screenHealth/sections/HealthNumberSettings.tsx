import { useScreenHealthConfig } from "../state/context";

export function HealthNumberSettings(props: { onLearn: () => void; onTest: () => void; onClearTemplates: () => void; learnedDigits: string }) {
  const { onLearn, onTest, onClearTemplates, learnedDigits } = props;
  const { state, dispatch } = useScreenHealthConfig();
  const p = {
    ...state.healthNumber,
    digits: state.healthNumber.digits,
    templateW: state.healthNumber.templateSize.w,
    templateH: state.healthNumber.templateSize.h,
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Digits</label>
          <input
            type="number"
            min={1}
            value={p.digits}
            onChange={(e) => dispatch({ type: "setHealthNumberDigits", value: parseInt(e.target.value, 10) || 1 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Threshold (0..1)</label>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={p.threshold}
            onChange={(e) => dispatch({ type: "setHealthNumberThreshold", value: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Scale (int)</label>
          <input
            type="number"
            min={1}
            value={p.scale}
            onChange={(e) => dispatch({ type: "setHealthNumberScale", value: parseInt(e.target.value, 10) || 1 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Invert</label>
        <input
          type="checkbox"
          checked={p.invert}
          onChange={(e) => dispatch({ type: "setHealthNumberInvert", value: e.target.checked })}
          className="h-4 w-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout min</label>
          <input
            type="number"
            value={p.readMin}
            onChange={(e) => dispatch({ type: "setHealthNumberReadMin", value: parseInt(e.target.value, 10) || 0 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout max</label>
          <input
            type="number"
            value={p.readMax}
            onChange={(e) => dispatch({ type: "setHealthNumberReadMax", value: parseInt(e.target.value, 10) || 0 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Stable reads</label>
          <input
            type="number"
            min={1}
            value={p.stableReads}
            onChange={(e) => dispatch({ type: "setHealthNumberStableReads", value: parseInt(e.target.value, 10) || 1 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hamming max</label>
          <input
            type="number"
            min={0}
            value={p.hammingMax}
            onChange={(e) => dispatch({ type: "setHealthNumberHammingMax", value: parseInt(e.target.value, 10) || 0 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Template width</label>
          <input
            type="number"
            min={4}
            value={p.templateW}
            onChange={(e) =>
              dispatch({
                type: "setHealthNumberTemplateSize",
                value: { w: Math.max(4, parseInt(e.target.value, 10) || 4), h: state.healthNumber.templateSize.h },
              })
            }
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Template height</label>
          <input
            type="number"
            min={4}
            value={p.templateH}
            onChange={(e) =>
              dispatch({
                type: "setHealthNumberTemplateSize",
                value: { w: state.healthNumber.templateSize.w, h: Math.max(4, parseInt(e.target.value, 10) || 4) },
              })
            }
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hit min drop (HP)</label>
          <input
            type="number"
            min={1}
            value={p.hitMinDrop}
            onChange={(e) => dispatch({ type: "setHealthNumberHitMinDrop", value: parseInt(e.target.value, 10) || 1 })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hit cooldown (ms)</label>
          <input
            type="number"
            min={0}
            value={p.hitCooldownMs}
            onChange={(e) =>
              dispatch({ type: "setHealthNumberHitCooldownMs", value: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-white/5 space-y-2">
        <div className="text-sm text-white font-medium">Template learning</div>
        <div className="text-xs text-slate-400">Draw the digits ROI, type the number currently shown, then Learn.</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={state.healthNumber.learnValue}
            onChange={(e) => dispatch({ type: "setHealthNumberLearnValue", value: e.target.value })}
            placeholder={`e.g. ${"7".repeat(Math.max(1, Math.floor(p.digits)))}`}
            className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
          <button onClick={onLearn} className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600">
            Learn from screenshot
          </button>
          <button onClick={onTest} className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600">
            Test OCR once
          </button>
          <button onClick={onClearTemplates} className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600">
            Clear templates
          </button>
        </div>
        {state.healthNumber.calibrationError && <div className="text-xs text-rose-300">{state.healthNumber.calibrationError}</div>}
        {state.healthNumber.testResult && (
          <div className="text-xs text-slate-300">
            Test result:{" "}
            {typeof state.healthNumber.testResult.value === "number"
              ? `value=${state.healthNumber.testResult.value}`
              : `no match${state.healthNumber.testResult.reason ? ` (${state.healthNumber.testResult.reason})` : ""}`}
          </div>
        )}
        <div className="text-xs text-slate-500">
          Learned digits: <span className="font-mono text-slate-300">{learnedDigits || "(none)"}</span>
        </div>
      </div>
    </div>
  );
}

