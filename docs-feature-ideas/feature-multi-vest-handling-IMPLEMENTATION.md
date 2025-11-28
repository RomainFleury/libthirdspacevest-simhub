# Multi-Vest Handling - Implementation Plan

## Feature Overview

Enable the system to handle multiple vests simultaneously, allowing:
- Multiple vests connected at the same time
- Player assignment (assign vests to players)
- "Main" or "preferred" vest for default game integrations
- Games that can use multiple vests as multiple players

## Current Architecture Limitations

### Current State
- **Daemon**: Maintains a single `VestController` instance
- **Device Selection**: Single `_selected_device` - selecting a new device disconnects the previous one
- **Commands**: All commands (`trigger`, `stop`, etc.) go to the single selected device
- **UI**: `DeviceSelector` manages one device at a time

### Problem
- Cannot have multiple vests connected simultaneously
- Cannot assign vests to different players
- Games cannot target specific vests

## Architecture Design

### New Multi-Vest Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Daemon (Multi-Vest Manager)                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  VestControllerRegistry                                │  │
│  │  • device_id → VestController mapping                  │  │
│  │  • Maintains multiple active connections               │  │
│  │  • Tracks "main" device for backward compatibility    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PlayerManager                                         │  │
│  │  • Global player_id → device_id mapping                │  │
│  │  • Player names/identifiers                            │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  GamePlayerMapping                                    │  │
│  │  • game_id → {player_num → device_id}                  │  │
│  │  • Per-game player assignments                         │  │
│  │  • Falls back to main vest if not mapped               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Protocol Updates                                            │
│  • Commands can target device_id or player_id               │
│  • Events include device_id/player_id                       │
│  • Backward compatible (no device_id = main device)         │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  UI Updates                                                   │
│  • Multi-vest management page                               │
│  • Global player assignment interface                        │
│  • Game-specific player mapping (per game settings)         │
│  • Always show connected vests in sidebar                   │
│  • Main vest selector                                        │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Daemon - Multi-Vest Controller Registry

**Goal**: Enable daemon to maintain multiple vest connections simultaneously.

**Tasks**:
1. Create `VestControllerRegistry` class to manage multiple controllers
2. Update daemon to use registry instead of single controller
3. Add device_id generation and tracking
4. Update device selection to add to registry (not replace)
5. Maintain backward compatibility (single "main" device)

**Files to Create**:
- `modern-third-space/src/modern_third_space/server/vest_registry.py` - Multi-vest controller registry

**Files to Modify**:
- `modern-third-space/src/modern_third_space/server/daemon.py` - Use registry instead of single controller
- `modern-third-space/src/modern_third_space/server/protocol.py` - Add device_id to commands/events

**Key Changes**:
- Replace `self._controller: Optional[VestController]` with `self._registry: VestControllerRegistry`
- Device selection adds to registry (or updates if already exists)
- Commands can target specific device_id or default to "main"
- Events include device_id information

**Backward Compatibility**:
- If no `device_id` specified in command, use "main" device
- "Main" device is the first selected device or explicitly set
- Existing clients continue to work without changes

---

### Phase 2: Protocol - Device Targeting

**Goal**: Extend protocol to support device-specific commands.

**Tasks**:
1. Add `device_id` and `player_id` fields to `Command` dataclass
2. Add device/player info to events
3. Add new commands: `list_connected_devices`, `set_main_device`, `disconnect_device`
4. Update existing commands to support device_id parameter

**Files to Modify**:
- `modern-third-space/src/modern_third_space/server/protocol.py` - Add device_id/player_id fields

**New Commands**:
- `list_connected_devices` - List all currently connected devices
- `set_main_device` - Set which device is the "main" default
- `disconnect_device` - Disconnect a specific device (by device_id)

**Updated Commands**:
- `trigger` - Can include `device_id` or `player_id` to target specific vest
- `stop` - Can include `device_id` or `player_id`
- `status` - Can query specific device or all devices
- `select_device` - Returns `device_id` for the newly connected device

