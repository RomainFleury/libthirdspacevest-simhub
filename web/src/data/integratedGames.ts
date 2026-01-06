import type { IntegratedGameConfig } from "../types/integratedGames";

/**
 * Registry of all integrated games
 * Games are displayed in alphabetical order on the main page
 */
export const integratedGames: IntegratedGameConfig[] = [
  {
    id: "cs2",
    name: "Counter-Strike 2",
    description: "GSI-based haptic feedback for damage, kills, and events",
    icon: "🎯",
    steamAppId: 730,
    hasConfiguration: true,
    hasSetupGuide: true,
    tags: ["fps", "competitive", "valve"],
  },
  {
    id: "alyx",
    name: "Half-Life: Alyx",
    description: "VR haptic integration via console log monitoring",
    icon: "🦑",
    steamAppId: 546560,
    steamLaunchOptions: "-condebug",
    hasSetupGuide: true,
    requiresMod: true,
    tags: ["vr", "fps", "valve"],
  },
  {
    id: "l4d2",
    name: "Left 4 Dead 2",
    description: "Console log-based haptic feedback for zombie survival",
    icon: "🧟",
    steamAppId: 550,
    steamLaunchOptions: "-condebug",
    hasConfiguration: true,
    hasSetupGuide: true,
    tags: ["fps", "coop", "valve", "zombie"],
  },
];

/**
 * Get a game by its ID
 */
export function getIntegratedGame(id: string): IntegratedGameConfig | undefined {
  return integratedGames.find(g => g.id === id);
}

/**
 * Get games sorted alphabetically
 */
export function getIntegratedGamesSorted(): IntegratedGameConfig[] {
  return [...integratedGames].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Filter games by search query
 */
export function filterIntegratedGames(games: IntegratedGameConfig[], query: string): IntegratedGameConfig[] {
  const q = query.toLowerCase().trim();
  if (!q) return games;
  
  return games.filter(game => 
    game.name.toLowerCase().includes(q) ||
    game.description.toLowerCase().includes(q) ||
    game.tags?.some(tag => tag.toLowerCase().includes(q))
  );
}
