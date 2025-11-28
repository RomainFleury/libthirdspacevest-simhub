import { useParams, Navigate } from "react-router-dom";
import { RouletteGame } from "./games/RouletteGame";

const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  roulette: RouletteGame,
  // Future games will be added here...
};

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const GameComponent = gameId ? GAME_COMPONENTS[gameId] : null;

  if (!gameId || !GameComponent) {
    return <Navigate to="/mini-games" replace />;
  }

  return <GameComponent />;
}

