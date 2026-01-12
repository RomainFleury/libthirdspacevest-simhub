import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { HealthBarFallbackMode, HealthBarMode, RoiRect } from "./types";

type HealthBarDraftState = {
  roi: RoiRect | null;
  mode: HealthBarMode;
  filledRgb: [number, number, number];
  emptyRgb: [number, number, number];
  toleranceL1: number;
  fallbackMode: HealthBarFallbackMode;
  fallbackMin: number;
  hitMinDrop: number;
  hitCooldownMs: number;
  colorPickMode: null | "filled" | "empty";
};

type StateCtx = HealthBarDraftState;

type ActionsCtx = {
  setRoi: (v: RoiRect | null) => void;
  setMode: (v: HealthBarMode) => void;
  setFilledRgb: (v: [number, number, number]) => void;
  setEmptyRgb: (v: [number, number, number]) => void;
  setToleranceL1: (v: number) => void;
  setFallbackMode: (v: HealthBarFallbackMode) => void;
  setFallbackMin: (v: number) => void;
  setHitMinDrop: (v: number) => void;
  setHitCooldownMs: (v: number) => void;
  setColorPickMode: (v: null | "filled" | "empty") => void;
  replaceAll: (next: Partial<HealthBarDraftState>) => void;
  getSnapshot: () => HealthBarDraftState;
};

const StateC = createContext<StateCtx | null>(null);
const ActionsC = createContext<ActionsCtx | null>(null);

export function ScreenHealthHealthBarDraftProvider(props: { children: React.ReactNode }) {
  const initial: HealthBarDraftState = {
    roi: null,
    mode: "color_sampling",
    filledRgb: [220, 40, 40],
    emptyRgb: [40, 40, 40],
    toleranceL1: 120,
    fallbackMode: "brightness",
    fallbackMin: 0.5,
    hitMinDrop: 0.02,
    hitCooldownMs: 150,
    colorPickMode: null,
  };
  const [state, setState] = useState<HealthBarDraftState>(initial);
  const stateRef = useRef<HealthBarDraftState>(initial);

  const setStateAndRef = (updater: (prev: HealthBarDraftState) => HealthBarDraftState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  };

  const actions = useMemo<ActionsCtx>(() => {
    return {
      setRoi: (v) => setStateAndRef((p) => ({ ...p, roi: v })),
      setMode: (v) => setStateAndRef((p) => ({ ...p, mode: v })),
      setFilledRgb: (v) => setStateAndRef((p) => ({ ...p, filledRgb: v })),
      setEmptyRgb: (v) => setStateAndRef((p) => ({ ...p, emptyRgb: v })),
      setToleranceL1: (v) => setStateAndRef((p) => ({ ...p, toleranceL1: v })),
      setFallbackMode: (v) => setStateAndRef((p) => ({ ...p, fallbackMode: v })),
      setFallbackMin: (v) => setStateAndRef((p) => ({ ...p, fallbackMin: v })),
      setHitMinDrop: (v) => setStateAndRef((p) => ({ ...p, hitMinDrop: v })),
      setHitCooldownMs: (v) => setStateAndRef((p) => ({ ...p, hitCooldownMs: v })),
      setColorPickMode: (v) => setStateAndRef((p) => ({ ...p, colorPickMode: v })),
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

export function useScreenHealthHealthBarDraftState() {
  const ctx = useContext(StateC);
  if (!ctx) throw new Error("useScreenHealthHealthBarDraftState must be used within ScreenHealthHealthBarDraftProvider");
  return ctx;
}

export function useScreenHealthHealthBarDraftActions() {
  const ctx = useContext(ActionsC);
  if (!ctx) throw new Error("useScreenHealthHealthBarDraftActions must be used within ScreenHealthHealthBarDraftProvider");
  return ctx;
}

