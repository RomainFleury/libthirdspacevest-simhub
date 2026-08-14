import { Link } from "react-router-dom";
import { useScreenHealthProfileDraft, useScreenHealthProfileDraftControls } from "../draft/ProfileDraftContext";
import { useScreenHealthRecoilDraft, useScreenHealthRecoilDraftControls } from "../draft/RecoilDraftContext";
import type { RecoilType } from "../draft/types";

export function RecoilSelectionSection() {
  const profile = useScreenHealthProfileDraft();
  const { setCanvasEditTarget } = useScreenHealthProfileDraftControls();
  const state = useScreenHealthRecoilDraft();
  const { setRecoilType, setDurationMs } = useScreenHealthRecoilDraftControls();

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white">Recoil</h3>
      <p className="text-xs text-slate-500">
        Independent of Detector — ammo decreases pulse the solenoid. Choose Windows OCR or OpenCV + kNN on{" "}
        <Link to="/daemon-settings" className="text-blue-400 hover:text-blue-300">
          Daemon Settings
        </Link>
        . Connect the device on the Recoil page first.
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-slate-400">Type</label>
        <select
          value={state.recoilType}
          onChange={(e) => {
            const next = e.target.value as RecoilType;
            setRecoilType(next);
            if (next === "ammo_number") setCanvasEditTarget("recoil");
            else if (profile.canvasEditTarget === "recoil") setCanvasEditTarget("detector");
          }}
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          <option value="off">Off</option>
          <option value="ammo_number">Ammo counter (digits)</option>
        </select>
      </div>
      {state.recoilType === "ammo_number" && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="max-w-xs">
            <label className="text-sm text-slate-400 block mb-1">Pulse duration (ms)</label>
            <input
              type="number"
              min={25}
              max={1000}
              value={state.durationMs}
              onChange={(e) => setDurationMs(Math.max(25, parseInt(e.target.value, 10) || 40))}
              className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
