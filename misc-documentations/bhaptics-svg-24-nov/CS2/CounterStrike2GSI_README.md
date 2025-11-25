# Counter-Strike 2 GSI (Game State Integration)

Counter-Strike 2 .NET GitHub Release NuGet Version NuGet Downloads

A C# library to interface with the Game State Integration found in Counter-Strike 2.

---

## About Counter-Strike 2 GSI

This library provides an easy way to implement Game State Integration from Counter-Strike 2 into C# applications through exposing a number of events.

Underneath the hood, once the library is started, it continuously listens for HTTP POST requests made by the game on a specific address and port. When a request is received, the JSON data is parsed into GameState object and is offered to your C# application through the `NewGameState` event. The library also subscribes to `NewGameState` to determine more granular changes to raise more specific events (such as `BombStateUpdated`, `RoundConcluded`, etc.).

---

## Quick Start

1. **Create handlers and subscribe for events your application will be using.**  
If your application just needs `GameState` information, subscribe to the `NewGameState` event:

```csharp
gsl.NewGameState += OnNewGameState;

void OnNewGameState(GameState gs)
{
    // Read information from the game state.
}
```

2. **To utilize Game Events in your application:**  
Subscribe to any event from the Implemented Game Events list:

```csharp
gsl.GameEvent += OnGameEvent; // Fires on every GameEvent
gsl.BombStateUpdated += OnBombStateUpdated; // For Bomb events, etc.

void OnGameEvent(CS2GameEvent game_event)
{
    // Read information from the game event.

    if (game_event is PlayerTookDamage player_took_damage)
    {
        Console.WriteLine($"The player {player_took_damage.Player.Name} took {player_took_damage.Previous - player_took_damage.New} damage!");
    }
    // ... handle other events
}
```

Finally, **start the GameStateListener** to begin capturing HTTP POST requests:

```csharp
if (!gsl.Start())
{
    // GameStateListener could not start.
}
// GameStateListener started and is listening for Game State requests.
```

---

## Implemented Game Events

- `GameEvent` - Fires for all listed events.
- Bomb: `BombUpdated`, `BombPlanting`, `BombPlanted`, etc.
- Player: `PlayerUpdated`, `PlayerTeamChanged`, `PlayerDied`, `PlayerTookDamage`, etc.
- Map: `MapUpdated`, `RoundChanged`, `RoundConcluded`, etc.
- PhaseCountdowns, Grenades, Teams, Rounds...

See the original [GitHub README](https://github.com/antonpup/CounterStrike2GSI#readme) for a full list.

---

## Game State Structure

GameState contains detailed info about:
- Auth, Provider, Map, Round, Player, Weapons, AllPlayers, AllGrenades, Bomb, TournamentDraft, etc.

```
// Example:
GameState
+-- Player
|   +-- SteamID, Name, Team, State (Health, Armor, Money, etc.)
|   +-- Weapons[]
|   +-- MatchStats (Kills, Deaths, Score, etc.)
+-- Map
|   +-- Name, Mode, CTStatistics, TStatistics, RoundWins
+-- Bomb, Round, PhaseCountdowns, etc.
```

---

## Null value handling

- bool: `false`
- int: `-1`
- long: `-1`
- float: `-1`
- string: `String.Empty`
- enum: `Undefined`

---

## Links
- [GitHub Project](https://github.com/antonpup/CounterStrike2GSI)
- [NuGet Package](https://www.nuget.org/packages/CounterStrike2GSI)

---
