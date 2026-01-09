import { DIRECTION_KEYS } from "../constants";

type RoiDraft = {
  name: string;
  direction?: string | null;
  rect: { x: number; y: number; w: number; h: number };
};

export function RoiListSection(props: {
  detectorType: "redness_rois" | "health_bar" | "health_number";
  monitorIndex: number;
  captureRoiDebugImages: (monitorIndex: number, rois: Array<{ name: string; rect: { x: number; y: number; w: number; h: number } }>) => void;
  rois: RoiDraft[];
  setRois: (updater: (prev: RoiDraft[]) => RoiDraft[]) => void;
  healthBarRoi: { x: number; y: number; w: number; h: number } | null;
  setHealthBarRoi: (v: { x: number; y: number; w: number; h: number } | null) => void;
  healthNumberRoi: { x: number; y: number; w: number; h: number } | null;
  setHealthNumberRoi: (v: { x: number; y: number; w: number; h: number } | null) => void;
}) {
  const { detectorType, monitorIndex, captureRoiDebugImages, rois, setRois, healthBarRoi, setHealthBarRoi, healthNumberRoi, setHealthNumberRoi } =
    props;

  const title =
    detectorType === "health_bar" ? "Health bar ROI" : detectorType === "health_number" ? "Health number ROI" : "ROIs";

  const canCapture =
    detectorType === "health_bar" ? !!healthBarRoi : detectorType === "health_number" ? !!healthNumberRoi : rois.length > 0;

  const capture = () => {
    if (detectorType === "health_bar") {
      if (!healthBarRoi) return;
      captureRoiDebugImages(monitorIndex, [{ name: "health_bar", rect: { ...healthBarRoi } }] as any);
      return;
    }
    if (detectorType === "health_number") {
      if (!healthNumberRoi) return;
      captureRoiDebugImages(monitorIndex, [{ name: "health_number", rect: { ...healthNumberRoi } }] as any);
      return;
    }
    if (rois.length) captureRoiDebugImages(monitorIndex, rois as any);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          onClick={capture}
          disabled={!canCapture}
          className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
          title="Capture current ROI crops for debugging"
        >
          Capture ROI {detectorType === "health_bar" || detectorType === "health_number" ? "crop" : "crops"}
        </button>
      </div>

      {detectorType === "health_bar" ? (
        !healthBarRoi ? (
          <div className="text-sm text-slate-500">No health bar ROI yet. Capture a screenshot and draw one.</div>
        ) : (
          <div className="rounded-lg bg-slate-700/20 p-3 ring-1 ring-white/5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500 font-mono">
                x={healthBarRoi.x.toFixed(3)} y={healthBarRoi.y.toFixed(3)} w={healthBarRoi.w.toFixed(3)} h={healthBarRoi.h.toFixed(3)}
              </div>
              <button
                onClick={() => setHealthBarRoi(null)}
                className="rounded-lg bg-rose-600/70 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
              >
                Clear
              </button>
            </div>
          </div>
        )
      ) : detectorType === "health_number" ? (
        !healthNumberRoi ? (
          <div className="text-sm text-slate-500">No health number ROI yet. Capture a screenshot and draw one.</div>
        ) : (
          <div className="rounded-lg bg-slate-700/20 p-3 ring-1 ring-white/5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500 font-mono">
                x={healthNumberRoi.x.toFixed(3)} y={healthNumberRoi.y.toFixed(3)} w={healthNumberRoi.w.toFixed(3)} h={healthNumberRoi.h.toFixed(3)}
              </div>
              <button
                onClick={() => setHealthNumberRoi(null)}
                className="rounded-lg bg-rose-600/70 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
              >
                Clear
              </button>
            </div>
          </div>
        )
      ) : rois.length === 0 ? (
        <div className="text-sm text-slate-500">No ROIs yet. Capture a screenshot and draw one.</div>
      ) : (
        <div className="space-y-2">
          {rois.map((r, idx) => (
            <div key={`${r.name}-${idx}`} className="rounded-lg bg-slate-700/20 p-3 ring-1 ring-white/5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Name</label>
                  <input
                    value={r.name}
                    onChange={(e) => setRois((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Direction (optional — defaults to random)</label>
                  <select
                    value={r.direction || ""}
                    onChange={(e) => setRois((prev) => prev.map((x, i) => (i === idx ? { ...x, direction: e.target.value } : x)))}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  >
                    {DIRECTION_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k || "(none)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 font-mono">
                    x={r.rect.x.toFixed(3)} y={r.rect.y.toFixed(3)} w={r.rect.w.toFixed(3)} h={r.rect.h.toFixed(3)}
                  </div>
                  <button
                    onClick={() => setRois((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-lg bg-rose-600/70 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

