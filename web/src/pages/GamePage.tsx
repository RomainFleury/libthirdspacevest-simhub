import { useParams, Navigate } from "react-router-dom";
import { RouletteGame } from "./games/RouletteGame";
import { MultiRouletteGame } from "./games/MultiRouletteGame";

const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  roulette: RouletteGame,
  "multi-roulette": MultiRouletteGame,
  // Future games will be added here...
};

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const GameComponent = gameId ? GAME_COMPONENTS[gameId] : null;

  if (!gameId || !GameComponent) {
    return <Navigate to="/mini-games" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <GameComponent />
    </div>
  );
}

