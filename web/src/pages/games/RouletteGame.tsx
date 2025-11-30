import { useState } from "react";
import { Link } from "react-router-dom";
import { useGameHaptics } from "../../hooks/useGameHaptics";

export function RouletteGame() {
  const { triggerPreset } = useGameHaptics();
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleSpin = async () => {
    if (rolling) return;

    setRolling(true);
    setResult(null);

    // Simulate rolling delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Pick random number 1-10
    const number = Math.floor(Math.random() * 10) + 1;
    setResult(number);
    setRolling(false);

    // Trigger haptic feedback
    if (number === 10) {
      // Front hit - strong feedback
      await triggerPreset("front", 7);
    } else if (number === 1) {
      // Back hit - strong feedback
      await triggerPreset("back", 7);
    } else {
      // Light feedback on front for other numbers
      await triggerPreset("front", 3);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <Link
          to="/mini-games"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
        >
          ← Back to Games
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          🎰 Roulette
        </h1>
        <p className="text-slate-400">
          Click to spin! Random number 1-10 determines haptic feedback.
        </p>
      </header>

      <div className="bg-slate-800/80 rounded-2xl p-8 text-center shadow-lg ring-1 ring-white/5">
        <button
          onClick={handleSpin}
          disabled={rolling}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {rolling ? "Rolling..." : "Spin!"}
        </button>

        {result !== null && (
          <div className="mt-6">
            <p className="text-2xl text-white">
              Result: <span className="font-bold text-blue-400">{result}</span>
            </p>
            {result === 10 && (
              <p className="text-green-400 mt-2 text-lg">Front hit! 💥</p>
            )}
            {result === 1 && (
              <p className="text-red-400 mt-2 text-lg">Back hit! 💥</p>
            )}
            {result > 1 && result < 10 && (
              <p className="text-slate-400 mt-2">Light feedback</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
        <p className="font-semibold mb-2">Haptic Mapping:</p>
        <ul className="space-y-1 text-left">
          <li>• <span className="text-red-400">1</span> = Back hit (cells 1, 6, 0, 7) - Strong</li>
          <li>• <span className="text-blue-400">2-9</span> = Front (cells 2, 5, 3, 4) - Light</li>
          <li>• <span className="text-green-400">10</span> = Front hit (cells 2, 5, 3, 4) - Strong</li>
        </ul>
      </div>
    </div>
  );
}