**Events**:
- `device_connected` - Broadcast when device connects (includes device_id)
- `device_disconnected` - Broadcast when device disconnects (includes device_id)
- `main_device_changed` - Broadcast when main device changes
- All existing events include `device_id` field

---

### Phase 3: Player Management

**Goal**: Add player assignment system to map players to vests.

**Tasks**:
1. Create `PlayerManager` class
2. Add player assignment commands to protocol
3. Implement player → device_id mapping
4. Add player names/identifiers

**Files to Create**:
- `modern-third-space/src/modern_third_space/server/player_manager.py` - Player management

**Files to Modify**:
- `modern-third-space/src/modern_third_space/server/daemon.py` - Integrate PlayerManager
- `modern-third-space/src/modern_third_space/server/protocol.py` - Add player commands

**New Commands**:
- `assign_player` - Assign a device to a player (player_id, device_id)
- `unassign_player` - Remove player assignment
- `list_players` - List all players and their assigned devices
- `get_player_device` - Get device_id for a player

**Player Model**:
```python
@dataclass
class Player:
    player_id: str  # Unique identifier
    name: str  # Display name
    device_id: Optional[str]  # Assigned device_id
    color: Optional[str]  # UI color for player
```

**Usage**:
- Commands can target by `player_id` instead of `device_id`
- Games can send commands to players by name
- UI can show player assignments

---

### Phase 3.5: Game-Specific Player Mapping

**Goal**: Add per-game player mapping system where each game can map its players (1, 2, 3...) to specific vests.

**Tasks**:
1. Create `GamePlayerMapping` class to manage per-game mappings
2. Add game-specific mapping commands to protocol
3. Implement mapping resolution (game_id + player_num → device_id)
4. Fallback logic: game mapping → global player → main device

**Files to Create**:
- `modern-third-space/src/modern_third_space/server/game_player_mapping.py` - Game-specific player mapping

**Files to Modify**:
- `modern-third-space/src/modern_third_space/server/daemon.py` - Integrate GamePlayerMapping
- `modern-third-space/src/modern_third_space/server/protocol.py` - Add game mapping commands

**New Commands**:
- `set_game_player_mapping` - Set player mapping for a game (game_id, player_num, device_id)
- `get_game_player_mapping` - Get player mapping for a game
- `clear_game_player_mapping` - Clear player mapping for a game
- `list_game_mappings` - List all game mappings

**Mapping Resolution Logic**:
```python
def resolve_device_for_game(game_id: str, player_num: int) -> Optional[str]:
    """Resolve device_id for a game's player number."""
    # 1. Check game-specific mapping
    device_id = game_mapping.get(game_id, player_num)
    if device_id:
        return device_id
    
    # 2. Check global player mapping (if player_num matches global player)
    global_player = global_players.get(f"player_{player_num}")
    if global_player and global_player.device_id:
        return global_player.device_id
    
    # 3. Default to main device (for single-player games)
    return main_device_id
```

**Game Model**:
```python
@dataclass
class GamePlayerMapping:
    game_id: str  # e.g., "cs2", "alyx", "roulette"
    player_mappings: Dict[int, str]  # player_num (1,2,3...) → device_id
```

**Usage Examples**:
- CS2 multiplayer: `game_id="cs2"`, `player_num=1` → Vest A, `player_num=2` → Vest B
- Roulette multiplayer: `game_id="roulette"`, `player_num=1` → Vest A, `player_num=2` → Vest B
- Single-player game (no mapping): Uses main vest automatically

**Benefits**:
- Each game can have different player assignments
- Main vest automatically used for single-player games
- Flexible configuration per game
- Supports both single-player and multiplayer scenarios

---

### Phase 4: UI - Multi-Vest Management Page

**Goal**: Create UI for managing multiple vests and player assignments.

**Tasks**:
1. Create "Vests" or "Players" page in navigation
2. Display all connected vests with status
3. Allow connecting/disconnecting individual vests
4. Set main device
5. Assign global players to vests
6. Show player list with assignments
7. **Game-Specific Mapping UI**: Add player mapping configuration per game

