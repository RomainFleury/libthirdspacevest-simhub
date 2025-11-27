import { useState, useEffect, useCallback } from "react";
import {
  listEffectsLibrary,
  playEffect,
  stopEffect,
  PredefinedEffect,
} from "../lib/bridgeApi";

// Category icons and colors
const CATEGORY_INFO: Record<
  string,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  weapons: {
    label: "Weapons",
    icon: "🔫",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  impacts: {
    label: "Impacts",
    icon: "💥",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  melee: {
    label: "Melee",
    icon: "⚔️",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  driving: {
    label: "Driving",
    icon: "🏎️",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  special: {
    label: "Special",
    icon: "✨",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
};

function getCategoryInfo(category: string) {
  return (
    CATEGORY_INFO[category] || {
      label: category,
      icon: "🎮",
      color: "text-slate-400",
      bgColor: "bg-slate-500/10",
    }
  );
}

export function EffectsLibraryPanel() {
  const [effects, setEffects] = useState<PredefinedEffect[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingEffect, setPlayingEffect] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["weapons", "impacts"])
  );

  // Load effects on mount
  useEffect(() => {
    async function loadEffects() {
      try {
        setLoading(true);
        const result = await listEffectsLibrary();
        if (result.success) {
          setEffects(result.effects);
          setCategories(result.categories);
          setError(null);
        } else {
          setError(result.error || "Failed to load effects");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load effects");
      } finally {
        setLoading(false);
      }
    }
    loadEffects();
  }, []);

  const handlePlay = useCallback(async (effectName: string) => {
    try {
      setPlayingEffect(effectName);
      setError(null);
      const result = await playEffect(effectName);
      if (!result.success) {
        setError(result.error || "Failed to play effect");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to play effect");
    } finally {
      // Clear playing state after a delay (effect duration)
      setTimeout(() => setPlayingEffect(null), 500);
    }
  }, []);

  const handleStopAll = useCallback(async () => {
    try {
      setError(null);
      const result = await stopEffect();
      if (!result.success) {
        setError(result.error || "Failed to stop effect");
      }
      setPlayingEffect(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop effect");
    }
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group effects by category
  const effectsByCategory = effects.reduce(
    (acc, effect) => {
      if (!acc[effect.category]) {
        acc[effect.category] = [];
      }
      acc[effect.category].push(effect);
      return acc;
    },
    {} as Record<string, PredefinedEffect[]>
  );

  if (loading) {
    return (
      <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
        <header className="mb-4">
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Test & Debug
          </p>
          <h2 className="text-xl font-semibold text-white">Effects Library</h2>
        </header>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
          <span className="ml-3 text-slate-400">Loading effects...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Test & Debug
          </p>
          <h2 className="text-xl font-semibold text-white">Effects Library</h2>
        </div>
        <button
          onClick={handleStopAll}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 active:bg-red-700"
        >
          ⏹ Stop All
        </button>
      </header>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Effects by category */}
      <div className="space-y-3">
        {categories.map((category) => {
          const info = getCategoryInfo(category);
          const categoryEffects = effectsByCategory[category] || [];
          const isExpanded = expandedCategories.has(category);

          return (
            <div
              key={category}
              className={`rounded-xl ${info.bgColor} ring-1 ring-white/5`}
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className={`font-medium ${info.color}`}>
                    {info.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({categoryEffects.length})
                  </span>
                </div>
                <span className="text-slate-500">
                  {isExpanded ? "▼" : "▶"}
                </span>
              </button>

              {/* Category effects */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  {categoryEffects.map((effect) => {
                    const isPlaying = playingEffect === effect.name;
                    return (
                      <button
                        key={effect.name}
                        onClick={() => handlePlay(effect.name)}
                        disabled={isPlaying}
                        className={`group relative flex flex-col items-start rounded-lg p-2.5 text-left transition-all ${
                          isPlaying
                            ? "bg-emerald-500/20 ring-1 ring-emerald-500"
                            : "bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600"
                        }`}
                        title={effect.description}
                      >
                        <span className="text-sm font-medium text-white">
                          {effect.display_name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {effect.duration_ms}ms
                        </span>
                        {isPlaying && (
                          <span className="absolute right-2 top-2 text-emerald-400">
                            ▶
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <p className="mt-4 text-center text-xs text-slate-500">
        {effects.length} effects • Click to test haptic feedback
      </p>
    </section>
  );
}

