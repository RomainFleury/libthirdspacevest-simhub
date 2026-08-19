# EA Battlefront II (2017): Exact Event Integration with KYBER

> **Status: SOURCE INVESTIGATION COMPLETE / RUNTIME SPIKE REQUIRED**
>
> **Decision:** pursue exact, server-authoritative combat events through a KYBER
> native extension and expose them to multiple vest daemons on a trusted LAN.
> Non-authoritative event inference is explicitly out of scope.

## Scope and non-goals

This plan applies to **EA/DICE Star Wars Battlefront II (2017)** on Frostbite.
It does not apply to the 2005 Pandemic-engine game.

The initial target environments are:

- KYBER private servers on a trusted LAN
- A password-protected KYBER development server
- Offline testing where the KYBER module can run safely

The following are not supported:

- Official EA matchmaking
- A Frosty-only `.fbmod`
- Approximate events inferred from the screen, input, ammo, or health polling
- Features that expose hidden enemy state or provide a competitive advantage

EA advises against using mods online. Native hooks must not be tested on
official servers.

## Why KYBER

[KYBER](https://github.com/ArmchairDevelopers/Kyber) is an open-source
Battlefront II private-server platform. Its injected C++ module already maps
Frostbite types, installs native hooks, runs server-side Lua plugins, and
forwards named native events into Lua.

This investigation pins KYBER `ver/beta10` commit
[`c64e079`](https://github.com/ArmchairDevelopers/Kyber/tree/c64e07940a7e127176ef7f2b09cf34ad5830f468)
and PluginExamples commit
[`bf5cb1e`](https://github.com/ArmchairDevelopers/PluginExamples/tree/bf5cb1e1faeb31a0ffa3f182fcfc37d4aca7ad1a).

Verified capabilities at those revisions:

- [`ServerPlayer:Killed`](https://github.com/ArmchairDevelopers/Kyber/blob/c64e07940a7e127176ef7f2b09cf34ad5830f468/Module/Source/Core/Program.cpp#L432-L443)
  provides victim, killer, and killer weapon.
- The official
  [Gun Game plugin](https://github.com/ArmchairDevelopers/PluginExamples/blob/bf5cb1e1faeb31a0ffa3f182fcfc37d4aca7ad1a/GunGame/server/__init__.lua)
  subscribes to kill, spawn, join, level, and server-update events.
- [`PlayerManager.GetPlayers()`](https://github.com/ArmchairDevelopers/Kyber/blob/c64e07940a7e127176ef7f2b09cf34ad5830f468/Module/Source/Script/LuaPlayerManager.cpp#L97-L118)
  returns a snapshot of the current non-spectator player list.
- Lua player objects expose
  [`name`, `playerId`, `isBot`, and `isSpawned`](https://github.com/ArmchairDevelopers/Kyber/blob/c64e07940a7e127176ef7f2b09cf34ad5830f468/Module/Source/Script/LuaPlayerManager.cpp#L626-L689).
  `playerId` is the KYBER user ID installed after join-token validation, so
  display names can be used for discovery while IDs are used for event routing.
- KYBER fires
  [`ServerPlayer:Joined`](https://github.com/ArmchairDevelopers/Kyber/blob/c64e07940a7e127176ef7f2b09cf34ad5830f468/Module/Source/Core/Server.cpp#L595-L617)
  and
  [`ServerPlayer:Disconnect`](https://github.com/ArmchairDevelopers/Kyber/blob/c64e07940a7e127176ef7f2b09cf34ad5830f468/Module/Source/Core/Program.cpp#L403-L419).
- [`SDK.h`](https://github.com/ArmchairDevelopers/Kyber/blob/c64e07940a7e127176ef7f2b09cf34ad5830f468/Module/Public/SDK/SDK.h)
  models `HealthComponent`, `ServerCharacterEntity`, and `WeaponFiring`.
- [`LuaSocketManager.cpp`](https://github.com/ArmchairDevelopers/Kyber/blob/c64e07940a7e127176ef7f2b09cf34ad5830f468/Module/Source/Script/LuaSocketManager.cpp)
  provides TCP `Create`, `Accept`, `Recv`, `Send`, and `Close` operations.
- The official
  [`HttpServer`](https://github.com/ArmchairDevelopers/PluginExamples/blob/bf5cb1e1faeb31a0ffa3f182fcfc37d4aca7ad1a/OfficialServerTools/server/http_server.lua#L57-L121)
  repeatedly accepts sockets and keeps them in a client table. Multiple
  simultaneous accepted clients are therefore supported by the exposed API;
  the telemetry plugin must implement its own per-client state.

KYBER does **not** currently expose a documented event for each accepted shot
or each nonlethal damage application. Those two native events are the work
required by this plan and cannot be validated by source inspection alone.

### Source-investigation conclusions

| Question | Finding |
|---|---|
| Can Lua enumerate players already in the match? | Yes, with `PlayerManager.GetPlayers()`. |
| Can Lua track later roster changes? | Yes, with joined/disconnect events followed by a fresh snapshot. |
| Are names and stable routing IDs available? | Yes. Configure by display name, then route by `playerId`. |
| Can more than one daemon connect? | Yes at the socket API level; the official HTTP example keeps multiple clients. |
| Can the listener bind to a selected LAN address? | No. `SocketManager.Create(port)` currently binds `INADDR_ANY`. |
| Are writes production-safe? | No. `Send` is immediate, may be partial, and turns socket errors into Lua errors. Buffering/backpressure support is required. |
| Do exact shot and nonlethal damage events already exist? | No. Native hooks still require an instrumented runtime spike. |

## Architecture

```text
Battlefront II clients
        |
        v
KYBER private server
  C++ hook: accepted shot
  C++ hook: applied damage
        |
        v named Lua callbacks
Third Space KYBER server plugin
  publish roster snapshots
  resolve subscriptions to player IDs
  maintain per-client NDJSON queues
  TCP listener on LAN port 5051
        |
        +-- Player A daemon -> Player A USB vest
        +-- Player B daemon -> Player B USB vest
        `-- Player C daemon -> Player C USB vest
```

Each player's SWBF2 manager runs inside that player's local Python daemon. It
validates, orders, and maps only the subscribed player's events to haptics.
All hardware commands continue to flow through the daemon. The KYBER module
and plugin must never access a vest directly.

### Transport direction

KYBER's current Lua socket API creates a listener; it does not expose an
outbound `connect`. Therefore:

1. The KYBER plugin listens on a configurable telemetry port, default `5051`.
2. Every player's daemon connects to the KYBER server's LAN address.
3. The plugin accepts all pending connections and maintains a separate state
   and bounded output queue for each one.
4. Daemons and the plugin exchange one JSON object per line.
5. Each accepted connection receives a unique stream `epoch` and a
   monotonically increasing `seq` across every record sent on that connection.
   Reconnection creates a new epoch and starts again at sequence 1.

The first prototype is deliberately unauthenticated. Anyone able to reach port
`5051` on the trusted LAN can connect and request a player's event stream. The
protocol is read-only with respect to the game: accepted client messages may
select a player or request the latest roster, but must never execute game,
server, console, or vest commands.

The current socket implementation binds to `INADDR_ANY`; it cannot select a
specific interface. For the LAN prototype:

- expose port `5051` only on the trusted private subnet;
- restrict it with the host firewall;
- impose global and per-IP connection limits; and
- do not forward the port through the Internet router.

`Accept` can be called repeatedly and the official HTTP plugin demonstrates a
multi-client table. However, the current `Send` binding performs one immediate
Winsock `send`, does not finish partial writes, and raises a Lua error for
`WSAEWOULDBLOCK`. Before sustained gameplay telemetry, extend the C++ binding
to expose nonfatal would-block/partial-write results, or add a native queued
send abstraction. A slow daemon must never stall the KYBER update thread or
another daemon.

If the dedicated server runs in Docker, publish the telemetry port on the
server's LAN address:

```text
192.168.1.50:5051 -> KYBER container telemetry port
```

The exact host address is deployment-specific and must not be hard-coded.

## Event contract

Events are newline-delimited JSON. Required fields are deliberately small and
versioned so the daemon can reject incompatible messages.

### Connection and roster discovery

The UI stores the KYBER server host, telemetry port, and the player's display
name before gameplay. The UI does not need to remain open. The local daemon
keeps reconnecting and resolving the configured name as the roster changes.

After accepting a daemon, the plugin sends:

```json
{
  "schema": 1,
  "event": "hello",
  "epoch": "connection-stream-uuid",
  "seq": 1,
  "server_name": "LAN server"
}
```

It immediately follows with a full roster snapshot, even if no players are
connected:

```json
{
  "schema": 1,
  "event": "player_list",
  "epoch": "connection-stream-uuid",
  "seq": 2,
  "players": [
    {"player_id": "123456789", "name": "Romain"},
    {"player_id": "987654321", "name": "Alex"}
  ]
}
```

Player IDs are JSON strings because KYBER exposes a 64-bit user ID and
JavaScript cannot safely represent every 64-bit integer. The plugin sends a
fresh `player_list` after every join and disconnect. Full snapshots are chosen
over deltas so a daemon connecting late can always reconstruct current state.

The daemon trims surrounding whitespace and compares names with Unicode
case-folding. It subscribes only when exactly one non-bot player matches:

```json
{
  "schema": 1,
  "action": "subscribe",
  "player_id": "123456789"
}
```

The plugin verifies that the ID is in the current roster and acknowledges:

```json
{
  "schema": 1,
  "event": "subscribed",
  "epoch": "connection-stream-uuid",
  "seq": 3,
  "player_id": "123456789",
  "name": "Romain"
}
```

Zero matches leaves the daemon in `waiting_for_player`. Multiple matches set
`ambiguous_player_name`; the daemon must not choose arbitrarily. If the
selected ID disconnects, the plugin emits the new roster, clears that
connection's subscription, and the daemon returns to name matching. This lets
it follow a player who reconnects with a new session object without requiring
the UI to be open.

The daemon state exposed to the UI is:

```text
waiting_for_server -> waiting_for_player -> subscribing -> subscribed
                                             |                |
                                             `-- ambiguous <--'
```

Server or socket loss returns to `waiting_for_server`. Player loss returns to
`waiting_for_player`.

### Shot accepted

```json
{
  "schema": 1,
  "event": "shot_fired",
  "epoch": "connection-stream-uuid",
  "seq": 42,
  "server_time_ms": 128334,
  "player_id": "123456789",
  "weapon": "Gameplay/Equipment/.../U_Weapon"
}
```

This event means the game accepted and executed a shot. It must not mean only
that the trigger button was pressed. One callback is emitted per logical shot;
multi-projectile weapons must not produce one recoil event per pellet.

### Damage applied

```json
{
  "schema": 1,
  "event": "damage_received",
  "epoch": "connection-stream-uuid",
  "seq": 43,
  "server_time_ms": 128351,
  "victim_id": "123456789",
  "attacker_id": "987654321",
  "weapon": "Gameplay/Equipment/.../U_Weapon",
  "amount": 18.0,
  "health_remaining": 82.0,
  "source_position": [12.5, 2.0, -4.25],
  "victim_position": [10.0, 2.0, -4.0],
  "victim_forward": [0.0, 0.0, 1.0]
}
```

`amount` is damage after armor, blocking, buffs, and other game modifiers. A
heal, regeneration tick, spawn initialization, class change, or vehicle
transition is not a damage event.

Position fields are optional until their native layouts are verified. Without
them, damage remains exact but non-directional.

### Lifecycle events

The plugin also uses already-supported KYBER events to refresh the roster and
may forward subscribed-player lifecycle events:

- `player_spawned`
- `player_killed`
- `level_loaded`
- `player_joined`
- `player_disconnected`

These are secondary to the recoil and damage requirements.

## Native hook design

### Accepted shot

`Program.cpp` currently contains a commented diagnostic branch for
`ServerSoldierFiringMessage`. This is the first candidate hook point.

Prototype steps:

1. Recover and validate the message layout and firing-player reference.
2. Log the message count during controlled semi-automatic and automatic fire.
3. Verify whether the message represents an accepted shot, a fire request, or
   an aggregated firing-state transition.
4. Verify shotgun and burst behavior.
5. Emit `ServerPlayer:ShotFired(player, weapon)` only if the callback has
   one-to-one logical-shot semantics.

If `ServerSoldierFiringMessage` is not post-acceptance or one-to-one, hook the
server-side `WeaponFiring` path after ammunition/heat and fire-rate validation.
The hook must be authoritative rather than input-driven.

### Applied damage

The preferred hook is the server path after final damage calculation and
before/while the resulting health is committed.

Prototype steps:

1. Identify the damage message or server damage-processing function.
2. Capture victim, attacker/inflictor, weapon, final amount, and remaining
   health.
3. Verify damage-reduction, blocking, shields/bonus health, splash damage,
   self-damage, environmental damage, vehicles, and lethal hits.
4. Emit `ServerPlayer:DamageApplied(...)` after values are final.

Hooking `HealthComponent::SetHealth` is a fallback discovery technique, not the
preferred final implementation. A generic health setter also receives heals,
regeneration, spawn initialization, scripts, and state transitions, and may
not retain attacker attribution.

### Directional damage

When source and victim transforms are available, the daemon can compute the
relative horizontal angle:

```text
incoming = normalize(source_position - victim_position)
angle = signed_angle(victim_forward, incoming)
```

The daemon maps the angle to front, back, left, or right vest cells. The native
extension should export raw positions/orientation rather than vest cell
numbers, keeping game-specific interpretation out of KYBER.

Projectile impact position may be preferable to attacker position for splash
damage. Direction is considered unverified until tested against blasters,
melee, explosives, vehicles, and environmental sources.

## KYBER Lua plugin responsibilities

The server plugin should remain a thin transport layer:

- Subscribe to the two new native events.
- Accept multiple daemon connections.
- Send an initial full roster and refresh it after join/disconnect.
- Validate one exact player-ID subscription per connection.
- Route only the selected player's gameplay events to that connection.
- Normalize IDs and weapon strings.
- Assign each connection a stream `epoch` and monotonically increasing `seq`.
- Serialize compact NDJSON records.
- Maintain bounded per-client queues without blocking the game thread.
- Enforce handshake timeouts, connection limits, and maximum line lengths.
- Disconnect a client whose queue remains full and report a dropped-client
  counter; do not silently discard gameplay events and pretend the stream is
  complete.

It must not:

- Calculate haptic cells or strengths.
- Trigger hardware.
- Persist player telemetry by default.
- Accept all-player subscriptions.
- Execute commands supplied by telemetry clients.
- Be exposed outside the trusted LAN.

KYBER currently describes plugins as in-development and not fully documented.
The plugin and extension must pin a tested KYBER revision.

## Daemon integration

The eventual repository implementation follows the normal game-integration
structure:

- Register an EA Battlefront II (2017) integration specification.
- Add a daemon-side `swbf2_manager.py`.
- Add `swbf2_start`, `swbf2_stop`, and `swbf2_status` commands.
- Persist `host`, `port`, and `player_name` settings from the Electron UI.
- Connect to the KYBER telemetry listener rather than opening another inbound
  port.
- Consume roster snapshots continuously, resolve the configured name, and
  subscribe using the resulting `playerId`.
- Validate schema, field types, subscribed player ID, epoch, and sequence.
- Reject stale epochs, duplicate sequence numbers, and gameplay events received
  before subscription acknowledgement.
- Broadcast semantic game events before mapping them to effects.
- Keep all game code outside `vest/`.

Suggested start command:

```json
{
  "cmd": "swbf2_start",
  "host": "192.168.1.50",
  "port": 5051,
  "player_name": "Romain"
}
```

The manager should retain the source event metadata. Translating in the plugin
directly to generic `trigger` commands would discard useful information and
make debugging, remapping, and UI visualization harder.

The UI should show the configured endpoint and player name plus the daemon
state, matched KYBER name/ID, last sequence, reconnect count, and last error.
Manual ID entry is not part of the normal workflow.

## Initial haptic mapping

| Exact game event | Haptic response |
|---|---|
| Local player's accepted shot | Existing recoil output, selected by weapon class |
| Local player receives damage | Impact pulse scaled by final damage |
| Directional damage available | Front/back/left/right impact cell |
| Direction unavailable | Non-directional impact, explicitly reported as such |
| Local player dies | Full-vest death effect |

Automatic weapons require rate limiting only if the physical recoil actuator
cannot safely follow the game's accepted shot cadence. Any safety limit belongs
in the daemon/hardware control layer and must be visible in diagnostics.

## Prototype phases

### Phase 1: Native event spike

- Build the pinned KYBER revision.
- Run a password-protected development server.
- Instrument `ServerSoldierFiringMessage`.
- Identify the final applied-damage path.
- Print structured diagnostics only; do not connect the vest.
- Record controlled test counts for each weapon/damage case.

Exit condition: each accepted shot and each applied damage instance has a
verified one-to-one callback with the correct player.

This phase remains mandatory. Static source inspection confirmed the candidate
firing message and health/weapon types, but the repository contains no
`ServerSoldierFiringMessage` layout and no final nonlethal-damage event or
message layout. Claiming exact combat telemetry before this runtime validation
would be unsupported.

### Phase 2: Multi-client KYBER transport

- Add the two Lua event bindings.
- Make socket writes safe for partial sends and `WSAEWOULDBLOCK`.
- Implement the bounded, per-client NDJSON socket plugin.
- Publish initial and changed roster snapshots.
- Implement one-player subscription state for every connection.
- Restrict the listener to the trusted LAN with host firewall rules.
- Verify two or more simultaneous daemons, reconnect, ordering, and overflow.

Exit condition: two test daemons configured only with different display names
automatically bind when those players join and receive ordered, duplicate-free
events only for their selected players.

### Phase 3: Daemon integration

- Run the mandatory game-integration baseline tests.
- Register the integration and add its daemon manager.
- Add host/port/player-name UI settings.
- Add protocol commands, connection-state broadcasts, haptic mapping, and
  snapshot tests.
- Test without hardware using mocked vest outputs.

Exit condition: exact KYBER events travel through the daemon and produce the
expected mocked recoil/damage calls.

### Phase 4: End-to-end validation

- Test semi-automatic, automatic, burst, shotgun, explosive, melee, hero,
  vehicle, blocked, reduced, splash, environmental, lethal, and respawn cases.
- Test daemon-before-player, player-before-daemon, duplicate display names,
  two vested players, player reconnect, daemon reconnect, server restart, and
  a slow/disconnected subscriber.
- Compare game-observed counts with plugin, daemon, and hardware logs.
- Measure hook-to-daemon and hook-to-hardware latency.
- Run a sustained automatic-fire and reconnect soak test.

## Acceptance criteria

The prototype is worth continuing only if all of these hold:

1. Every server-accepted logical shot for the configured player produces
   exactly one recoil event.
2. Rejected trigger pulls produce no recoil event.
3. Every final damage application produces one event with the correct victim
   and post-modifier amount.
4. Heals, regeneration, spawn, and class/vehicle transitions do not appear as
   damage.
5. A daemon configured with server address and display name automatically
   subscribes whether it starts before or after the player joins.
6. Duplicate display names never cause an arbitrary subscription.
7. With at least two connected daemons, each receives only its subscribed
   player's gameplay events.
8. One slow or disconnected daemon does not block the game thread or another
   daemon.
9. Event ordering is stable and reconnects do not duplicate haptics.
10. LAN transport adds no perceptible latency; measured latency is documented
    rather than assumed.
11. The integration runs only in the explicitly supported KYBER/offline
    environments.

If the native hook cannot distinguish accepted shots or final applied damage,
the project stops rather than falling back to inferred events.

## Risks and maintenance

- Native addresses and layouts are game-build and KYBER-revision sensitive.
- Server plugins are still experimental.
- The dedicated server commonly runs in Linux/Docker while the vest daemon
  runs on the Windows gaming machine, requiring deliberate port mapping.
- The unauthenticated LAN prototype lets any device on the permitted subnet
  request any player's telemetry. This is an explicit prototype tradeoff, not
  a security guarantee.
- `INADDR_ANY` binding broadens exposure if firewall or container publishing
  is configured incorrectly.
- Display names are not unique. The daemon must stop on ambiguity and must use
  the resolved 64-bit ID for routing.
- The present Lua socket `Send` behavior is not sufficient for robust
  backpressure and requires a KYBER-side change.
- Directional source data may not be present at the selected damage hook.
- KYBER is GPLv3. Distribution of a derivative module must comply with its
  source, license, and attribution requirements.
- Telemetry can contain player identifiers. Store nothing by default and
  obtain participant consent before retaining logs.
- Native mods and memory instrumentation carry account and trust risks. Never
  test this integration in official EA matchmaking.

## References

- [KYBER repository](https://github.com/ArmchairDevelopers/Kyber)
- [Pinned KYBER source used by this investigation](https://github.com/ArmchairDevelopers/Kyber/tree/c64e07940a7e127176ef7f2b09cf34ad5830f468)
- [KYBER server plugin announcement](https://kyber.gg/news/dev-update-plugins/)
- [KYBER dedicated-server plugin configuration](https://docs.kyber.gg/g/hosting/dedicated-servers/config)
- [Official KYBER plugin examples](https://github.com/ArmchairDevelopers/PluginExamples)
- [Pinned plugin examples used by this investigation](https://github.com/ArmchairDevelopers/PluginExamples/tree/bf5cb1e1faeb31a0ffa3f182fcfc37d4aca7ad1a)
- [Frosty gameplay modding overview](https://swbf2frosty.wiki.gg/wiki/Tutorial:Basic_Gameplay_Modding)
- [EA guidance on online mods](https://forums.ea.com/discussions/star-wars-battlefront-2-en/mods-allowed-or-not-allowed-now---please-final-clarification-ea-/10841986)
- [EA User Agreement](https://www.ea.com/legal/user-agreement)

Source investigation updated August 19, 2026.
