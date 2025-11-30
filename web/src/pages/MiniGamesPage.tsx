import { games } from "../data/games";
import { GameCard } from "../components/GameCard";

export function MiniGamesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Mini-Games
        </h1>
        <p className="mt-2 text-sm md:text-base text-slate-400">
          Interactive games with haptic feedback.
        </p>
      </header>

      {games.length === 0 ? (
        <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
          <p className="text-slate-400">No games available yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}

