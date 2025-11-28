import { Link } from "react-router-dom";
import { GameMetadata } from "../types/games";

type Props = {
  game: GameMetadata;
};

export function GameCard({ game }: Props) {
  return (
    <Link
      to={`/mini-games/${game.id}`}
      className="block rounded-2xl bg-slate-800/80 p-6 shadow-lg ring-1 ring-white/5 hover:ring-blue-500/50 transition-all hover:scale-105"
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl">{game.icon}</div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            {game.name}
          </h3>
          <p className="text-sm text-slate-400">{game.description}</p>
        </div>
        <div className="text-slate-500">→</div>
      </div>
    </Link>
  );
}

