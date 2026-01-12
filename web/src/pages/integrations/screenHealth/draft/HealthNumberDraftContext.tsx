import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { HealthNumberTestResult, RoiRect } from "./types";

type HealthNumberDraftState = {
  roi: RoiRect | null;
  digits: number;
  invert: boolean;
  threshold: number;
  scale: number;
  readMin: number;
  readMax: number;
  stableReads: number;
  hitMinDrop: number;
  hitCooldownMs: number;
  hammingMax: number;
  templateSize: { w: number; h: number };
  templates: Record<string, string>;
  learnValue: string;
  calibrationError: string | null;
  testResult: HealthNumberTestResult;
};

type StateCtx = HealthNumberDraftState;

type ActionsCtx = {
  setRoi: (v: RoiRect | null) => void;
  setDigits: (v: number) => void;
  setInvert: (v: boolean) => void;
  setThreshold: (v: number) => void;
  setScale: (v: number) => void;
  setReadMin: (v: number) => void;
  setReadMax: (v: number) => void;
  setStableReads: (v: number) => void;
  setHitMinDrop: (v: number) => void;
  setHitCooldownMs: (v: number) => void;
  setHammingMax: (v: number) => void;
  setTemplateSize: (v: { w: number; h: number }) => void;
  setTemplates: (v: Record<string, string>) => void;
  setLearnValue: (v: string) => void;
  setCalibrationError: (v: string | null) => void;
  setTestResult: (v: HealthNumberTestResult) => void;
  clearTemplates: () => void;
  replaceAll: (next: Partial<HealthNumberDraftState>) => void;
  getSnapshot: () => HealthNumberDraftState;
};

const StateC = createContext<StateCtx | null>(null);
const ActionsC = createContext<ActionsCtx | null>(null);

export function ScreenHealthHealthNumberDraftProvider(props: { children: React.ReactNode }) {
  const initial: HealthNumberDraftState = {
    roi: null,
    digits: 3,
    invert: false,
    threshold: 0.6,
    scale: 2,
    readMin: 0,
    readMax: 300,
    stableReads: 2,
    hitMinDrop: 1,
    hitCooldownMs: 150,
    hammingMax: 120,
    templateSize: { w: 16, h: 24 },
    templates: {},
    learnValue: "",
    calibrationError: null,
    testResult: null,
  };
  const [state, setState] = useState<HealthNumberDraftState>(initial);
  const stateRef = useRef<HealthNumberDraftState>(initial);

  const setStateAndRef = (updater: (prev: HealthNumberDraftState) => HealthNumberDraftState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  };

  // If template size changes, existing learned bitstrings are invalid.
  useEffect(() => {
    setStateAndRef((p) => ({ ...p, templates: {}, testResult: null, calibrationError: null }));
  }, [state.templateSize.w, state.templateSize.h]);

  const actions = useMemo<ActionsCtx>(() => {
    return {
      setRoi: (v) => setStateAndRef((p) => ({ ...p, roi: v })),
      setDigits: (v) => setStateAndRef((p) => ({ ...p, digits: v })),
      setInvert: (v) => setStateAndRef((p) => ({ ...p, invert: v })),
      setThreshold: (v) => setStateAndRef((p) => ({ ...p, threshold: v })),
      setScale: (v) => setStateAndRef((p) => ({ ...p, scale: v })),
      setReadMin: (v) => setStateAndRef((p) => ({ ...p, readMin: v })),
      setReadMax: (v) => setStateAndRef((p) => ({ ...p, readMax: v })),
      setStableReads: (v) => setStateAndRef((p) => ({ ...p, stableReads: v })),
      setHitMinDrop: (v) => setStateAndRef((p) => ({ ...p, hitMinDrop: v })),
      setHitCooldownMs: (v) => setStateAndRef((p) => ({ ...p, hitCooldownMs: v })),
      setHammingMax: (v) => setStateAndRef((p) => ({ ...p, hammingMax: v })),
      setTemplateSize: (v) => setStateAndRef((p) => ({ ...p, templateSize: v })),
      setTemplates: (v) => setStateAndRef((p) => ({ ...p, templates: v })),
      setLearnValue: (v) => setStateAndRef((p) => ({ ...p, learnValue: v })),
      setCalibrationError: (v) => setStateAndRef((p) => ({ ...p, calibrationError: v })),
      setTestResult: (v) => setStateAndRef((p) => ({ ...p, testResult: v })),
      clearTemplates: () => setStateAndRef((p) => ({ ...p, templates: {}, testResult: null, calibrationError: null })),
      replaceAll: (next) => setStateAndRef((p) => ({ ...p, ...next })),
      getSnapshot: () => stateRef.current,
    };
  }, []);

  return (
    <ActionsC.Provider value={actions}>
      <StateC.Provider value={state}>{props.children}</StateC.Provider>
    </ActionsC.Provider>
  );
}

export function useScreenHealthHealthNumberDraftState() {
  const ctx = useContext(StateC);
  if (!ctx) throw new Error("useScreenHealthHealthNumberDraftState must be used within ScreenHealthHealthNumberDraftProvider");
  return ctx;
}

export function useScreenHealthHealthNumberDraftControls() {
  const ctx = useContext(ActionsC);
  if (!ctx) throw new Error("useScreenHealthHealthNumberDraftControls must be used within ScreenHealthHealthNumberDraftProvider");
  return ctx;
}

export function useScreenHealthHealthNumberDraft() {
  return useScreenHealthHealthNumberDraftState();
}

