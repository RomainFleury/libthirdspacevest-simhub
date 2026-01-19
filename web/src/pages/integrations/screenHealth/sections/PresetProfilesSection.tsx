import type { ScreenHealthPreset } from "../../../../data/screenHealthPresets";
import { useScreenHealthProfileDraft, useScreenHealthProfileDraftControls } from "../draft/ProfileDraftContext";

export function PresetProfilesSection(props: {
  presets: ScreenHealthPreset[];
  profiles?: Array<{ type: "preset" | "local"; id: string; name: string; profile: Record<string, any> }>;
}) {
  const { presets, profiles } = props;
  const state = useScreenHealthProfileDraft();
  const { setSelectedPresetId } = useScreenHealthProfileDraftControls();
  
  // Check if selected ID is a preset or local profile
  const isPreset = presets.some((p) => p.preset_id === state.selectedPresetId);
  const isLocal = profiles?.some((p) => p.id === state.selectedPresetId && p.type === "local");
  const isCustom = state.selectedPresetId === "__custom__" || (!isPreset && !isLocal);
  
  const selectedPreset = presets.find((p) => p.preset_id === state.selectedPresetId) || null;
  const selectedLocal = profiles?.find((p) => p.id === state.selectedPresetId && p.type === "local") || null;
  const selected = selectedPreset || selectedLocal;
  
  const meta = (selected?.profile as any)?.meta;
  const presetId = typeof meta?.preset_id === "string" ? meta.preset_id : null;
  const hints: string[] = Array.isArray(meta?.hints) ? meta.hints : [];

  const handleSelectChange = (value: string) => {
    // If it's a local profile ID, set it directly (DraftFromSelectedPresetSync will handle loading)
    // Otherwise, it's a preset ID
    setSelectedPresetId(value);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Load Profile</h3>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={state.selectedPresetId}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="rounded-lg bg-slate-700/50 px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          {isCustom && <option value="__custom__">Custom (loaded)</option>}
          <optgroup label="Presets">
            {presets.map((p) => (
              <option key={p.preset_id} value={p.preset_id}>
                {p.display_name} [Global]
              </option>
            ))}
          </optgroup>
          {profiles && profiles.filter((p) => p.type === "local").length > 0 && (
            <optgroup label="Local Profiles">
              {profiles
                .filter((p) => p.type === "local")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [Local]
                  </option>
                ))}
            </optgroup>
          )}
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

