import { VestEffect } from "../types";

type Props = {
  actuators: VestEffect[];
  combined: VestEffect[];
  onSend: (effect: VestEffect) => void;
  onStopAll: () => void;
  disabled?: boolean;
};

export function EffectControls({ actuators, combined, onSend, onStopAll, disabled }: Props) {
  // Arrange actuators in 2x2 grid: Front Left (top-left), Front Right (top-right), Rear Left (bottom-left), Rear Right (bottom-right)
  const actuatorGrid = [
    actuators.find((a) => a.label === "Front Left"),
    actuators.find((a) => a.label === "Front Right"),
    actuators.find((a) => a.label === "Rear Left"),
    actuators.find((a) => a.label === "Rear Right"),
  ].filter(Boolean) as VestEffect[];

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Effects</p>
          <h2 className="text-xl font-semibold text-white">Actuator Commands</h2>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10"
          onClick={onStopAll}
          disabled={disabled}
        >
          Stop All
        </button>
      </header>

      {/* Individual Actuators - 2x2 Grid */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-slate-300">Each Actuator</h3>
        <div className="grid grid-cols-2 gap-3">
          {actuatorGrid.map((effect) => (
            <button
              key={effect.label}
              onClick={() => onSend(effect)}
              disabled={disabled}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-white transition hover:border-blue-500/40 hover:bg-blue-500/10 disabled:opacity-50"
            >
              <p className="text-sm font-medium">{effect.label}</p>
              <p className="mt-1 text-xs text-slate-400">
                Cell {effect.cell} · Speed {effect.speed}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Combined Effects */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Other</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {combined.map((effect) => (
            <button
              key={effect.label}
              onClick={() => onSend(effect)}
              disabled={disabled}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:border-blue-500/40 hover:bg-blue-500/10 disabled:opacity-50"
            >
              <p className="text-sm font-medium">{effect.label}</p>
              <p className="text-xs text-slate-400">
                Cell {effect.cell} · Speed {effect.speed}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

