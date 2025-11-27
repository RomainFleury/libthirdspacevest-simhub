import { VestEffect } from "../types";

type Props = {
  actuators: VestEffect[];
  combined: VestEffect[];
  activeCells: Set<number>;
  onSend: (effect: VestEffect) => void;
  onStopAll: () => void;
  disabled?: boolean;
};

/**
 * Third Space Vest Actuator Layout:
 * 
 * Physical cell mapping (hardware IDs):
 *     FRONT                    BACK
 *   ┌─────────┐            ┌─────────┐
 *   │ 2     5 │            │ 1     6 │
 *   │  Upper  │            │  Upper  │
 *   ├─────────┤            ├─────────┤
 *   │ 3     4 │            │ 0     7 │
 *   │  Lower  │            │  Lower  │
 *   └─────────┘            └─────────┘
 *     Left  Right           Left  Right
 */

// Hardware cell IDs for front and back
const FRONT_CELLS = [2, 5, 3, 4]; // Upper Left, Upper Right, Lower Left, Lower Right
const BACK_CELLS = [1, 6, 0, 7];  // Upper Left, Upper Right, Lower Left, Lower Right

// Position labels for grid display (indexed by grid position: 0=UL, 1=UR, 2=LL, 3=LR)
const POSITION_LABELS = [
  "↖ Upper Left",
  "↗ Upper Right", 
  "↙ Lower Left",
  "↘ Lower Right",
];

export function EffectControls({
  actuators,
  combined,
  activeCells,
  onSend,
  onStopAll,
  disabled,
}: Props) {
  // Separate front and back actuators by their hardware cell IDs
  const frontActuators = actuators.filter((a) => FRONT_CELLS.includes(a.cell));
  const backActuators = actuators.filter((a) => BACK_CELLS.includes(a.cell));

  // Arrange in grid order (top-left, top-right, bottom-left, bottom-right)
  const frontGrid = [
    frontActuators.find((a) => a.cell === 2), // Upper Left
    frontActuators.find((a) => a.cell === 5), // Upper Right
    frontActuators.find((a) => a.cell === 3), // Lower Left
    frontActuators.find((a) => a.cell === 4), // Lower Right
  ].filter(Boolean) as VestEffect[];

  const backGrid = [
    backActuators.find((a) => a.cell === 1), // Upper Left
    backActuators.find((a) => a.cell === 6), // Upper Right
    backActuators.find((a) => a.cell === 0), // Lower Left
    backActuators.find((a) => a.cell === 7), // Lower Right
  ].filter(Boolean) as VestEffect[];

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Effects
          </p>
          <h2 className="text-xl font-semibold text-white">Actuator Commands</h2>
        </div>
        <button
          type="button"
          className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 hover:bg-rose-500/20 transition"
          onClick={onStopAll}
          disabled={disabled}
        >
          ⏹ Stop All
        </button>
      </header>

      {/* Vest Layout - Front and Back side by side */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Front Panel */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-300 text-center">
              🎯 Front
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {frontGrid.map((effect, index) => {
                const isActive = activeCells.has(effect.cell);
                return (
                  <button
                    key={effect.cell}
                    onClick={() => onSend(effect)}
                    disabled={disabled}
                    className={`rounded-xl border px-3 py-4 text-center text-white transition-all duration-200 disabled:opacity-50 ${
                      isActive
                        ? "border-emerald-400 bg-emerald-500/40 shadow-lg shadow-emerald-500/30 scale-105"
                        : "border-blue-500/30 bg-blue-500/10 hover:border-blue-500/60 hover:bg-blue-500/20"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {POSITION_LABELS[index]}
                    </p>
                    <p className={`mt-0.5 text-xs ${isActive ? "text-emerald-300" : "text-slate-400"}`}>
                      Cell {effect.cell}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Back Panel */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-300 text-center">
              🔙 Back
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {backGrid.map((effect, index) => {
                const isActive = activeCells.has(effect.cell);
                return (
                  <button
                    key={effect.cell}
                    onClick={() => onSend(effect)}
                    disabled={disabled}
                    className={`rounded-xl border px-3 py-4 text-center text-white transition-all duration-200 disabled:opacity-50 ${
                      isActive
                        ? "border-emerald-400 bg-emerald-500/40 shadow-lg shadow-emerald-500/30 scale-105"
                        : "border-purple-500/30 bg-purple-500/10 hover:border-purple-500/60 hover:bg-purple-500/20"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {POSITION_LABELS[index]}
                    </p>
                    <p className={`mt-0.5 text-xs ${isActive ? "text-emerald-300" : "text-slate-400"}`}>
                      Cell {effect.cell}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Combined Effects / Presets */}
      {combined.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-300">
            Quick Presets
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {combined.map((effect) => (
              <button
                key={effect.label}
                onClick={() => onSend(effect)}
                disabled={disabled}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center text-white transition hover:border-amber-500/60 hover:bg-amber-500/20 disabled:opacity-50"
              >
                <p className="text-sm font-medium">{effect.label}</p>
                <p className="text-xs text-slate-400">Speed {effect.speed}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
