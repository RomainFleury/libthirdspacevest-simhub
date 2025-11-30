# Multi-Vest Handling Feature

## Description

Enable the system to handle multiple vests simultaneously, allowing:
- Multiple vests connected at the same time
- Player assignment (assign vests to players)
- "Main" or "preferred" vest for default game integrations
- Games that can use multiple vests as multiple players

## Motivation

- **Current Limitation**: Only one vest can be connected at a time
- **Multiplayer Games**: Need multiple vests for multiplayer experiences
- **Player Management**: Assign specific vests to specific players
- **Flexibility**: Support both single-vest and multi-vest scenarios

## User Story

As a **user**, I want to **connect multiple vests and assign them to players** so that I can **play multiplayer games with haptic feedback for each player**.

## Current Architecture

- **Daemon**: Maintains a single `VestController` instance
- **Device Selection**: Single `_selected_device` - selecting a new device disconnects the previous one
- **Commands**: All commands go to the single selected device
- **UI**: `DeviceSelector` manages one device at a time

## Proposed Solution

1. **VestControllerRegistry**: Manage multiple vest controllers simultaneously
2. **Player Management**: Assign vests to players with names/identifiers
3. **Device Targeting**: Commands can target specific devices or players
4. **Main Device**: Maintain a "main" device for backward compatibility
5. **UI Management Page**: Dedicated page for managing multiple vests and players
6. **Sidebar Integration**: Always show connected vests in sidebar

## Key Features

- **Multiple Connections**: Connect to multiple vests simultaneously
- **Global Player Assignment**: Assign vests to global players (Player 1, Player 2, etc.)
- **Game-Specific Player Mapping**: Map vests to players per game (e.g., CS2: Player 1 = Vest A, Player 2 = Vest B)
- **Main Device**: Set a "main" device that defaults to all single-player games
- **Device Targeting**: Commands can target specific device_id, player_id, or game_player_id
- **Backward Compatible**: Existing single-vest usage continues to work

## Player Mapping Strategy

### Two-Level Mapping System

1. **Global Players** (Optional)
   - Assign vests to global players (Player 1, Player 2, etc.)
   - Used for general multiplayer scenarios

2. **Game-Specific Player Mapping** (Per Game)
   - Each game can have its own player mapping
   - Example: CS2 multiplayer - Player 1 = Vest A, Player 2 = Vest B
   - Example: In-UI Roulette multiplayer - Player 1 = Vest A, Player 2 = Vest B
   - If not configured, defaults to main vest for single-player or global players for multiplayer

3. **Main Vest** (Default)
   - Default vest for all single-player games
   - Used when no game-specific mapping exists
   - Used when game doesn't specify a player number

## Implementation Plan

See `feature-multi-vest-handling-IMPLEMENTATION.md` for detailed implementation plan with:
- Architecture design (7 phases)
- Daemon changes (VestControllerRegistry, PlayerManager)
- Protocol updates (device_id, player_id)
- UI components (VestsPage, PlayerCard, etc.)
- Backward compatibility strategy
- Testing strategy

## Technical Considerations

- **Daemon Changes**: Significant architectural change to support multiple controllers
- **Protocol Updates**: Add device_id/player_id to commands while maintaining backward compatibility
- **UI Complexity**: New management page and sidebar updates
- **Performance**: Registry must handle 4-8 devices efficiently
- **Error Handling**: Robust handling for device disconnections

## Benefits

- **Multiplayer Support**: Enable multiplayer games with haptic feedback
- **Flexibility**: Support both single and multi-vest scenarios
- **Player Management**: Clear assignment of vests to players
- **Backward Compatible**: Existing functionality continues to work