import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { HealthNumberTestResult, RecoilType, RoiRect } from "./types";

export type RecoilDraftState = {
  recoilType: RecoilType;
  durationMs: number;
  roi: RoiRect | null;
  stableReads: number;
  hitMinDrop: number;
  hitCooldownMs: number;
  calibrationError: string | null;
  testResult: HealthNumberTestResult;
};

type StateCtx = RecoilDraftState;

type ActionsCtx = {
  setRecoilType: (v: RecoilType) => void;
  setDurationMs: (v: number) => void;
  setRoi: (v: RoiRect | null) => void;
  setStableReads: (v: number) => void;
  setHitMinDrop: (v: number) => void;
  setHitCooldownMs: (v: number) => void;
  setCalibrationError: (v: string | null) => void;
  setTestResult: (v: HealthNumberTestResult) => void;
  replaceAll: (next: Partial<RecoilDraftState>) => void;
  readDraft: () => RecoilDraftState;
};

const StateC = createContext<StateCtx | null>(null);
const ActionsC = createContext<ActionsCtx | null>(null);

export const DEFAULT_RECOIL_DRAFT: RecoilDraftState = {
  recoilType: "off",
  durationMs: 40,
  roi: null,
  stableReads: 2,
  hitMinDrop: 1,
  hitCooldownMs: 50,
  calibrationError: null,
  testResult: null,
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
      setDurationMs: (v) => setStateAndRef((p) => ({ ...p, durationMs: v })),
      setRoi: (v) => setStateAndRef((p) => ({ ...p, roi: v })),
      setStableReads: (v) => setStateAndRef((p) => ({ ...p, stableReads: v })),
      setHitMinDrop: (v) => setStateAndRef((p) => ({ ...p, hitMinDrop: v })),
      setHitCooldownMs: (v) => setStateAndRef((p) => ({ ...p, hitCooldownMs: v })),
      setCalibrationError: (v) => setStateAndRef((p) => ({ ...p, calibrationError: v })),
      setTestResult: (v) => setStateAndRef((p) => ({ ...p, testResult: v })),
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
