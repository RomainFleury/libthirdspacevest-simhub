# EA Battlefront II (2017) KYBER telemetry

This bundle contains the server-side KYBER plugin used by the Third Space Vest
daemon. It is intended only for a trusted LAN, password-protected KYBER server,
or offline development. Do not use native hooks in official EA matchmaking.

## Included

- `ThirdSpaceVestTelemetry/plugin.json`
- `ThirdSpaceVestTelemetry/server/__init__.lua`
- `ThirdSpaceVestTelemetry/server/json.lua`

The plugin:

- listens for vest daemons on TCP port `5051`;
- accepts up to 16 simultaneous daemon connections;
- publishes full player-roster snapshots;
- accepts one player-ID subscription per connection;
- routes only that player's events;
- uses bounded receive and output queues; and
- never accepts game, console, or vest-control commands.

## Install

Build the distributable package from the repository root:

```powershell
.\build-all-mods.ps1 -Mods kyber
```

This produces
`mods/swbf2-kyber/dist/thirdspace-vest-kyber-plugin-v0.1.0.zip`.

Copy the `ThirdSpaceVestTelemetry` directory into the KYBER dedicated server's
plugin directory and enable it in the server's plugin configuration. Permit TCP
port `5051` only from the trusted LAN in Windows Firewall. Do not port-forward
it through the Internet router.

In the Third Space Vest UI, configure:

1. the KYBER server's LAN IP address;
2. port `5051`; and
3. the player's exact in-game display name.

The local daemon can start before or after the player joins. It watches roster
updates, resolves the configured display name, and subscribes to the matched
KYBER account ID. Duplicate display names remain unbound until the ambiguity is
removed.

## Native event dependency

KYBER `ver/beta10` already provides roster, join, disconnect, spawn, and kill
events. It does not provide authoritative accepted-shot or nonlethal-damage
events. The plugin listens for the companion native events:

- `ServerPlayer:ShotFired(player, weapon)`
- `ServerPlayer:DamageApplied(victim, attacker, weapon, amount,
  healthRemaining, sourcePosition, victimPosition, victimForward)`

Those events require a KYBER native extension built against the pinned revision
documented in
`docs-external-integrations-ideas/EA_BATTLEFRONT2_2017_KYBER_PLAN.md`.
The runtime hook spike must establish the actual Frostbite layouts and
one-to-one event semantics before offsets are committed or distributed. No
unverified offsets are included in this repository.

Without that native extension, roster/subscription, spawn, death, and
multi-client transport work, but shot and nonlethal-damage telemetry do not.
