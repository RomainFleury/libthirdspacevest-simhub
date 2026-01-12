import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

type Ctx = {
  state: HealthNumberDraftState;
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
};

const C = createContext<Ctx | null>(null);

export function ScreenHealthHealthNumberDraftProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthNumberDraftState>({
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
  });

  // If template size changes, existing learned bitstrings are invalid.
  useEffect(() => {
    setState((p) => ({ ...p, templates: {}, testResult: null, calibrationError: null }));
  }, [state.templateSize.w, state.templateSize.h]);

  const api = useMemo<Ctx>(() => {
    return {
      state,
      setRoi: (v) => setState((p) => ({ ...p, roi: v })),
      setDigits: (v) => setState((p) => ({ ...p, digits: v })),
      setInvert: (v) => setState((p) => ({ ...p, invert: v })),
      setThreshold: (v) => setState((p) => ({ ...p, threshold: v })),
      setScale: (v) => setState((p) => ({ ...p, scale: v })),
      setReadMin: (v) => setState((p) => ({ ...p, readMin: v })),
      setReadMax: (v) => setState((p) => ({ ...p, readMax: v })),
      setStableReads: (v) => setState((p) => ({ ...p, stableReads: v })),
      setHitMinDrop: (v) => setState((p) => ({ ...p, hitMinDrop: v })),
      setHitCooldownMs: (v) => setState((p) => ({ ...p, hitCooldownMs: v })),
      setHammingMax: (v) => setState((p) => ({ ...p, hammingMax: v })),
      setTemplateSize: (v) => setState((p) => ({ ...p, templateSize: v })),
      setTemplates: (v) => setState((p) => ({ ...p, templates: v })),
      setLearnValue: (v) => setState((p) => ({ ...p, learnValue: v })),
      setCalibrationError: (v) => setState((p) => ({ ...p, calibrationError: v })),
      setTestResult: (v) => setState((p) => ({ ...p, testResult: v })),
      clearTemplates: () => setState((p) => ({ ...p, templates: {}, testResult: null, calibrationError: null })),
      replaceAll: (next) => setState((p) => ({ ...p, ...next })),
    };
  }, [state]);

  return <C.Provider value={api}>{props.children}</C.Provider>;
}

export function useScreenHealthHealthNumberDraft() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useScreenHealthHealthNumberDraft must be used within ScreenHealthHealthNumberDraftProvider");
  return ctx;
}

