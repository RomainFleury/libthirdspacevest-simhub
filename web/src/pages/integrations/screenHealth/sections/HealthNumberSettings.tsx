import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SCREEN_HEALTH_PRESETS } from "../../../../data/screenHealthPresets";
import { ocrGetSettings } from "../../../../lib/bridgeApi";
import { buildScreenHealthDaemonProfile } from "../buildDaemonProfile";
import { useScreenHealthHealthNumberDraft, useScreenHealthHealthNumberDraftControls } from "../draft/HealthNumberDraftContext";
import { useScreenHealthProfileDraftControls } from "../draft/ProfileDraftContext";
import { useScreenHealthColorVignetteDraftControls } from "../draft/ColorVignetteDraftContext";
import { useScreenHealthRednessDraftControls } from "../draft/RednessDraftContext";
import { useScreenHealthHealthBarDraftControls } from "../draft/HealthBarDraftContext";
import { useScreenHealthRecoilDraftControls } from "../draft/RecoilDraftContext";

const PRESETS = SCREEN_HEALTH_PRESETS as Array<{ preset_id: string; profile: { meta?: unknown } }>;

export function HealthNumberSettings(props: {
  lastCapturedImage: { path: string } | null;
  evaluateProfileOnScreenshot: (
    profile: Record<string, any>,
    imagePath: string
  ) => Promise<{ success: boolean; test_result?: Record<string, any> | null; error?: string }>;
}) {
  const { lastCapturedImage, evaluateProfileOnScreenshot } = props;
  const state = useScreenHealthHealthNumberDraft();
  const {
    setReadMin,
    setReadMax,
    setStableReads,
    setHitMinDrop,
    setHitCooldownMs,
    setCalibrationError,
    setTestResult,
    readDraft: readHealthNumberDraft,
  } = useScreenHealthHealthNumberDraftControls();
  const { readDraft: readProfileDraft } = useScreenHealthProfileDraftControls();
  const { readDraft: readRednessDraft } = useScreenHealthRednessDraftControls();
  const { readDraft: readColorVignetteDraft } = useScreenHealthColorVignetteDraftControls();
  const { readDraft: readHealthBarDraft } = useScreenHealthHealthBarDraftControls();
  const { readDraft: readRecoilDraft } = useScreenHealthRecoilDraftControls();
  const [activeEngineLabel, setActiveEngineLabel] = useState("Daemon Settings");

  useEffect(() => {
    void (async () => {
      try {
        const result = await ocrGetSettings();
        const active = result.ocr_engines?.find((e) => e.id === result.ocr_engine);
        if (active?.label) setActiveEngineLabel(active.label);
        else if (result.ocr_engine) setActiveEngineLabel(result.ocr_engine);
      } catch {
        /* daemon may be down */
      }
    })();
  }, []);

  const onTest = async () => {
    setCalibrationError(null);
    setTestResult(null);
    if (!state.roi) throw new Error("No health number ROI set — draw it on the calibration image");
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
    if (!result.success) throw new Error(result.error || "OCR test failed");
    const detectors = (result.test_result?.detectors as any[]) || [];
    const health = detectors.find((d) => d?.type === "health_number" || d?.name === "health_number");
    if (!health) {
      setTestResult({ value: null, reason: "No health_number result in test output" });
      return;
    }
    if (health.error) {
      setTestResult({ value: null, reason: String(health.error) });
      return;
    }
    const ocrText = typeof health.ocr_text === "string" ? health.ocr_text : "";
    if (typeof health.read === "number") {
      setTestResult({
        value: health.read,
        digits: String(health.read),
        reason: ocrText ? `ocr="${ocrText}"` : undefined,
      });
    } else {
      setTestResult({
        value: null,
        reason: ocrText
          ? `OCR text="${ocrText}" but no parseable number in readout range`
          : "OCR returned empty (draw a tighter HP ROI, capture a clearer frame, restart daemon)",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-400 space-y-1">
        <p>
          Uses the same engine as ammo recoil: <span className="text-slate-300">{activeEngineLabel}</span> from{" "}
          <Link to="/daemon-settings" className="text-blue-400 hover:text-blue-300">
            Daemon Settings
          </Link>
          . Draw a tight health-number ROI, then Test OCR / Start. Saved template profiles still work if they used
          learned digits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout min</label>
          <input
            type="number"
            value={state.readMin}
            onChange={(e) => setReadMin(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Readout max</label>
          <input
            type="number"
            value={state.readMax}
            onChange={(e) => setReadMax(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Stable reads</label>
          <input
            type="number"
            min={1}
            value={state.stableReads}
            onChange={(e) => setStableReads(parseInt(e.target.value, 10) || 1)}
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
            value={state.hitMinDrop}
            onChange={(e) => setHitMinDrop(parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1">Hit cooldown (ms)</label>
          <input
            type="number"
            min={0}
            value={state.hitCooldownMs}
            onChange={(e) => setHitCooldownMs(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
          />
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-white/5 space-y-2">
        <div className="text-sm text-white font-medium">Test OCR ({activeEngineLabel})</div>
        <div className="text-xs text-slate-400">Runs against the current calibration screenshot via the daemon.</div>
        <button
          onClick={() => {
            void (async () => {
              try {
                await onTest();
              } catch (e) {
                setCalibrationError(e instanceof Error ? e.message : "Failed to test OCR");
              }
            })();
          }}
          className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
        >
          Test OCR once
        </button>
        {state.calibrationError && <div className="text-xs text-rose-300">{state.calibrationError}</div>}
        {state.testResult && (
          <div className="text-xs text-slate-300">
            Test result:{" "}
            {typeof state.testResult.value === "number"
              ? `value=${state.testResult.value}${state.testResult.reason ? ` (${state.testResult.reason})` : ""}`
              : `no match${state.testResult.reason ? ` (${state.testResult.reason})` : ""}`}
          </div>
        )}
      </div>
    </div>
  );
}
