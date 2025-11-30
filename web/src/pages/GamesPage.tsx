import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getIntegratedGamesSorted, filterIntegratedGames } from "../data/integratedGames";
import type { IntegratedGameConfig } from "../types/integratedGames";

/**
 * Card component for a game integration
 */
function IntegrationCard({ game }: { game: IntegratedGameConfig }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="group block rounded-2xl bg-slate-800/80 p-5 shadow-lg ring-1 ring-white/5 transition hover:bg-slate-800 hover:ring-white/10 hover:shadow-xl"
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl group-hover:scale-110 transition-transform">
          {game.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition">
            {game.name}
          </h3>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {game.description}
          </p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {game.requiresMod && (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300 ring-1 ring-amber-500/20">
                Mod Required
              </span>
            )}
            {game.steamAppId && (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300 ring-1 ring-blue-500/20">
                Steam
              </span>
            )}
            {game.tags?.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-slate-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        
        {/* Arrow */}
        <svg
          className="h-5 w-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

/**
 * Main games page with filterable list of integrations
 */
export function GamesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const allGames = useMemo(() => getIntegratedGamesSorted(), []);
  const filteredGames = useMemo(
    () => filterIntegratedGames(allGames, searchQuery),
    [allGames, searchQuery]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Game Integrations</h1>
        <p className="mt-2 text-slate-400">
          Configure haptic feedback for your favorite games.
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search games..."
          className="w-full rounded-xl bg-slate-800/80 pl-12 pr-4 py-3 text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-slate-500">
          {filteredGames.length} game{filteredGames.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Games grid */}
      {filteredGames.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredGames.map((game) => (
            <IntegrationCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-800/50 p-12 text-center">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-slate-400">
            No games found matching "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Help text */}
      <div className="rounded-xl bg-slate-800/50 p-4 text-sm text-slate-500">
        <p>
          💡 <strong className="text-slate-400">Tip:</strong> Click on a game to access its dedicated integration page 
          with configuration, setup guide, and live event monitoring.
        </p>
      </div>
    </div>
  );
}

