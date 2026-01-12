import { createContext, useContext, useMemo, useState } from "react";
import type { RoiDraft } from "./types";

type RednessDraftState = {
  minScore: number;
  cooldownMs: number;
  rois: RoiDraft[];
};

type Ctx = {
  state: RednessDraftState;
  setMinScore: (v: number) => void;
  setCooldownMs: (v: number) => void;
  setRois: (next: RoiDraft[] | ((prev: RoiDraft[]) => RoiDraft[])) => void;
  updateRoi: (index: number, patch: Partial<RoiDraft>) => void;
  removeRoi: (index: number) => void;
  replaceAll: (next: Partial<RednessDraftState>) => void;
};

const C = createContext<Ctx | null>(null);

export function ScreenHealthRednessDraftProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<RednessDraftState>({
    minScore: 0.35,
    cooldownMs: 200,
    rois: [],
  });

  const api = useMemo<Ctx>(() => {
    return {
      state,
      setMinScore: (v) => setState((p) => ({ ...p, minScore: v })),
      setCooldownMs: (v) => setState((p) => ({ ...p, cooldownMs: v })),
      setRois: (next) =>
        setState((p) => ({
          ...p,
          rois: typeof next === "function" ? (next as any)(p.rois) : next,
        })),
      updateRoi: (index, patch) =>
        setState((p) => ({
          ...p,
          rois: p.rois.map((r, i) => (i === index ? { ...r, ...patch } : r)),
        })),
      removeRoi: (index) => setState((p) => ({ ...p, rois: p.rois.filter((_, i) => i !== index) })),
      replaceAll: (next) => setState((p) => ({ ...p, ...next })),
    };
  }, [state]);

  return <C.Provider value={api}>{props.children}</C.Provider>;
}

export function useScreenHealthRednessDraft() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useScreenHealthRednessDraft must be used within ScreenHealthRednessDraftProvider");
  return ctx;
}

