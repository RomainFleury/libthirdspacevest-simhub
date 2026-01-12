import { createContext, useContext, useMemo, useState } from "react";
import type { DetectorType } from "./types";

type ProfileDraftState = {
  selectedPresetId: string;
  detectorType: DetectorType;
  profileName: string;
  monitorIndex: number;
  tickMs: number;
};

type Ctx = {
  state: ProfileDraftState;
  setSelectedPresetId: (v: string) => void;
  setDetectorType: (v: DetectorType) => void;
  setProfileName: (v: string) => void;
  setMonitorIndex: (v: number) => void;
  setTickMs: (v: number) => void;
  replaceAll: (next: Partial<ProfileDraftState>) => void;
};

const C = createContext<Ctx | null>(null);

export function ScreenHealthProfileDraftProvider(props: { defaultPresetId: string; children: React.ReactNode }) {
  const [state, setState] = useState<ProfileDraftState>({
    selectedPresetId: props.defaultPresetId,
    detectorType: "redness_rois",
    profileName: "Default",
    monitorIndex: 1,
    tickMs: 50,
  });

  const api = useMemo<Ctx>(() => {
    return {
      state,
      setSelectedPresetId: (v) => setState((p) => ({ ...p, selectedPresetId: v })),
      setDetectorType: (v) => setState((p) => ({ ...p, detectorType: v })),
      setProfileName: (v) => setState((p) => ({ ...p, profileName: v })),
      setMonitorIndex: (v) => setState((p) => ({ ...p, monitorIndex: v })),
      setTickMs: (v) => setState((p) => ({ ...p, tickMs: v })),
      replaceAll: (next) => setState((p) => ({ ...p, ...next })),
    };
  }, [state]);

  return <C.Provider value={api}>{props.children}</C.Provider>;
}

export function useScreenHealthProfileDraft() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useScreenHealthProfileDraft must be used within ScreenHealthProfileDraftProvider");
  return ctx;
}

