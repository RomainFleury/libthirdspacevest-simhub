# EA Battlefront II (2017): Exact Event Integration with KYBER

> **Status: RESEARCH COMPLETE / PROTOTYPE PROPOSED**
>
> **Decision:** pursue exact, server-authoritative combat events through a KYBER
> native extension. Screen capture, OCR, input inference, retail-client memory
> readers, and packet decoding are explicitly out of scope.

## Scope and non-goals

This plan applies to **EA/DICE Star Wars Battlefront II (2017)** on Frostbite.
It does not apply to the 2005 Pandemic-engine game.

The target environments are:

- KYBER private or community servers
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

Verified capabilities in the current `ver/beta10` source:

- [`ServerPlayer:Killed`](https://github.com/ArmchairDevelopers/Kyber/blob/ver/beta10/Module/Source/Core/Program.cpp)
  provides victim, killer, and killer weapon.
- The official
  [Gun Game plugin](https://github.com/ArmchairDevelopers/PluginExamples/blob/main/GunGame/server/__init__.lua)
  subscribes to kill, spawn, join, level, and server-update events.
- [`LuaPlayerManager.cpp`](https://github.com/ArmchairDevelopers/Kyber/blob/ver/beta10/Module/Source/Script/LuaPlayerManager.cpp)
  exposes player identity, character entities, weapons, and health-related
  operations.
- [`SDK.h`](https://github.com/ArmchairDevelopers/Kyber/blob/ver/beta10/Module/Public/SDK/SDK.h)
  models `HealthComponent`, `ServerCharacterEntity`, and `WeaponFiring`.
- [`LuaSocketManager.cpp`](https://github.com/ArmchairDevelopers/Kyber/blob/ver/beta10/Module/Source/Script/LuaSocketManager.cpp)
  provides a non-blocking TCP listener to Lua plugins.

KYBER does **not** currently expose a documented event for each accepted shot
or each nonlethal damage application. Those two native events are the work
required by this plan.

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
  filter player IDs
  queue NDJSON records
  TCP listener on 5051
        |
        v TCP (daemon connects)
SWBF2 manager inside Python daemon
  validate, order, deduplicate
  map events to haptics
        |
        v existing daemon control path
vest/ package -> USB vest
```

All hardware commands continue to flow through the Python daemon. The KYBER
module and plugin must never access the vest directly.

### Transport direction

KYBER's current Lua socket API creates a listener; it does not expose an
outbound `connect`. Therefore:

1. The KYBER plugin listens on a configurable telemetry port, default `5051`.
2. The daemon's SWBF2 manager connects to that listener.
3. The plugin sends one JSON object per line.
4. Reconnection starts a new stream and sequence epoch.

The existing socket implementation binds to `INADDR_ANY`. Before distributing
the plugin, add loopback-address support to KYBER or restrict the Docker port
mapping/firewall to localhost. Telemetry must not be exposed to the LAN by
default.

If the dedicated server runs in Docker, map the listener to loopback only:

```text
127.0.0.1:5051 -> KYBER container telemetry port
```

## Event contract

Events are newline-delimited JSON. Required fields are deliberately small and
versioned so the daemon can reject incompatible messages.

### Shot accepted

```json
{
  "schema": 1,
  "event": "shot_fired",
  "epoch": "server-start-uuid",
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
  "epoch": "server-start-uuid",
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

The plugin may also forward already-supported KYBER events:

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
- Filter to configured player IDs.
- Normalize IDs and weapon strings.
- Assign `epoch` and monotonically increasing `seq`.
- Serialize compact NDJSON records.
- Queue records without blocking the game thread.
- Accept one local daemon connection and handle reconnects.
- Drop oldest records when a bounded queue is full and report a counter.

It must not:

- Calculate haptic cells or strengths.
- Trigger hardware.
- Persist player telemetry by default.
- Bind publicly without an explicit opt-in.

KYBER currently describes plugins as in-development and not fully documented.
The plugin and extension must pin a tested KYBER revision.

## Daemon integration

The eventual repository implementation follows the normal game-integration
structure:

- Register an EA Battlefront II (2017) integration specification.
- Add a daemon-side `swbf2_manager.py`.
- Add `swbf2_start`, `swbf2_stop`, and `swbf2_status` commands.
- Connect to the KYBER telemetry listener rather than opening another inbound
  public port.
- Validate schema, field types, configured player ID, epoch, and sequence.
- Deduplicate repeated records after reconnect.
- Broadcast semantic game events before mapping them to effects.
- Keep all game code outside `vest/`.

Suggested start command:

```json
{
  "cmd": "swbf2_start",
  "host": "127.0.0.1",
  "port": 5051,
  "player_id": "123456789"
}
```

The manager should retain the source event metadata. Translating in the plugin
directly to generic `trigger` commands would discard useful information and
make debugging, remapping, and UI visualization harder.

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

### Phase 2: KYBER event and transport

- Add the two Lua event bindings.
- Implement the bounded NDJSON socket plugin.
- Restrict the listener to loopback.
- Verify reconnect, ordering, and overflow behavior.

Exit condition: a test client receives ordered, duplicate-free exact events.

### Phase 3: Daemon integration

- Run the mandatory game-integration baseline tests.
- Register the integration and add its daemon manager.
- Add protocol commands, event broadcasts, haptic mapping, and snapshot tests.
- Test without hardware using mocked vest outputs.

Exit condition: exact KYBER events travel through the daemon and produce the
expected mocked recoil/damage calls.

### Phase 4: End-to-end validation

- Test semi-automatic, automatic, burst, shotgun, explosive, melee, hero,
  vehicle, blocked, reduced, splash, environmental, lethal, and respawn cases.
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
5. Event ordering is stable and reconnects do not duplicate haptics.
6. Local transport adds no perceptible latency; measured latency is documented
   rather than assumed.
7. The integration runs only in the explicitly supported KYBER/offline
   environments.

If the native hook cannot distinguish accepted shots or final applied damage,
the project stops rather than falling back to inferred screen/input events.

## Risks and maintenance

- Native addresses and layouts are game-build and KYBER-revision sensitive.
- Server plugins are still experimental.
- The dedicated server commonly runs in Linux/Docker while the vest daemon
  runs on the Windows gaming machine, requiring deliberate port mapping.
- Directional source data may not be present at the selected damage hook.
- KYBER is GPLv3. Distribution of a derivative module must comply with its
  source, license, and attribution requirements.
- Telemetry can contain player identifiers. Store nothing by default and
  obtain participant consent before retaining logs.
- Native mods and memory instrumentation carry account and trust risks. Never
  test this integration in official EA matchmaking.

## References

- [KYBER repository](https://github.com/ArmchairDevelopers/Kyber)
- [KYBER server plugin announcement](https://kyber.gg/news/dev-update-plugins/)
- [KYBER dedicated-server plugin configuration](https://docs.kyber.gg/g/hosting/dedicated-servers/config)
- [Official KYBER plugin examples](https://github.com/ArmchairDevelopers/PluginExamples)
- [Frosty gameplay modding overview](https://swbf2frosty.wiki.gg/wiki/Tutorial:Basic_Gameplay_Modding)
- [EA guidance on online mods](https://forums.ea.com/discussions/star-wars-battlefront-2-en/mods-allowed-or-not-allowed-now---please-final-clarification-ea-/10841986)
- [EA User Agreement](https://www.ea.com/legal/user-agreement)

Research snapshot: August 18, 2026.
