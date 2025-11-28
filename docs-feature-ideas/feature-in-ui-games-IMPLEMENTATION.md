# In-UI Games Feature - Implementation Plan

## Feature Overview

Create a framework for web-based mini-games within the Electron UI that can trigger haptic feedback on the vest. Games are accessible from a dedicated page/section and each game has its own page.

**Example Game: Roulette**
- Player clicks a box
- Game picks random number 1-10
- 10 = front hit (cells 2, 5, 3, 4)
- 1 = back hit (cells 1, 6, 0, 7)

## Architecture Design

```
┌─────────────────────────────────────────────────────────┐
│  Main App (App.tsx)                                     │
│  • Navigation/routing                                    │
│  • Game list page                                       │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ routing
┌─────────────────────────────────────────────────────────┐
│  Games Section                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Games List Page                                   │ │
│  │  • List of available games                         │ │
│  │  • Game cards with preview                         │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Individual Game Pages                            │ │
│  │  • Roulette game                                   │ │
│  │  • Future games...                                 │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ haptic triggers
┌─────────────────────────────────────────────────────────┐
│  Game Haptic API                                        │
│  • triggerCell(cell, speed)                            │
│  • triggerCells(cells[], speed)                        │
│  • triggerPreset(preset)                               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ IPC
┌─────────────────────────────────────────────────────────┐
│  Daemon Bridge                                          │
│  • Sends haptic commands to daemon                     │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Routing & Navigation Foundation

**Goal:** Add routing to the app so we can navigate between main page and games section.

**Tasks:**
1. Install React Router (if not already installed)
2. Set up routing structure
3. Create navigation component
4. Create games list page skeleton

**Files to Create/Modify:**
- `web/package.json` - Add react-router-dom dependency
- `web/src/App.tsx` - Add routing structure
- `web/src/components/Navigation.tsx` - Navigation bar/links
- `web/src/pages/MainPage.tsx` - Extract current App content
- `web/src/pages/GamesListPage.tsx` - Games list page

### Phase 2: Game Framework & Haptic API

**Goal:** Create a reusable framework for games and haptic integration.

**Tasks:**
1. Create game haptic API hook
2. Create game base component/utilities
3. Define game interface/type

**Files to Create:**
- `web/src/hooks/useGameHaptics.ts` - Hook for triggering haptics from games
- `web/src/lib/gameFramework.ts` - Game utilities and types
- `web/src/types/games.ts` - TypeScript types for games

### Phase 3: First Game - Roulette

**Goal:** Implement the roulette game as proof of concept.

**Tasks:**
1. Create roulette game component
2. Implement game logic (random 1-10)
3. Map results to haptic feedback
4. Add game to games list

**Files to Create:**
- `web/src/pages/games/RouletteGame.tsx` - Roulette game component
- `web/src/data/games.ts` - Game metadata registry

### Phase 4: Polish & Extensibility

**Goal:** Make it easy to add more games and polish the UI.

**Tasks:**
1. Improve game list UI
2. Add game descriptions/previews
3. Create game template/boilerplate
4. Documentation for adding new games

**Files to Create/Modify:**
- `web/src/components/GameCard.tsx` - Game card component for list
- `docs-feature-ideas/GAME_DEVELOPMENT_GUIDE.md` - Guide for creating new games

## Detailed Implementation

### Phase 1: Routing & Navigation

#### 1.1 Install React Router

```bash
cd web
yarn add react-router-dom
yarn add -D @types/react-router-dom
```

#### 1.2 Update App.tsx for Routing

```typescript
// web/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainPage } from './pages/MainPage';
import { GamesListPage } from './pages/GamesListPage';
import { Navigation } from './components/Navigation';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Navigation />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/games" element={<GamesListPage />} />
          <Route path="/games/:gameId" element={<GamePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

#### 1.3 Create Navigation Component

```typescript
// web/src/components/Navigation.tsx
import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="border-b border-slate-800 p-4">
      <div className="flex gap-4">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Debugger Console
        </Link>
        <Link to="/games" className={location.pathname.startsWith('/games') ? 'active' : ''}>
          🎮 Games
        </Link>
      </div>
    </nav>
  );
}
```

#### 1.4 Extract Main Page

Move current App.tsx content to `web/src/pages/MainPage.tsx`

#### 1.5 Create Games List Page

```typescript
// web/src/pages/GamesListPage.tsx
import { Link } from 'react-router-dom';
import { games } from '../data/games';

export function GamesListPage() {
  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold text-white mb-6">🎮 In-UI Games</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <Link key={game.id} to={`/games/${game.id}`}>
            <GameCard game={game} />
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Phase 2: Game Framework

#### 2.1 Game Haptics Hook

```typescript
// web/src/hooks/useGameHaptics.ts
import { useCallback } from 'react';
import { triggerEffect } from '../lib/bridgeApi';
import { Cell } from '../types/cells';

export function useGameHaptics() {
  const triggerCell = useCallback(async (cell: number, speed: number = 5) => {
    await triggerEffect({ cell, speed });
  }, []);

  const triggerCells = useCallback(async (cells: number[], speed: number = 5) => {
    // Trigger all cells simultaneously
    await Promise.all(cells.map(cell => triggerEffect({ cell, speed })));
  }, []);

  const triggerPreset = useCallback(async (preset: 'front' | 'back' | 'all', speed: number = 5) => {
    const cellMap = {
      front: [2, 5, 3, 4],  // Front cells
      back: [1, 6, 0, 7],   // Back cells
      all: [0, 1, 2, 3, 4, 5, 6, 7],
    };
    await triggerCells(cellMap[preset], speed);
  }, [triggerCells]);

  return {
    triggerCell,
    triggerCells,
    triggerPreset,
  };
}
```

#### 2.2 Game Types

```typescript
// web/src/types/games.ts
export interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: React.ComponentType;
}

