import { SCREEN_HEALTH_PRESETS } from "../../../../data/screenHealthPresets";
import { buildScreenHealthDaemonProfile } from "../buildDaemonProfile";
import {
  useScreenHealthRecoilDraft,
  useScreenHealthRecoilDraftControls,
  type FillUpColorPickMode,
} from "../draft/RecoilDraftContext";
import { useScreenHealthProfileDraftControls } from "../draft/ProfileDraftContext";
import { useScreenHealthColorVignetteDraftControls } from "../draft/ColorVignetteDraftContext";
import { useScreenHealthRednessDraftControls } from "../draft/RednessDraftContext";
import { useScreenHealthHealthBarDraftControls } from "../draft/HealthBarDraftContext";
import { useScreenHealthHealthNumberDraftControls } from "../draft/HealthNumberDraftContext";
import { parseRgbTriplet } from "../utils";

const PRESETS = SCREEN_HEALTH_PRESETS as Array<{ preset_id: string; profile: { meta?: unknown } }>;

function ColorRow(props: {
  label: string;
  rgb: [number, number, number];
  mode: Exclude<FillUpColorPickMode, null>;
  active: FillUpColorPickMode;
  onRgb: (v: [number, number, number]) => void;
  onPick: (mode: FillUpColorPickMode) => void;
}) {
  const { label, rgb, mode, active, onRgb, onPick } = props;
  return (
    <div>
      <label className="text-sm text-slate-400 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          value={rgb.join(",")}
          onChange={(e) => {
            const parsed = parseRgbTriplet(e.target.value);
            if (parsed) onRgb(parsed);
          }}
          className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        />
        <div
          className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/10"
          style={{ backgroundColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` }}
        />
        <button
          type="button"
          onClick={() => onPick(active === mode ? null : mode)}
          className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          {active === mode ? "Picking…" : "Pick"}
        </button>
      </div>
    </div>
  );
}

export function FillUpBarRecoilSettings(props: {
  lastCapturedImage: { path: string } | null;
  evaluateProfileOnScreenshot: (
    profile: Record<string, any>,
    imagePath: string
  ) => Promise<{ success: boolean; test_result?: Record<string, any> | null; error?: string }>;
}) {
  const { lastCapturedImage, evaluateProfileOnScreenshot } = props;
  const state = useScreenHealthRecoilDraft();
  const {
    setDurationMs,
    setHitCooldownMs,
    setFilledRgb,
    setEmptyRgb,
    setOverheatRgb,
    setToleranceL1,
    setMinRise,
    setOverheatMinScore,
    setColorPickMode,
    setCalibrationError,
    setFillUpTestResult,
    readDraft: readRecoilDraft,
  } = useScreenHealthRecoilDraftControls();
  const { readDraft: readProfileDraft } = useScreenHealthProfileDraftControls();
  const { readDraft: readRednessDraft } = useScreenHealthRednessDraftControls();
  const { readDraft: readColorVignetteDraft } = useScreenHealthColorVignetteDraftControls();
  const { readDraft: readHealthBarDraft } = useScreenHealthHealthBarDraftControls();
  const { readDraft: readHealthNumberDraft } = useScreenHealthHealthNumberDraftControls();

  const onTest = async () => {
    setCalibrationError(null);
    setFillUpTestResult(null);
    if (!state.roi) throw new Error("No fill-up ROI set — draw a box on the heat bar");
    const imagePath = lastCapturedImage?.path?.trim();
    if (!imagePath) throw new Error("Capture or select a screenshot first");

    const profile = buildScreenHealthDaemonProfile({
      profileDraft: readProfileDraft(),
      redness: readRednessDraft(),
      colorVignette: readColorVignetteDraft(),
      hb: readHealthBarDraft(),
      hn: readHealthNumberDraft(),
      recoil: readRecoilDraft(),
      presets: PRESETS,
    });
    const result = await evaluateProfileOnScreenshot(profile, imagePath);
    if (!result.success) throw new Error(result.error || "Fill-up test failed");
    const detectors = (result.test_result?.detectors as any[]) || [];
    const bar = detectors.find((d) => d?.type === "fill_up_bar" || d?.name === "fill_up_bar");
    if (!bar) {
      setFillUpTestResult({ percent: null, reason: "No fill_up_bar result in test output" });
      return;
    }
    if (bar.error) {
      setFillUpTestResult({ percent: null, reason: String(bar.error) });
      return;
    }
    setFillUpTestResult({
      percent: typeof bar.percent === "number" ? bar.percent : null,
      overheatScore: typeof bar.overheat_score === "number" ? bar.overheat_score : undefined,
      overheat: Boolean(bar.overheat),
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Draw a tight box on the heat / overheat bar. Fill going dark → white-ish is a shot. When the
        bar turns red it is overheat (no pulse). After it empties / goes white again, the next fill is
        a shot.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ColorRow
          label="Filled RGB (white-ish)"
          rgb={state.filledRgb}
          mode="filled"
          active={state.colorPickMode}
          onRgb={setFilledRgb}
          onPick={setColorPickMode}
        />
        <ColorRow
          label="Empty RGB (dark)"
          rgb={state.emptyRgb}
          mode="empty"
          active={state.colorPickMode}
          onRgb={setEmptyRgb}
          onPick={setColorPickMode}
        />
        <ColorRow
          label="Overheat RGB (red)"
          rgb={state.overheatRgb}
          mode="overheat"
          active={state.colorPickMode}
          onRgb={setOverheatRgb}
          onPick={setColorPickMode}
        />
        <div>
          <label className="text-sm text-slate-400 block mb-1">Tolerance L1 (0..765)</label>
          <input
            type="number"
            min={0}
            max={765}
            value={state.toleranceL1}
            onChange={(e) => setToleranceL1(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Pulse duration (ms)</label>
          <input
            type="number"
            min={25}
            value={state.durationMs}
            onChange={(e) => setDurationMs(Math.max(25, parseInt(e.target.value, 10) || 40))}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Shot cooldown (ms)</label>
          <input
            type="number"
            min={0}
            value={state.hitCooldownMs}
            onChange={(e) => setHitCooldownMs(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Min fill rise (0..1)</label>
          <input
            type="number"
            step={0.01}
            min={0.01}
            max={1}
            value={state.minRise}
            onChange={(e) => setMinRise(Math.max(0.01, Math.min(1, parseFloat(e.target.value) || 0.04)))}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Overheat min score</label>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={state.overheatMinScore}
            onChange={(e) =>
              setOverheatMinScore(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))
            }
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            void onTest().catch((err: unknown) =>
              setCalibrationError(err instanceof Error ? err.message : "Fill-up test failed")
            )
          }
          className="rounded-lg bg-slate-600/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          Test fill-up box
        </button>
        {state.fillUpTestResult && (
          <span className="text-xs text-slate-300">
            {state.fillUpTestResult.reason
              ? state.fillUpTestResult.reason
              : `fill ${((state.fillUpTestResult.percent ?? 0) * 100).toFixed(0)}%${
                  state.fillUpTestResult.overheat ? " · overheat" : ""
                }`}
          </span>
        )}
      </div>
      {state.calibrationError && <p className="text-xs text-rose-300">{state.calibrationError}</p>}
    </div>
  );
}
