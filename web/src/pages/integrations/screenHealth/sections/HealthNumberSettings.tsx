export function HealthNumberSettings(props: {
  digits: number;
  setDigits: (v: number) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  scale: number;
  setScale: (v: number) => void;
  invert: boolean;
  setInvert: (v: boolean) => void;
  readMin: number;
  setReadMin: (v: number) => void;
  readMax: number;
  setReadMax: (v: number) => void;
  stableReads: number;
  setStableReads: (v: number) => void;
  hammingMax: number;
  setHammingMax: (v: number) => void;
  templateW: number;
  setTemplateW: (v: number) => void;
  templateH: number;
  setTemplateH: (v: number) => void;
  hitMinDrop: number;
  setHitMinDrop: (v: number) => void;
  hitCooldownMs: number;
  setHitCooldownMs: (v: number) => void;
  learnValue: string;
  setLearnValue: (v: string) => void;
  onLearn: () => void;
  onTest: () => void;
  onClearTemplates: () => void;
  learnedDigits: string;
  error: string | null;
  testResult: { value: number | null; digits?: string; reason?: string } | null;
}) {
  const p = props;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Digits</label>
          <input
            type="number"
            min={1}
            value={p.digits}
            onChange={(e) => p.setDigits(parseInt(e.target.value, 10) || 1)}
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
            onChange={(e) => p.setThreshold(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Scale (int)</label>
          <input
            type="number"
            min={1}
            value={p.scale}
            onChange={(e) => p.setScale(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Invert</label>
        <input type="checkbox" checked={p.invert} onChange={(e) => p.setInvert(e.target.checked)} className="h-4 w-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout min</label>
          <input
            type="number"
            value={p.readMin}
            onChange={(e) => p.setReadMin(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout max</label>
          <input
            type="number"
            value={p.readMax}
            onChange={(e) => p.setReadMax(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Stable reads</label>
          <input
            type="number"
            min={1}
            value={p.stableReads}
            onChange={(e) => p.setStableReads(parseInt(e.target.value, 10) || 1)}
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
            onChange={(e) => p.setHammingMax(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Template width</label>
          <input
            type="number"
            min={4}
            value={p.templateW}
            onChange={(e) => p.setTemplateW(Math.max(4, parseInt(e.target.value, 10) || 4))}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Template height</label>
          <input
            type="number"
            min={4}
            value={p.templateH}
            onChange={(e) => p.setTemplateH(Math.max(4, parseInt(e.target.value, 10) || 4))}
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
            onChange={(e) => p.setHitMinDrop(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hit cooldown (ms)</label>
          <input
            type="number"
            min={0}
            value={p.hitCooldownMs}
            onChange={(e) => p.setHitCooldownMs(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-white/5 space-y-2">
        <div className="text-sm text-white font-medium">Template learning</div>
        <div className="text-xs text-slate-400">Draw the digits ROI, type the number currently shown, then Learn.</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={p.learnValue}
            onChange={(e) => p.setLearnValue(e.target.value)}
            placeholder={`e.g. ${"7".repeat(Math.max(1, Math.floor(p.digits)))}`}
            className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
          <button onClick={p.onLearn} className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600">
            Learn from screenshot
          </button>
          <button onClick={p.onTest} className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600">
            Test OCR once
          </button>
          <button onClick={p.onClearTemplates} className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600">
            Clear templates
          </button>
        </div>
        {p.error && <div className="text-xs text-rose-300">{p.error}</div>}
        {p.testResult && (
          <div className="text-xs text-slate-300">
            Test result:{" "}
            {typeof p.testResult.value === "number"
              ? `value=${p.testResult.value}`
              : `no match${p.testResult.reason ? ` (${p.testResult.reason})` : ""}`}
          </div>
        )}
        <div className="text-xs text-slate-500">
          Learned digits: <span className="font-mono text-slate-300">{p.learnedDigits || "(none)"}</span>
        </div>
      </div>
    </div>
  );
}