**Files to Create**:
- `web/src/pages/VestsPage.tsx` - Multi-vest management page
- `web/src/components/VestCard.tsx` - Individual vest card component
- `web/src/components/PlayerCard.tsx` - Global player assignment card
- `web/src/components/GamePlayerMappingCard.tsx` - Game-specific player mapping card
- `web/src/components/MultiVestDebugPanel.tsx` - Collapsible multi-vest controls for Debug page
- `web/src/hooks/useMultiVest.ts` - Hook for multi-vest management
- `web/src/hooks/useGamePlayerMapping.ts` - Hook for game-specific mappings

**Files to Modify**:
- `web/src/App.tsx` - Add `/vests` route
- `web/src/components/layout/Navigation.tsx` - Add "Vests" tab
- `web/src/lib/bridgeApi.ts` - Add multi-vest API functions
- `web/src/components/layout/Sidebar.tsx` - Show connected vests list
- `web/src/pages/DebugPage.tsx` - Add MultiVestDebugPanel component

**UI Components**:
- **Connected Vests List**: Shows all connected vests with status
- **Main Device Selector**: Radio button to set main device
- **Global Player Assignment**: Drag-and-drop or dropdown to assign global players
- **Game-Specific Player Mapping**: Per-game configuration section
  - Each game integration panel can have a "Player Mapping" section
  - Map Player 1, Player 2, Player 3... to specific vests
  - Shows "Uses main vest" for single-player games
  - Dropdown/selector for each player number
- **Vest Status**: Connection status, last activity, etc.

**Game Integration Panel Updates**:
- Add "Player Mapping" section to each game integration panel (CS2, Alyx, etc.)
- Allow mapping players 1-4 (or more) to specific vests
- Show current mapping status
- "Reset to Main Vest" button for single-player mode

**Debug Page Updates**:
- Add collapsible/foldable "Multi-Vest Management" section to DebugPage
- Quick access to multi-vest controls without navigating away
- Include: connected vests list, set main device, quick connect/disconnect
- Collapsed by default, expandable when needed

---

### Phase 4.5: Log System - Multi-Vest Event Display

**Goal**: Update log system to show events from all vests/players with device/player identification.

**Tasks**:
1. Update `formatDaemonEvent` to include device_id/player_id information
2. Update `LogEntry` type to include device_id/player_id
3. Update `LogPanel` to display device/player badges
4. Add filtering options (show all, filter by device, filter by player)
5. Color-code events by device/player for visual distinction

**Files to Modify**:
- `web/src/hooks/useVestDebugger.ts` - Update formatDaemonEvent function
- `web/src/types.ts` - Add device_id/player_id to LogEntry
- `web/src/components/LogPanel.tsx` - Display device/player info, add filtering

**Log Entry Updates**:
```typescript
export type LogEntry = {
  id: string;
  message: string;
  ts: number;
  level?: "info" | "error";
  device_id?: string;  // NEW - Device that triggered the event
  player_id?: string;  // NEW - Player that triggered the event
  player_num?: number; // NEW - Player number for game-specific events
  game_id?: string;    // NEW - Game that triggered the event
};
```

**Log Display Updates**:
- Show device identifier badge (e.g., "Vest A", "Serial: ABC123")
- Show player badge (e.g., "Player 1", "Player 2")
- Color-code by device/player for quick visual identification
- Add filter dropdown: "All Vests", "Main Vest", "Player 1", "Player 2", etc.
- Show device/player info in log message format

**Example Log Messages**:
- `🎯 Effect triggered: cell 0, speed 5 [Vest A]`
- `🎯 Effect triggered: cell 0, speed 5 [Player 1]`
- `🎯 Effect triggered: cell 0, speed 5 [CS2 - Player 2]`
- `🔌 Connected to vest [Vest B - Serial: XYZ789]`

---

### Phase 5: Sidebar - Always Show Connected Vests

**Goal**: Update sidebar to always show connected vests list.

**Tasks**:
1. Add connected vests list to sidebar
2. Show device status (connected/disconnected)
3. Highlight main device
4. Quick actions (connect/disconnect, set main)

