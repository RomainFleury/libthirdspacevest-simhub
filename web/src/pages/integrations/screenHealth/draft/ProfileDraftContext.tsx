import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { DetectorType } from "./types";

type ProfileDraftState = {
  selectedPresetId: string;
  detectorType: DetectorType;
  profileName: string;
  monitorIndex: number;
  tickMs: number;
};

type StateCtx = ProfileDraftState;

type ActionsCtx = {
  setSelectedPresetId: (v: string) => void;
  setDetectorType: (v: DetectorType) => void;
  setProfileName: (v: string) => void;
  setMonitorIndex: (v: number) => void;
  setTickMs: (v: number) => void;
  replaceAll: (next: Partial<ProfileDraftState>) => void;
  readDraft: () => ProfileDraftState;
};

const StateC = createContext<StateCtx | null>(null);
const ActionsC = createContext<ActionsCtx | null>(null);

export function ScreenHealthProfileDraftProvider(props: { defaultPresetId: string; children: React.ReactNode }) {
  const initial: ProfileDraftState = {
    selectedPresetId: props.defaultPresetId,
    detectorType: "redness_rois",
    profileName: "Default",
    monitorIndex: 1,
    tickMs: 50,
  };
  const [state, setState] = useState<ProfileDraftState>(initial);
  const stateRef = useRef<ProfileDraftState>(initial);

  const setStateAndRef = (updater: (prev: ProfileDraftState) => ProfileDraftState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  };

  const actions = useMemo<ActionsCtx>(() => {
    return {
      setSelectedPresetId: (v) => setStateAndRef((p) => ({ ...p, selectedPresetId: v })),
      setDetectorType: (v) => setStateAndRef((p) => ({ ...p, detectorType: v })),
      setProfileName: (v) => setStateAndRef((p) => ({ ...p, profileName: v })),
      setMonitorIndex: (v) => setStateAndRef((p) => ({ ...p, monitorIndex: v })),
      setTickMs: (v) => setStateAndRef((p) => ({ ...p, tickMs: v })),
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

export function useScreenHealthProfileDraftState() {
  const ctx = useContext(StateC);
  if (!ctx) throw new Error("useScreenHealthProfileDraftState must be used within ScreenHealthProfileDraftProvider");
  return ctx;
}

export function useScreenHealthProfileDraftControls() {
  const ctx = useContext(ActionsC);
  if (!ctx) throw new Error("useScreenHealthProfileDraftControls must be used within ScreenHealthProfileDraftProvider");
  return ctx;
}

// Preferred "read" hook name (clear at call sites)
export function useScreenHealthProfileDraft() {
  return useScreenHealthProfileDraftState();
}
