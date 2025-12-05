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
    id: "superhot",
    name: "SUPERHOT VR",
    description: "MelonLoader mod for VR haptic feedback",
    icon: "🔴",
    steamAppId: 617830,
    requiresMod: true,
    tags: ["vr", "action"],
  },
  {
    id: "pistolwhip",
    name: "Pistol Whip",
    description: "MelonLoader mod for rhythm shooter haptics",
    icon: "🔫",
    steamAppId: 1079800,
    requiresMod: true,
    tags: ["vr", "rhythm"],
  },
  {
    id: "bf2",
    name: "Star Wars Battlefront II (2017)",
    description: "Frosty mod for haptic feedback in Battlefront II",
    icon: "⚔️",
    hasConfiguration: true,
    hasSetupGuide: true,
    requiresMod: true,
    tags: ["fps", "star-wars"],
  },
  {
    id: "ultrakill",
    name: "ULTRAKILL",
    description: "BepInEx mod for fast-paced FPS haptics",
    icon: "💀",
    steamAppId: 1229490,
    requiresMod: true,
    tags: ["fps", "retro"],
  },
  {
    id: "gtav",
    name: "Grand Theft Auto V",
    description: "ScriptHookV mod for open-world haptics",
    icon: "🚗",
    steamAppId: 271590,
    requiresMod: true,
    tags: ["open-world", "action"],
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
  {
    id: "ut",
    name: "Unreal Tournament",
    description: "Game log-based haptic feedback for arena combat",
    icon: "🎮",
    hasConfiguration: true,
    hasSetupGuide: true,
    tags: ["fps", "arena", "classic"],
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
