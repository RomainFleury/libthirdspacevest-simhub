import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { HealthNumberTestResult, RecoilType, RoiRect } from "./types";
import { DEFAULT_AMMO_OCR_ENGINE, type AmmoOcrEngineId } from "../ammoOcrEngines";

export type FillUpBarTestResult = {
  percent: number | null;
  overheatScore?: number;
  overheat?: boolean;
  reason?: string;
} | null;

export type RecoilDrawKind = "ammo_number" | "fill_up_bar";
export type FillUpColorPickMode = null | "filled" | "empty" | "overheat";

export type RecoilDraftState = {
  recoilType: RecoilType;
  recoilDrawKind: RecoilDrawKind;
  ocrEngine: AmmoOcrEngineId;
  durationMs: number;
  roi: RoiRect | null;
  stableReads: number;
  hitMinDrop: number;
  hitCooldownMs: number;
  filledRgb: [number, number, number];
  emptyRgb: [number, number, number];
  overheatRgb: [number, number, number];
  toleranceL1: number;
  minRise: number;
  overheatMinScore: number;
  emptyThreshold: number;
  colorPickMode: FillUpColorPickMode;
  calibrationError: string | null;
  testResult: HealthNumberTestResult;
  fillUpTestResult: FillUpBarTestResult;
};

type StateCtx = RecoilDraftState;

type ActionsCtx = {
  setRecoilType: (v: RecoilType) => void;
  setRecoilDrawKind: (v: RecoilDrawKind) => void;
  setOcrEngine: (v: AmmoOcrEngineId) => void;
  setDurationMs: (v: number) => void;
  setRoi: (v: RoiRect | null) => void;
  setStableReads: (v: number) => void;
  setHitMinDrop: (v: number) => void;
  setHitCooldownMs: (v: number) => void;
  setFilledRgb: (v: [number, number, number]) => void;
  setEmptyRgb: (v: [number, number, number]) => void;
  setOverheatRgb: (v: [number, number, number]) => void;
  setToleranceL1: (v: number) => void;
  setMinRise: (v: number) => void;
  setOverheatMinScore: (v: number) => void;
  setEmptyThreshold: (v: number) => void;
  setColorPickMode: (v: FillUpColorPickMode) => void;
  setCalibrationError: (v: string | null) => void;
  setTestResult: (v: HealthNumberTestResult) => void;
  setFillUpTestResult: (v: FillUpBarTestResult) => void;
  replaceAll: (next: Partial<RecoilDraftState>) => void;
  readDraft: () => RecoilDraftState;
};

const StateC = createContext<StateCtx | null>(null);
const ActionsC = createContext<ActionsCtx | null>(null);

export const DEFAULT_RECOIL_DRAFT: RecoilDraftState = {
  recoilType: "off",
  recoilDrawKind: "ammo_number",
  ocrEngine: DEFAULT_AMMO_OCR_ENGINE,
  durationMs: 40,
  roi: null,
  stableReads: 2,
  hitMinDrop: 1,
  hitCooldownMs: 50,
  filledRgb: [220, 220, 210],
  emptyRgb: [30, 30, 30],
  overheatRgb: [200, 40, 40],
  toleranceL1: 120,
  minRise: 0.04,
  overheatMinScore: 0.25,
  emptyThreshold: 0.08,
  colorPickMode: null,
  calibrationError: null,
  testResult: null,
  fillUpTestResult: null,
};

export function ScreenHealthRecoilDraftProvider(props: { children: React.ReactNode }) {
  const initial = DEFAULT_RECOIL_DRAFT;
  const [state, setState] = useState<RecoilDraftState>(initial);
  const stateRef = useRef<RecoilDraftState>(initial);

  const setStateAndRef = (updater: (prev: RecoilDraftState) => RecoilDraftState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  };

  const actions = useMemo<ActionsCtx>(() => {
    return {
      setRecoilType: (v) => setStateAndRef((p) => ({ ...p, recoilType: v })),
      setRecoilDrawKind: (v) =>
        setStateAndRef((p) => ({
          ...p,
          recoilDrawKind: v,
          recoilType: p.roi ? v : p.recoilType,
        })),
      setOcrEngine: (v) => setStateAndRef((p) => ({ ...p, ocrEngine: v })),
      setDurationMs: (v) => setStateAndRef((p) => ({ ...p, durationMs: v })),
      setRoi: (v) => setStateAndRef((p) => ({ ...p, roi: v })),
      setStableReads: (v) => setStateAndRef((p) => ({ ...p, stableReads: v })),
      setHitMinDrop: (v) => setStateAndRef((p) => ({ ...p, hitMinDrop: v })),
      setHitCooldownMs: (v) => setStateAndRef((p) => ({ ...p, hitCooldownMs: v })),
      setFilledRgb: (v) => setStateAndRef((p) => ({ ...p, filledRgb: v })),
      setEmptyRgb: (v) => setStateAndRef((p) => ({ ...p, emptyRgb: v })),
      setOverheatRgb: (v) => setStateAndRef((p) => ({ ...p, overheatRgb: v })),
      setToleranceL1: (v) => setStateAndRef((p) => ({ ...p, toleranceL1: v })),
      setMinRise: (v) => setStateAndRef((p) => ({ ...p, minRise: v })),
      setOverheatMinScore: (v) => setStateAndRef((p) => ({ ...p, overheatMinScore: v })),
      setEmptyThreshold: (v) => setStateAndRef((p) => ({ ...p, emptyThreshold: v })),
      setColorPickMode: (v) => setStateAndRef((p) => ({ ...p, colorPickMode: v })),
      setCalibrationError: (v) => setStateAndRef((p) => ({ ...p, calibrationError: v })),
      setTestResult: (v) => setStateAndRef((p) => ({ ...p, testResult: v })),
      setFillUpTestResult: (v) => setStateAndRef((p) => ({ ...p, fillUpTestResult: v })),
      replaceAll: (next) => setStateAndRef((p) => ({ ...p, ...next })),
      readDraft: () => stateRef.current,
    };
  }, []);

  return (
    <ActionsC.Provider value={actions}>
      <StateC.Provider value={state}>{props.children}</StateC.Provider>
    </ActionsC.Provider>
  );
}

export function useScreenHealthRecoilDraftState() {
  const ctx = useContext(StateC);
  if (!ctx) throw new Error("useScreenHealthRecoilDraftState must be used within ScreenHealthRecoilDraftProvider");
  return ctx;
}

export function useScreenHealthRecoilDraftControls() {
  const ctx = useContext(ActionsC);
  if (!ctx) throw new Error("useScreenHealthRecoilDraftControls must be used within ScreenHealthRecoilDraftProvider");
  return ctx;
}

export function useScreenHealthRecoilDraft() {
  return useScreenHealthRecoilDraftState();
}
