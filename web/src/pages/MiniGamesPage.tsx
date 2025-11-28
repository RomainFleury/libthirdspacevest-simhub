export function MiniGamesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Mini-Games</h1>
        <p className="mt-2 text-sm md:text-base text-slate-400">
          Interactive games with haptic feedback.
        </p>
      </header>

      <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
        <p className="text-slate-400">
          Mini-games coming soon! This feature will be implemented as part of
          the "In UI Games" feature.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          See <code className="text-blue-400">docs-feature-ideas/feature-in-ui-games.md</code> for details.
        </p>
      </div>
    </div>
  );
}

