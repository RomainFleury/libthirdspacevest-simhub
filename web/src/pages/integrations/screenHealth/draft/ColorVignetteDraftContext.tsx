import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { RoiDraft } from "./types";

export type ColorVignetteDraftState = {
  minScore: number;
  cooldownMs: number;
  targetRgb: [number, number, number];
  toleranceL1: number;
  pickingColor: boolean;
  rois: RoiDraft[];
};

type ActionsCtx = {
  setMinScore: (v: number) => void;
  setCooldownMs: (v: number) => void;
  setTargetRgb: (v: [number, number, number]) => void;
  setToleranceL1: (v: number) => void;
  setPickingColor: (v: boolean) => void;
  setRois: (next: RoiDraft[] | ((prev: RoiDraft[]) => RoiDraft[])) => void;
  updateRoi: (index: number, patch: Partial<RoiDraft>) => void;
  removeRoi: (index: number) => void;
  replaceAll: (next: Partial<ColorVignetteDraftState>) => void;
  readDraft: () => ColorVignetteDraftState;
};

const StateC = createContext<ColorVignetteDraftState | null>(null);
const ActionsC = createContext<ActionsCtx | null>(null);

export const DEFAULT_COLOR_VIGNETTE_DRAFT: ColorVignetteDraftState = {
  minScore: 0.35,
  cooldownMs: 200,
  targetRgb: [220, 40, 40],
  toleranceL1: 120,
  pickingColor: false,
  rois: [],
};

export function ScreenHealthColorVignetteDraftProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<ColorVignetteDraftState>(DEFAULT_COLOR_VIGNETTE_DRAFT);
  const stateRef = useRef<ColorVignetteDraftState>(DEFAULT_COLOR_VIGNETTE_DRAFT);

  const setStateAndRef = (updater: (prev: ColorVignetteDraftState) => ColorVignetteDraftState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  };

  const actions = useMemo<ActionsCtx>(
    () => ({
      setMinScore: (v) => setStateAndRef((p) => ({ ...p, minScore: v })),
      setCooldownMs: (v) => setStateAndRef((p) => ({ ...p, cooldownMs: v })),
      setTargetRgb: (v) => setStateAndRef((p) => ({ ...p, targetRgb: v, pickingColor: false })),
      setToleranceL1: (v) => setStateAndRef((p) => ({ ...p, toleranceL1: v })),
      setPickingColor: (v) => setStateAndRef((p) => ({ ...p, pickingColor: v })),
      setRois: (next) =>
        setStateAndRef((p) => ({
          ...p,
          rois: typeof next === "function" ? (next as (prev: RoiDraft[]) => RoiDraft[])(p.rois) : next,
        })),
      updateRoi: (index, patch) =>
        setStateAndRef((p) => ({
          ...p,
          rois: p.rois.map((r, i) => (i === index ? { ...r, ...patch } : r)),
        })),
      removeRoi: (index) => setStateAndRef((p) => ({ ...p, rois: p.rois.filter((_, i) => i !== index) })),
      replaceAll: (next) => setStateAndRef((p) => ({ ...p, ...next })),
      readDraft: () => stateRef.current,
    }),
    []
  );

  return (
    <ActionsC.Provider value={actions}>
      <StateC.Provider value={state}>{props.children}</StateC.Provider>
    </ActionsC.Provider>
  );
}

export function useScreenHealthColorVignetteDraft() {
  const ctx = useContext(StateC);
  if (!ctx) throw new Error("useScreenHealthColorVignetteDraft must be used within ScreenHealthColorVignetteDraftProvider");
  return ctx;
}

export function useScreenHealthColorVignetteDraftControls() {
  const ctx = useContext(ActionsC);
  if (!ctx) throw new Error("useScreenHealthColorVignetteDraftControls must be used within ScreenHealthColorVignetteDraftProvider");
  return ctx;
}
