import { useState } from "react";
import { useScreenHealthProfileDraft, useScreenHealthProfileDraftControls } from "../draft/ProfileDraftContext";

export function CaptureSettingsSection(props: {
  onCapture: (monitorIndex: number) => void;
  onSelectExisting?: () => Promise<any>;
}) {
  const { onCapture, onSelectExisting } = props;
  const state = useScreenHealthProfileDraft();
  const { setMonitorIndex, setTickMs } = useScreenHealthProfileDraftControls();
  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  const handleSelectExisting = async () => {
    if (!onSelectExisting) return;
    setSelecting(true);
    setSelectError(null);
    try {
      const result = await onSelectExisting();
      if (result?.canceled) {
        // User canceled, no error
        return;
      }
    } catch (err: any) {
      setSelectError(err.message || "Failed to load screenshot");
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="space-y-2">
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
          {onSelectExisting && (
            <button
              onClick={handleSelectExisting}
              disabled={selecting}
              className="rounded-lg bg-slate-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              {selecting ? "Selecting..." : "Select existing"}
            </button>
          )}
        </div>
      </div>
      {selectError && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-200 text-sm">
          {selectError}
        </div>
      )}
    </div>
  );
}

