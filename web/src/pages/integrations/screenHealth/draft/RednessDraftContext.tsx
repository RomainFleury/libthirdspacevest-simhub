import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { RoiDraft } from "./types";

type RednessDraftState = {
  minScore: number;
  cooldownMs: number;
  rois: RoiDraft[];
};

type StateCtx = RednessDraftState;

type ActionsCtx = {
  setMinScore: (v: number) => void;
  setCooldownMs: (v: number) => void;
  setRois: (next: RoiDraft[] | ((prev: RoiDraft[]) => RoiDraft[])) => void;
  updateRoi: (index: number, patch: Partial<RoiDraft>) => void;
  removeRoi: (index: number) => void;
  replaceAll: (next: Partial<RednessDraftState>) => void;
  getSnapshot: () => RednessDraftState;
};

const StateC = createContext<StateCtx | null>(null);
const ActionsC = createContext<ActionsCtx | null>(null);

export function ScreenHealthRednessDraftProvider(props: { children: React.ReactNode }) {
  const initial: RednessDraftState = {
    minScore: 0.35,
    cooldownMs: 200,
    rois: [],
  };
  const [state, setState] = useState<RednessDraftState>(initial);
  const stateRef = useRef<RednessDraftState>(initial);

  const setStateAndRef = (updater: (prev: RednessDraftState) => RednessDraftState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  };

  const actions = useMemo<ActionsCtx>(() => {
    return {
      setMinScore: (v) => setStateAndRef((p) => ({ ...p, minScore: v })),
      setCooldownMs: (v) => setStateAndRef((p) => ({ ...p, cooldownMs: v })),
      setRois: (next) =>
        setStateAndRef((p) => ({
          ...p,
          rois: typeof next === "function" ? (next as any)(p.rois) : next,
        })),
      updateRoi: (index, patch) =>
        setStateAndRef((p) => ({
          ...p,
          rois: p.rois.map((r, i) => (i === index ? { ...r, ...patch } : r)),
        })),
      removeRoi: (index) => setStateAndRef((p) => ({ ...p, rois: p.rois.filter((_, i) => i !== index) })),
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

export function useScreenHealthRednessDraftState() {
  const ctx = useContext(StateC);
  if (!ctx) throw new Error("useScreenHealthRednessDraftState must be used within ScreenHealthRednessDraftProvider");
  return ctx;
}

export function useScreenHealthRednessDraftActions() {
  const ctx = useContext(ActionsC);
  if (!ctx) throw new Error("useScreenHealthRednessDraftActions must be used within ScreenHealthRednessDraftProvider");
  return ctx;
}

