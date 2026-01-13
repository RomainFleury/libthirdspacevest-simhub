import type { ScreenHealthPreset } from "../../../../data/screenHealthPresets";
import { useScreenHealthProfileDraft, useScreenHealthProfileDraftControls } from "../draft/ProfileDraftContext";

export function PresetProfilesSection(props: {
  presets: ScreenHealthPreset[];
}) {
  const { presets } = props;
  const state = useScreenHealthProfileDraft();
  const { setSelectedPresetId } = useScreenHealthProfileDraftControls();
  const selected = presets.find((p) => p.preset_id === state.selectedPresetId) || null;
  const meta = (selected?.profile as any)?.meta;
  const presetId = typeof meta?.preset_id === "string" ? meta.preset_id : null;
  const hints: string[] = Array.isArray(meta?.hints) ? meta.hints : [];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Preset profiles</h3>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={state.selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          {presets.map((p) => (
            <option key={p.preset_id} value={p.preset_id}>
              {p.display_name}
            </option>
          ))}
        </select>
      </div>

      {presetId && (
        <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-white/5 text-sm">
          <div className="text-slate-300">
            <span className="font-medium text-white">Preset:</span>{" "}
            <span className="font-mono">{presetId}</span>
          </div>
          {hints.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-slate-400 space-y-1">
              {hints.slice(0, 4).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