export interface GameMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
}
```

#### 2.3 Game Registry

```typescript
// web/src/data/games.ts
import { GameMetadata } from '../types/games';

export const games: GameMetadata[] = [
  {
    id: 'roulette',
    name: 'Roulette',
    description: 'Click to spin! Random number 1-10 determines haptic feedback.',
    icon: '🎰',
  },
  // Future games...
];
```

### Phase 3: Roulette Game

#### 3.1 Roulette Component

```typescript
// web/src/pages/games/RouletteGame.tsx
import { useState } from 'react';
import { useGameHaptics } from '../../hooks/useGameHaptics';

export function RouletteGame() {
  const { triggerPreset } = useGameHaptics();
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleSpin = async () => {
    if (rolling) return;
    
    setRolling(true);
    setResult(null);
    
    // Simulate rolling delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pick random number 1-10
    const number = Math.floor(Math.random() * 10) + 1;
    setResult(number);
    setRolling(false);
    
    // Trigger haptic feedback
    if (number === 10) {
      // Front hit
      await triggerPreset('front', 7);
    } else if (number === 1) {
      // Back hit
      await triggerPreset('back', 7);
    } else {
      // Light feedback on front for other numbers
      await triggerPreset('front', 3);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-6">🎰 Roulette</h1>
      
      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <button
          onClick={handleSpin}
          disabled={rolling}
          className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-xl disabled:opacity-50"
        >
          {rolling ? 'Rolling...' : 'Spin!'}
        </button>
        
        {result !== null && (
          <div className="mt-6">
            <p className="text-2xl text-white">Result: <span className="font-bold text-blue-400">{result}</span></p>
            {result === 10 && <p className="text-green-400 mt-2">Front hit! 💥</p>}
            {result === 1 && <p className="text-red-400 mt-2">Back hit! 💥</p>}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 3.2 Game Page Router

```typescript
// web/src/pages/GamePage.tsx
import { useParams } from 'react-router-dom';
import { RouletteGame } from './games/RouletteGame';

const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  roulette: RouletteGame,
  // Future games...
};

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const GameComponent = gameId ? GAME_COMPONENTS[gameId] : null;

  if (!GameComponent) {
    return <div>Game not found</div>;
  }

  return <GameComponent />;
}
```

## File Structure

```
web/src/
├── App.tsx                          # Updated with routing
├── components/
│   ├── Navigation.tsx               # NEW - Navigation bar
│   └── GameCard.tsx                 # NEW - Game card for list
├── pages/
│   ├── MainPage.tsx                 # NEW - Current App content
│   ├── GamesListPage.tsx            # NEW - Games list
│   ├── GamePage.tsx                 # NEW - Game router
│   └── games/
│       └── RouletteGame.tsx         # NEW - Roulette game
├── hooks/
│   └── useGameHaptics.ts            # NEW - Haptic API for games
├── lib/
│   └── gameFramework.ts             # NEW - Game utilities
├── types/
│   └── games.ts                     # NEW - Game types
└── data/
    └── games.ts                     # NEW - Game registry
```

## Haptic Mapping for Roulette

```typescript
// Roulette haptic mapping
1  → Back cells (1, 6, 0, 7), speed 7
2-9 → Front cells (2, 5, 3, 4), speed 3 (light feedback)
10 → Front cells (2, 5, 3, 4), speed 7 (strong feedback)
```

## Future Games Ideas

Once the framework is in place, adding new games is easy:

1. **Whack-a-Mole** - Click moles, haptic on hit
2. **Reaction Test** - Click when light appears, haptic on success
3. **Simon Says** - Follow pattern, haptic for each step
4. **Target Practice** - Click targets, directional haptics
5. **Rhythm Game** - Tap in rhythm, haptic on beat

## Testing Strategy

### Unit Tests
- Game haptics hook functionality
- Game logic (random number generation, etc.)

### Integration Tests
- Routing between pages
- Haptic triggers from games
- Game state management

### User Testing
- Game is fun and engaging
- Haptic feedback feels good
- UI is intuitive
- Easy to navigate

## Dependencies

**New Dependencies:**
- `react-router-dom` - For routing/navigation
- `@types/react-router-dom` - TypeScript types

**Existing Dependencies Used:**
- React hooks (useState, useCallback)
- Existing haptic API (`triggerEffect`)

## Implementation Checklist

### Phase 1: Routing & Navigation
- [ ] Install react-router-dom
- [ ] Create Navigation component
- [ ] Extract MainPage from App.tsx
- [ ] Create GamesListPage
- [ ] Set up routing in App.tsx
- [ ] Test navigation

### Phase 2: Game Framework
- [ ] Create useGameHaptics hook
- [ ] Create game types
- [ ] Create game registry
- [ ] Create game utilities

### Phase 3: Roulette Game
- [ ] Create RouletteGame component
- [ ] Implement game logic
- [ ] Implement haptic mapping
- [ ] Add to game registry
- [ ] Create GamePage router
- [ ] Test roulette game

### Phase 4: Polish
- [ ] Create GameCard component
- [ ] Improve games list UI
- [ ] Add game descriptions
- [ ] Create game development guide
- [ ] Test user experience

## Notes

- **No Backend Changes Needed** - Games run entirely in the UI, using existing haptic API
- **No Protocol Changes** - Uses existing `vest:trigger` IPC handler
- **Extensible** - Easy to add new games by creating component and adding to registry
- **Framework First** - Build the framework, then implement first game as proof of concept