**Files to Modify**:
- `web/src/components/layout/Sidebar.tsx` - Add connected vests section
- `web/src/components/ConnectedVestsList.tsx` - New component for vest list

**Design**:
- Compact list below device selector
- Shows device identifier (serial or bus+address)
- Status indicator (green = connected, gray = disconnected)
- Star icon for main device
- Click to expand details

---

### Phase 6: Game Integration Updates

**Goal**: Update game integrations to support multi-vest (optional).

**Tasks**:
1. Update game managers to support device_id parameter
2. Add player targeting for multiplayer games
3. Maintain backward compatibility (default to main device)

**Files to Modify**:
- `modern-third-space/src/modern_third_space/server/cs2_manager.py` - Add device_id support
- `modern-third-space/src/modern_third_space/server/alyx_manager.py` - Add device_id support
- Other game managers...

**Approach**:
- Game integrations default to main device (backward compatible)
- Can optionally target specific device_id or player_id
- Multiplayer games can send different events to different players

---

### Phase 7: In-UI Games - Multi-Player Support

**Goal**: Enable mini-games to use multiple vests as players.

**Tasks**:
1. Update `useGameHaptics` hook to support device_id/player_id
2. Create `useMultiPlayerGame` hook for multiplayer games
3. Update Roulette game to support multiple players (optional)
4. Create example multiplayer game

**Files to Modify**:
- `web/src/hooks/useGameHaptics.ts` - Add device_id/player_id parameters
- `web/src/pages/games/RouletteGame.tsx` - Add multiplayer mode (optional)

**Files to Create**:
- `web/src/hooks/useMultiPlayerGame.ts` - Hook for multiplayer game logic
- `web/src/pages/games/MultiPlayerExample.tsx` - Example multiplayer game

**Example Multiplayer Game**:
- Each player has a vest
- Game events trigger haptics on specific player's vest
- Turn-based or simultaneous play

---

## Detailed Implementation

### Phase 1: VestControllerRegistry

```python
# modern-third-space/src/modern_third_space/server/vest_registry.py
from typing import Dict, Optional
from ..vest import VestController, VestStatus

class VestControllerRegistry:
    """Manages multiple vest controller instances."""
    
    def __init__(self):
        self._controllers: Dict[str, VestController] = {}
        self._device_info: Dict[str, dict] = {}  # device_id -> device info
        self._main_device_id: Optional[str] = None
    
    def add_device(self, device_id: str, device_info: dict) -> VestController:
        """Add a new device to the registry."""
        if device_id in self._controllers:
            # Already exists, return existing
            return self._controllers[device_id]
        
        controller = VestController()
        controller.connect_to_device(device_info)
        self._controllers[device_id] = controller
        self._device_info[device_id] = device_info
        
        # Set as main if it's the first device
        if self._main_device_id is None:
            self._main_device_id = device_id
        
        return controller
    
    def get_controller(self, device_id: Optional[str] = None) -> Optional[VestController]:
        """Get controller for device_id, or main device if None."""
        if device_id is None:
            device_id = self._main_device_id
        
        return self._controllers.get(device_id)
    
    def remove_device(self, device_id: str) -> bool:
        """Remove and disconnect a device."""
        if device_id not in self._controllers:
            return False
        
        controller = self._controllers[device_id]
        controller.disconnect()
        del self._controllers[device_id]
        del self._device_info[device_id]
        
        # If main device was removed, set new main
        if self._main_device_id == device_id:
            self._main_device_id = next(iter(self._controllers.keys()), None)
        
        return True
    
    def set_main_device(self, device_id: str) -> bool:
        """Set the main device."""
        if device_id not in self._controllers:
            return False
        self._main_device_id = device_id
        return True
    
    def list_devices(self) -> list:
        """List all connected devices."""
        return [
            {
                "device_id": device_id,
                "is_main": device_id == self._main_device_id,
                **self._device_info[device_id]
            }
            for device_id in self._controllers.keys()
        ]
```

### Phase 2: Protocol Updates

