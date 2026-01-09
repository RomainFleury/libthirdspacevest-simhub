export function DetectorSelectionSection(props: {
  detectorType: "redness_rois" | "health_bar" | "health_number";
  setDetectorType: (v: "redness_rois" | "health_bar" | "health_number") => void;
}) {
  const { detectorType, setDetectorType } = props;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white">Detector</h3>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-slate-400">Type</label>
        <select
          value={detectorType}
          onChange={(e) => setDetectorType(e.target.value as any)}
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

