import { useParams, Navigate } from "react-router-dom";
import { 
  CS2IntegrationPage, 
  AlyxIntegrationPage,
  SuperHotIntegrationPage,
  PistolWhipIntegrationPage,
  L4D2IntegrationPage,
  ArmaReforgerIntegrationPage,
} from "./integrations";

/**
 * Map of game IDs to their integration page components
 */
const INTEGRATION_PAGES: Record<string, React.ComponentType> = {
  cs2: CS2IntegrationPage,
  alyx: AlyxIntegrationPage,
  superhot: SuperHotIntegrationPage,
  pistolwhip: PistolWhipIntegrationPage,
  l4d2: L4D2IntegrationPage,
  armareforger: ArmaReforgerIntegrationPage,
  // Future integrations:
  // bf2: BF2IntegrationPage,
  // ultrakill: UltrakillIntegrationPage,
  // gtav: GTAVIntegrationPage,
};

/**
 * Router component for individual game integration pages
 */
export function IntegrationPage() {
  const { gameId } = useParams<{ gameId: string }>();
  
  if (!gameId) {
    return <Navigate to="/games" replace />;
  }

  const PageComponent = INTEGRATION_PAGES[gameId];
  
  if (!PageComponent) {
    // Game not found or not yet implemented
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-2xl bg-slate-800/80 p-8 text-center">
          <span className="text-6xl mb-4 block">🚧</span>
          <h1 className="text-2xl font-bold text-white mb-2">Coming Soon</h1>
          <p className="text-slate-400 mb-6">
            The integration page for this game is not yet available.
          </p>
          <a
            href="/games"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600/80 px-4 py-2 font-medium text-white transition hover:bg-blue-600"
          >
            ← Back to Games
          </a>
        </div>
      </div>
    );
  }

  return <PageComponent />;
}
