import { useScreenHealthConfig } from "../state/context";

export function DetectorSelectionSection() {
  const { state, dispatch } = useScreenHealthConfig();
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white">Detector</h3>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-slate-400">Type</label>
        <select
          value={state.detectorType}
          onChange={(e) => dispatch({ type: "setDetectorType", value: e.target.value as any })}
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          <option value="redness_rois">Red vignette (ROIs)</option>
          <option value="health_bar">Health bar (horizontal)</option>
          <option value="health_number">Health number (digits-only OCR)</option>
        </select>
      </div>
    </div>
  );
}

