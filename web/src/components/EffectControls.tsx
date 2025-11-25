import { VestEffect } from "../types";

type Props = {
  effects: VestEffect[];
  onSend: (effect: VestEffect) => void;
  onStopAll: () => void;
  disabled?: boolean;
};

export function EffectControls({ effects, onSend, onStopAll, disabled }: Props) {
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {effects.map((effect) => (
          <button
            key={effect.label}
            onClick={() => onSend(effect)}
            disabled={disabled}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:border-vest.accent/40 hover:bg-vest.accent/10"
          >
            <p className="text-sm font-medium">{effect.label}</p>
            <p className="text-xs text-slate-400">
              Cell {effect.cell} · Speed {effect.speed}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