```python
# Add to Command dataclass
@dataclass
class Command:
    # ... existing fields ...
    device_id: Optional[str] = None  # Target specific device
    player_id: Optional[str] = None  # Target global player's device
    game_id: Optional[str] = None  # Game identifier for game-specific mapping
    player_num: Optional[int] = None  # Player number (1, 2, 3...) for game-specific mapping
```

### Phase 3.5: GamePlayerMapping

```python
# modern-third-space/src/modern_third_space/server/game_player_mapping.py
from typing import Dict, Optional

class GamePlayerMapping:
    """Manages per-game player to device mappings."""
    
    def __init__(self):
        self._mappings: Dict[str, Dict[int, str]] = {}  # game_id → {player_num → device_id}
    
    def set_mapping(self, game_id: str, player_num: int, device_id: str) -> None:
        """Set player mapping for a game."""
        if game_id not in self._mappings:
            self._mappings[game_id] = {}
        self._mappings[game_id][player_num] = device_id
    
    def get_mapping(self, game_id: str, player_num: int) -> Optional[str]:
        """Get device_id for a game's player number."""
        return self._mappings.get(game_id, {}).get(player_num)
    
    def clear_mapping(self, game_id: str, player_num: Optional[int] = None) -> None:
        """Clear mapping for a game (all players or specific player)."""
        if game_id not in self._mappings:
            return
        if player_num is None:
            del self._mappings[game_id]
        else:
            self._mappings[game_id].pop(player_num, None)
    
    def list_mappings(self) -> Dict[str, Dict[int, str]]:
        """List all game mappings."""
        return self._mappings.copy()
    
    def resolve_device(
        self, 
        game_id: str, 
        player_num: int, 
        global_players: 'PlayerManager',
        main_device_id: Optional[str]
    ) -> Optional[str]:
        """Resolve device_id using fallback logic."""
        # 1. Check game-specific mapping
        device_id = self.get_mapping(game_id, player_num)
        if device_id:
            return device_id
        
        # 2. Check global player mapping (if player_num matches global player)
        global_player = global_players.get_player_by_number(player_num)
        if global_player and global_player.device_id:
            return global_player.device_id
        
        # 3. Default to main device (for single-player games)
        return main_device_id
```

### Phase 3: PlayerManager

```python
# modern-third-space/src/modern_third_space/server/player_manager.py
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class Player:
    player_id: str
    name: str
    device_id: Optional[str] = None
    color: Optional[str] = None

class PlayerManager:
    """Manages player assignments to vests."""
    
    def __init__(self):
        self._players: Dict[str, Player] = {}
        self._next_player_id = 1
    
    def create_player(self, name: str, color: Optional[str] = None) -> Player:
        """Create a new player."""
        player_id = f"player_{self._next_player_id}"
        self._next_player_id += 1
        
        player = Player(
            player_id=player_id,
            name=name,
            color=color
        )
        self._players[player_id] = player
        return player
    
    def assign_device(self, player_id: str, device_id: str) -> bool:
        """Assign a device to a player."""
        if player_id not in self._players:
            return False
        self._players[player_id].device_id = device_id
        return True
    
    def unassign_device(self, player_id: str) -> bool:
        """Remove device assignment from player."""
        if player_id not in self._players:
            return False
        self._players[player_id].device_id = None
        return True
    
    def get_player_device(self, player_id: str) -> Optional[str]:
        """Get device_id for a player."""
        player = self._players.get(player_id)
        return player.device_id if player else None
    
    def list_players(self) -> list:
        """List all players."""
        return [asdict(player) for player in self._players.values()]
    
    def get_player_by_number(self, player_num: int) -> Optional[Player]:
        """Get player by number (e.g., player_num=1 → player_1)."""
        player_id = f"player_{player_num}"
        return self._players.get(player_id)
```

### Phase 4: UI Components

