# EA Star Wars Battlefront II (2017) Research Assets

This directory contains historical Frosty mods and reference material collected
while investigating a Third Space Vest integration.

The active implementation plan is:

[`docs-external-integrations-ideas/EA_BATTLEFRONT2_2017_KYBER_PLAN.md`](../../../docs-external-integrations-ideas/EA_BATTLEFRONT2_2017_KYBER_PLAN.md)

That plan uses exact, server-authoritative combat events from a KYBER native
extension. The Frosty assets here do not provide the required runtime event
stream.

## Included references

### Debugger mod

- Source: [Nexus Mods](https://www.nexusmods.com/starwarsbattlefront22017/images/896)
- Purpose: displays coordinates and speed in the HUD
- Modified assets:
  - `ui/ingame/hud/soldier/screens/defaultsoldierhudwidget`
  - `addons/mode1/mode1/ui/ingame/hud/gamemodes/conquest/groundphasehudwidget`
  - `addons/mode1/mode1/ui/ingame/hud/gamemodes/titanphase/titanphasehudwidget`

### NoAutoZoom

- Source: [ModDB](https://www.moddb.com/mods/no-auto-zoom)
- Purpose: disables automatic zoom
- File: `NoAutoZoom/NoAutoZoom.fbmod`

### BetterHitmarkers

- Purpose: modifies hitmarker visuals
- File:
  `BetterHitmarkers v1.0-7620-1-0-1642740933/BetterHitmarkers - v1.0.fbmod`

## Modding references

- [KYBER](https://github.com/ArmchairDevelopers/Kyber)
- [Official KYBER plugin examples](https://github.com/ArmchairDevelopers/PluginExamples)
- [Frosty Tool Suite](https://frostytoolsuitedev.gitlab.io/downloads)
- [SWBF2 Frosty Editor Wiki](https://swbf2frosty.wiki.gg/)
- [Nexus Mods](https://www.nexusmods.com/starwarsbattlefront22017/mods)
