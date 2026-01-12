import { useScreenHealthProfileDraftActions, useScreenHealthProfileDraftState } from "../draft/ProfileDraftContext";

export function CaptureSettingsSection(props: { onCapture: (monitorIndex: number) => void }) {
  const { onCapture } = props;
  const state = useScreenHealthProfileDraftState();
  const { setMonitorIndex, setTickMs } = useScreenHealthProfileDraftActions();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="text-sm text-slate-400 block mb-1">Monitor index</label>
        <input
          type="number"
          min={1}
          value={state.monitorIndex}
          onChange={(e) => setMonitorIndex(parseInt(e.target.value, 10) || 1)}
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        />
      </div>
      <div>
        <label className="text-sm text-slate-400 block mb-1">Tick (ms)</label>
        <input
          type="number"
          min={10}
          value={state.tickMs}
          onChange={(e) => setTickMs(parseInt(e.target.value, 10) || 50)}
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        />
      </div>
      <div className="flex items-end gap-2">
        <button
          onClick={() => onCapture(state.monitorIndex)}
          className="rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
        >
          Capture screenshot
        </button>
      </div>
    </div>
  );
}