```typescript
// web/src/components/MultiVestDebugPanel.tsx
import { useState } from "react";
import { useMultiVest } from "../hooks/useMultiVest";

export function MultiVestDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { connectedVests, mainDeviceId, setMainDevice, disconnectDevice } = useMultiVest();

  if (connectedVests.length === 0) {
    return null; // Don't show if no vests connected
  }

  return (
    <details className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/5">
      <summary className="cursor-pointer text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-2">
        <span>🔧</span>
        <span>Multi-Vest Management</span>
        <span className="text-xs text-slate-500 ml-auto">
          ({connectedVests.length} {connectedVests.length === 1 ? 'vest' : 'vests'})
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        <div className="text-xs text-slate-400 mb-2">
          Quick access to multi-vest controls. Full management available on Vests page.
        </div>
        <div className="space-y-2">
          {connectedVests.map(vest => (
            <div key={vest.device_id} className="flex items-center justify-between rounded-lg bg-slate-700/50 p-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">
                  {vest.serial_number || `Bus ${vest.bus}, Addr ${vest.address}`}
                </span>
                {vest.device_id === mainDeviceId && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">Main</span>
                )}
              </div>
              <div className="flex gap-2">
                {vest.device_id !== mainDeviceId && (
                  <button
                    onClick={() => setMainDevice(vest.device_id)}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  >
                    Set Main
                  </button>
                )}
                <button
                  onClick={() => disconnectDevice(vest.device_id)}
                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

// web/src/pages/VestsPage.tsx
export function VestsPage() {
  const { connectedVests, mainDeviceId, setMainDevice, connectDevice, disconnectDevice } = useMultiVest();
  const { players, assignPlayer, unassignPlayer } = usePlayers();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Vest Management</h1>
        <p className="mt-2 text-slate-400">
          Manage multiple vest connections and player assignments.
        </p>
      </header>

      {/* Connected Vests */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Connected Vests</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectedVests.map(vest => (
            <VestCard
              key={vest.device_id}
              vest={vest}
              isMain={vest.device_id === mainDeviceId}
              onSetMain={() => setMainDevice(vest.device_id)}
              onDisconnect={() => disconnectDevice(vest.device_id)}
            />
          ))}
        </div>
      </section>

      {/* Player Assignments */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Players</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {players.map(player => (
            <PlayerCard
              key={player.player_id}
              player={player}
              availableVests={connectedVests}
              onAssign={(deviceId) => assignPlayer(player.player_id, deviceId)}
              onUnassign={() => unassignPlayer(player.player_id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
```

## File Structure

```
modern-third-space/src/modern_third_space/server/
├── daemon.py                          # Updated to use registry
├── vest_registry.py                   # NEW - Multi-vest registry
├── player_manager.py                  # NEW - Player management
├── protocol.py                        # Updated with device_id/player_id
└── [game managers...]                 # Updated to support device_id

web/src/
├── pages/
│   ├── VestsPage.tsx                  # NEW - Multi-vest management
│   └── DebugPage.tsx                  # Updated with MultiVestDebugPanel
├── components/
│   ├── VestCard.tsx                   # NEW - Vest card component
│   ├── PlayerCard.tsx                 # NEW - Player card component
│   ├── GamePlayerMappingCard.tsx      # NEW - Game mapping card
│   ├── MultiVestDebugPanel.tsx        # NEW - Debug page multi-vest panel
│   ├── ConnectedVestsList.tsx         # NEW - Sidebar vest list
│   ├── LogPanel.tsx                   # Updated with device/player display
│   └── layout/
│       └── Sidebar.tsx                 # Updated with vest list
├── hooks/
│   ├── useMultiVest.ts                # NEW - Multi-vest hook
│   ├── usePlayers.ts                  # NEW - Player management hook
│   ├── useGamePlayerMapping.ts        # NEW - Game mapping hook
│   ├── useVestDebugger.ts             # Updated log formatting
│   └── useGameHaptics.ts              # Updated with device_id support
├── types.ts                           # Updated LogEntry type
└── lib/
    └── bridgeApi.ts                   # Updated with multi-vest API
```

## Backward Compatibility

### Protocol Compatibility
- Commands without `device_id` default to "main" device
- Existing clients continue to work without changes
- New fields are optional

