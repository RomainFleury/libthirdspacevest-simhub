import { useScreenHealthHealthNumberDraft, useScreenHealthHealthNumberDraftControls } from "../draft/HealthNumberDraftContext";
import { useScreenHealthCalibration } from "../draft/CalibrationContext";
import { learnDigitTemplatesFromCanvas, tryReadDigitValueFromCanvas } from "../templateLearning";

export function HealthNumberSettings() {
  const state = useScreenHealthHealthNumberDraft();
  const {
    setDigits,
    setThreshold,
    setScale,
    setInvert,
    setReadMin,
    setReadMax,
    setStableReads,
    setHammingMax,
    setTemplateSize,
    setHitMinDrop,
    setHitCooldownMs,
    setLearnValue,
    setTemplates,
    setCalibrationError,
    setTestResult,
    clearTemplates,
  } = useScreenHealthHealthNumberDraftControls();
  const { getCanvasOrThrow } = useScreenHealthCalibration();
  const learnedDigits = Object.keys(state.templates).sort().join(", ");

  const onLearn = () => {
    setCalibrationError(null);
    setTestResult(null);
    if (!state.roi) throw new Error("No health number ROI set");
    const canvas = getCanvasOrThrow();
    const digitsCount = Math.max(1, Math.floor(state.digits));
    const next = learnDigitTemplatesFromCanvas({
      canvas,
      roi: state.roi,
      digitsCount,
      displayedValue: state.learnValue,
      threshold: state.threshold,
      invert: state.invert,
      scale: state.scale,
      templateSize: state.templateSize,
      prevTemplates: state.templates,
    });
    setTemplates(next);
  };

  const onTest = () => {
    setCalibrationError(null);
    setTestResult(null);
    if (!state.roi) throw new Error("No health number ROI set");
    const canvas = getCanvasOrThrow();
    const digitsCount = Math.max(1, Math.floor(state.digits));
    const result = tryReadDigitValueFromCanvas({
      canvas,
      roi: state.roi,
      digitsCount,
      threshold: state.threshold,
      invert: state.invert,
      scale: state.scale,
      templateSize: state.templateSize,
      templates: state.templates,
      hammingMax: state.hammingMax,
    });
    setTestResult(result);
  };

  const p = {
    ...state,
    templateW: state.templateSize.w,
    templateH: state.templateSize.h,
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
            onChange={(e) => setDigits(parseInt(e.target.value, 10) || 1)}
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
            onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Scale (int)</label>
          <input
            type="number"
            min={1}
            value={p.scale}
            onChange={(e) => setScale(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Invert</label>
        <input
          type="checkbox"
          checked={p.invert}
          onChange={(e) => setInvert(e.target.checked)}
          className="h-4 w-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout min</label>
          <input
            type="number"
            value={p.readMin}
            onChange={(e) => setReadMin(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout max</label>
          <input
            type="number"
            value={p.readMax}
            onChange={(e) => setReadMax(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Stable reads</label>
          <input
            type="number"
            min={1}
            value={p.stableReads}
            onChange={(e) => setStableReads(parseInt(e.target.value, 10) || 1)}
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
            onChange={(e) => setHammingMax(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Template width</label>
          <input
            type="number"
            min={4}
            value={p.templateW}
            onChange={(e) => setTemplateSize({ w: Math.max(4, parseInt(e.target.value, 10) || 4), h: state.templateSize.h })}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Template height</label>
          <input
            type="number"
            min={4}
            value={p.templateH}
            onChange={(e) => setTemplateSize({ w: state.templateSize.w, h: Math.max(4, parseInt(e.target.value, 10) || 4) })}
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
            onChange={(e) => setHitMinDrop(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hit cooldown (ms)</label>
          <input
            type="number"
            min={0}
            value={p.hitCooldownMs}
            onChange={(e) => setHitCooldownMs(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-white/5 space-y-2">
        <div className="text-sm text-white font-medium">Template learning</div>
        <div className="text-xs text-slate-400">Draw the digits ROI, type the number currently shown, then Learn.</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={state.learnValue}
            onChange={(e) => setLearnValue(e.target.value)}
            placeholder={`e.g. ${"7".repeat(Math.max(1, Math.floor(p.digits)))}`}
            className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
          <button
            onClick={() => {
              try {
                onLearn();
              } catch (e) {
                setCalibrationError(e instanceof Error ? e.message : "Failed to learn templates");
              }
            }}
            className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
          >
            Learn from screenshot
          </button>
          <button
            onClick={() => {
              try {
                onTest();
              } catch (e) {
                setCalibrationError(e instanceof Error ? e.message : "Failed to test OCR");
              }
            }}
            className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
          >
            Test OCR once
          </button>
          <button onClick={clearTemplates} className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600">
            Clear templates
          </button>
        </div>
        {state.calibrationError && <div className="text-xs text-rose-300">{state.calibrationError}</div>}
        {state.testResult && (
          <div className="text-xs text-slate-300">
            Test result:{" "}
            {typeof state.testResult.value === "number"
              ? `value=${state.testResult.value}`
              : `no match${state.testResult.reason ? ` (${state.testResult.reason})` : ""}`}
          </div>
        )}
        <div className="text-xs text-slate-500">
          Learned digits: <span className="font-mono text-slate-300">{learnedDigits || "(none)"}</span>
        </div>
      </div>
    </div>
  );
}

