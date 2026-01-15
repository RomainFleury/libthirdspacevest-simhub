import { DIRECTION_KEYS } from "../constants";
import { useScreenHealthProfileDraft } from "../draft/ProfileDraftContext";
import { useScreenHealthRednessDraft, useScreenHealthRednessDraftControls } from "../draft/RednessDraftContext";
import { useScreenHealthHealthBarDraft, useScreenHealthHealthBarDraftControls } from "../draft/HealthBarDraftContext";
import { useScreenHealthHealthNumberDraft, useScreenHealthHealthNumberDraftControls } from "../draft/HealthNumberDraftContext";
import { clamp01 } from "../utils";
import type { RoiRect } from "../draft/types";

// Reference resolution for pixel calculations (1920x1080)
const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;

function RoiPreviewInfo({ rect }: { rect: RoiRect }) {
  const percentage = (rect.w * rect.h * 100).toFixed(2);
  const pixelWidth = Math.round(rect.w * REF_WIDTH);
  const pixelHeight = Math.round(rect.h * REF_HEIGHT);
  
  return (
    <div className="text-xs text-slate-400 mt-2 p-2 rounded bg-slate-800/30">
      <div className="font-medium text-slate-300 mb-1">Capture Preview</div>
      <div>
        <span className="text-slate-300">{percentage}%</span> of screen
      </div>
      <div className="text-slate-500">
        For {REF_WIDTH}x{REF_HEIGHT}px screens: {pixelWidth}×{pixelHeight}px
      </div>
    </div>
  );
}

export function RoiListSection(props: {
  captureRoiDebugImages: (monitorIndex: number, rois: Array<{ name: string; rect: { x: number; y: number; w: number; h: number } }>) => void;
}) {
  const { captureRoiDebugImages } = props;
  const profile = useScreenHealthProfileDraft();
  const redness = useScreenHealthRednessDraft();
  const { updateRoi, removeRoi } = useScreenHealthRednessDraftControls();
  const hb = useScreenHealthHealthBarDraft();
  const { setRoi: setHealthBarRoi } = useScreenHealthHealthBarDraftControls();
  const hn = useScreenHealthHealthNumberDraft();
  const { setRoi: setHealthNumberRoi } = useScreenHealthHealthNumberDraftControls();

  const detectorType = profile.detectorType;
  const monitorIndex = profile.monitorIndex;
  const rois = redness.rois;
  const healthBarRoi = hb.roi;
  const healthNumberRoi = hn.roi;

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
          <div className="rounded-lg bg-slate-700/20 p-3 ring-1 ring-white/5 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Horizontal box start (x)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthBarRoi.x}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthBarRoi({ ...healthBarRoi, x: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Vertical box start (y)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthBarRoi.y}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthBarRoi({ ...healthBarRoi, y: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Box width (w)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthBarRoi.w}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthBarRoi({ ...healthBarRoi, w: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Box height (h)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthBarRoi.h}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthBarRoi({ ...healthBarRoi, h: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
            </div>
            <RoiPreviewInfo rect={healthBarRoi} />
            <div className="flex items-center justify-end gap-2">
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
          <div className="rounded-lg bg-slate-700/20 p-3 ring-1 ring-white/5 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Horizontal box start (x)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthNumberRoi.x}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthNumberRoi({ ...healthNumberRoi, x: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Vertical box start (y)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthNumberRoi.y}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthNumberRoi({ ...healthNumberRoi, y: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Box width (w)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthNumberRoi.w}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthNumberRoi({ ...healthNumberRoi, w: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Box height (h)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={healthNumberRoi.h}
                  onChange={(e) => {
                    const val = clamp01(Number(e.target.value));
                    setHealthNumberRoi({ ...healthNumberRoi, h: val });
                  }}
                  className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                />
              </div>
            </div>
            <RoiPreviewInfo rect={healthNumberRoi} />
            <div className="flex items-center justify-end gap-2">
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
            <div key={`${r.name}-${idx}`} className="rounded-lg bg-slate-700/20 p-3 ring-1 ring-white/5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Name</label>
                  <input
                    value={r.name}
                    onChange={(e) => updateRoi(idx, { name: e.target.value })}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Direction (optional — defaults to random)</label>
                  <select
                    value={r.direction || ""}
                    onChange={(e) => updateRoi(idx, { direction: e.target.value })}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  >
                    {DIRECTION_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k || "(none)"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Horizontal box start (x)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={r.rect.x}
                    onChange={(e) => {
                      const val = clamp01(Number(e.target.value));
                      updateRoi(idx, { rect: { ...r.rect, x: val } });
                    }}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Vertical box start (y)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={r.rect.y}
                    onChange={(e) => {
                      const val = clamp01(Number(e.target.value));
                      updateRoi(idx, { rect: { ...r.rect, y: val } });
                    }}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Box width (w)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={r.rect.w}
                    onChange={(e) => {
                      const val = clamp01(Number(e.target.value));
                      updateRoi(idx, { rect: { ...r.rect, w: val } });
                    }}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Box height (h)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={r.rect.h}
                    onChange={(e) => {
                      const val = clamp01(Number(e.target.value));
                      updateRoi(idx, { rect: { ...r.rect, h: val } });
                    }}
                    className="w-full rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
                  />
                </div>
              </div>
              <RoiPreviewInfo rect={r.rect} />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => removeRoi(idx)}
                  className="rounded-lg bg-rose-600/70 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