### UI Compatibility
- Single-vest mode still works (just one device in registry)
- Main device is automatically set to first connected device
- Existing DeviceSelector continues to work

### Game Integration Compatibility
- Game integrations default to main device
- No changes required for existing integrations
- New `device_id` parameter is optional

## Testing Strategy

### Unit Tests
- VestControllerRegistry: Add/remove devices, main device management
- PlayerManager: Player creation, assignment, unassignment
- Protocol: Command parsing with device_id/player_id

### Integration Tests
- Multiple devices connected simultaneously
- Commands targeting specific devices
- Player assignment and device targeting
- Main device switching

### Manual Testing
- Connect multiple vests
- Assign players to vests
- Send commands to specific devices/players
- Test game integrations with multiple vests
- Test backward compatibility

## Success Criteria

- [ ] Multiple vests can be connected simultaneously
- [ ] Commands can target specific devices or players
- [ ] Player assignment system works
- [ ] Main device can be set and changed
- [ ] UI shows all connected vests
- [ ] Sidebar displays connected vests list
- [ ] Backward compatibility maintained
- [ ] Games can use multiple vests
- [ ] No regressions in existing functionality

## Implementation Checklist

### Phase 1: Daemon Registry
- [ ] Create VestControllerRegistry class
- [ ] Update daemon to use registry
- [ ] Add device_id generation
- [ ] Update device selection logic
- [ ] Test multiple device connections

### Phase 2: Protocol Updates
- [ ] Add device_id/player_id to Command
- [ ] Add device_id to events
- [ ] Add new commands (list_connected_devices, set_main_device, disconnect_device)
- [ ] Update command handlers
- [ ] Test protocol backward compatibility

### Phase 3: Player Management
- [ ] Create PlayerManager class
- [ ] Add player commands to protocol
- [ ] Implement global player assignment
- [ ] Test player → device mapping

### Phase 3.5: Game-Specific Player Mapping
- [ ] Create GamePlayerMapping class
- [ ] Add game mapping commands to protocol
- [ ] Implement mapping resolution logic
- [ ] Test game-specific mappings
- [ ] Test fallback logic (game → global → main)

### Phase 4: UI - Management Page
- [ ] Create VestsPage component
- [ ] Create VestCard component
- [ ] Create PlayerCard component (global players)
- [ ] Create GamePlayerMappingCard component
- [ ] Add useMultiVest hook
- [ ] Add usePlayers hook
- [ ] Add useGamePlayerMapping hook
- [ ] Update bridgeApi with multi-vest and game mapping functions
- [ ] Add route to App.tsx
- [ ] Add game-specific mapping UI to game integration panels
- [ ] Test UI functionality

### Phase 5: Sidebar Updates
- [ ] Create ConnectedVestsList component
- [ ] Update Sidebar to show vest list
- [ ] Add quick actions
- [ ] Test sidebar display

### Phase 6: Game Integration Updates
- [ ] Update game managers to support device_id
- [ ] Test game integrations with multiple vests
- [ ] Maintain backward compatibility

### Phase 7: In-UI Games Multi-Player
- [ ] Update useGameHaptics hook
- [ ] Create useMultiPlayerGame hook
- [ ] Create example multiplayer game
- [ ] Test multiplayer functionality

## Future Enhancements

1. **Vest Groups**: Group vests together for synchronized effects
2. **Player Profiles**: Save/load player configurations
3. **Vest Health Monitoring**: Track connection stability, errors
4. **Automatic Reconnection**: Auto-reconnect disconnected vests
5. **Vest Calibration**: Per-vest calibration settings
6. **Multi-Player Game Templates**: Reusable multiplayer game framework

## Notes

- **Complexity**: This is a significant architectural change affecting daemon, protocol, and UI
- **Backward Compatibility**: Critical - existing clients must continue to work
- **Testing**: Extensive testing needed for multiple device scenarios
- **Performance**: Registry should handle 4-8 devices efficiently
- **Error Handling**: Robust error handling for device disconnections, USB issues

