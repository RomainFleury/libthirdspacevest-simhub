import { createContext, useContext, useMemo, useState } from "react";
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

type Ctx = {
  state: HealthBarDraftState;
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
};

const C = createContext<Ctx | null>(null);

export function ScreenHealthHealthBarDraftProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthBarDraftState>({
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
  });

  const api = useMemo<Ctx>(() => {
    return {
      state,
      setRoi: (v) => setState((p) => ({ ...p, roi: v })),
      setMode: (v) => setState((p) => ({ ...p, mode: v })),
      setFilledRgb: (v) => setState((p) => ({ ...p, filledRgb: v })),
      setEmptyRgb: (v) => setState((p) => ({ ...p, emptyRgb: v })),
      setToleranceL1: (v) => setState((p) => ({ ...p, toleranceL1: v })),
      setFallbackMode: (v) => setState((p) => ({ ...p, fallbackMode: v })),
      setFallbackMin: (v) => setState((p) => ({ ...p, fallbackMin: v })),
      setHitMinDrop: (v) => setState((p) => ({ ...p, hitMinDrop: v })),
      setHitCooldownMs: (v) => setState((p) => ({ ...p, hitCooldownMs: v })),
      setColorPickMode: (v) => setState((p) => ({ ...p, colorPickMode: v })),
      replaceAll: (next) => setState((p) => ({ ...p, ...next })),
    };
  }, [state]);

  return <C.Provider value={api}>{props.children}</C.Provider>;
}

export function useScreenHealthHealthBarDraft() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useScreenHealthHealthBarDraft must be used within ScreenHealthHealthBarDraftProvider");
  return ctx;
}

