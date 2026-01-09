import { createContext, useContext, useMemo, useReducer } from "react";
import { createInitialDraftState, screenHealthDraftReducer } from "./reducer";
import type { ScreenHealthDraftAction, ScreenHealthDraftState } from "./reducer";

type Ctx = {
  state: ScreenHealthDraftState;
  dispatch: React.Dispatch<ScreenHealthDraftAction>;
};

const ScreenHealthConfigContext = createContext<Ctx | null>(null);

export function ScreenHealthConfigProvider(props: { defaultPresetId: string; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(screenHealthDraftReducer, createInitialDraftState(props.defaultPresetId));
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ScreenHealthConfigContext.Provider value={value}>{props.children}</ScreenHealthConfigContext.Provider>;
}

export function useScreenHealthConfig() {
  const ctx = useContext(ScreenHealthConfigContext);
  if (!ctx) throw new Error("useScreenHealthConfig must be used within ScreenHealthConfigProvider");
  return ctx;
}

