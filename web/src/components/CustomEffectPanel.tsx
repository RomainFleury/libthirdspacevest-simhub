import { useState } from "react";

type Props = {
  onSend: (cell: number, speed: number) => void;
  disabled?: boolean;
};

/**
 * Third Space Vest Actuator Layout:
 * 
 *     FRONT                    BACK
 *   ┌─────────┐            ┌─────────┐
 *   │ 2     5 │            │ 1     6 │
 *   │  Upper  │            │  Upper  │
 *   ├─────────┤            ├─────────┤
 *   │ 3     4 │            │ 0     7 │
 *   │  Lower  │            │  Lower  │
 *   └─────────┘            └─────────┘
 */

const CELLS = [
  { id: 2, label: "Front Upper Left", position: "↖" },
  { id: 5, label: "Front Upper Right", position: "↗" },
  { id: 3, label: "Front Lower Left", position: "↙" },
  { id: 4, label: "Front Lower Right", position: "↘" },
  { id: 1, label: "Back Upper Left", position: "↖" },
  { id: 6, label: "Back Upper Right", position: "↗" },
  { id: 0, label: "Back Lower Left", position: "↙" },
  { id: 7, label: "Back Lower Right", position: "↘" },
];

export function CustomEffectPanel({ onSend, disabled }: Props) {
  const [selectedCell, setSelectedCell] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(6);

  const selectedCellInfo = CELLS.find((c) => c.id === selectedCell);

  const handleSend = () => {
    onSend(selectedCell, speed);
  };

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-wide text-slate-400">
          Custom Control
        </p>
        <h2 className="text-xl font-semibold text-white">Manual Actuator Test</h2>
      </header>

      <div className="space-y-4">
        {/* Cell Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Cell Selection
          </label>
          <select
            value={selectedCell}
            onChange={(e) => setSelectedCell(Number(e.target.value))}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <optgroup label="Front">
              {CELLS.slice(0, 4).map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.position} {cell.label} (Cell {cell.id})
                </option>
              ))}
            </optgroup>
            <optgroup label="Back">
              {CELLS.slice(4, 8).map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.position} {cell.label} (Cell {cell.id})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Speed/Intensity Slider */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Speed / Intensity: <span className="text-blue-400 font-bold">{speed}</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0 (Off)</span>
            <span>5</span>
            <span>10 (Max)</span>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-slate-700/50 p-3 border border-slate-600">
          <p className="text-sm text-slate-400 mb-1">Command Preview</p>
          <code className="text-sm font-mono text-emerald-400">
            send_actuator_command({selectedCell}, {speed})
          </code>
          <p className="text-xs text-slate-500 mt-2">
            {selectedCellInfo?.position} {selectedCellInfo?.label}
          </p>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-medium text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🚀 Send Command
        </button>

        {/* Quick Speed Buttons */}
        <div>
          <p className="text-xs text-slate-500 mb-2">Quick Speed</p>
          <div className="grid grid-cols-4 gap-2">
            {[0, 3, 6, 10].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                disabled={disabled}
                className={`rounded-lg border px-2 py-1.5 text-sm transition-all disabled:opacity-50 ${
                  speed === s
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {s === 0 ? "Off" : s === 10 ? "Max" : s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
