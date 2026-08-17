# Warhammer 40,000: Battle Sister Integration

> **Status: BETA** (MelonLoader mod untested in-game)
>
> Harmony patches are adapted from [BattleSister_bhaptics](https://github.com/floh-bhaptics/BattleSister_bhaptics).
> The game connects to the daemon as a TCP client on port 5050.

## Overview

Warhammer 40,000: Battle Sister is a VR shooter by Pixel Toys / Soul Assembly (Steam App ID **1733890**). The open-source bHaptics mod hooks:

| Class | Method | Our event |
|-------|--------|-----------|
| `VrGun` | `Fire()` | `gun_fire` / `shotgun_fire` / `melee_hit` (by `DamageType`) |
| `VrMeleeAudio` | `OnCollisionEnter()` | `melee_hit` |
| `ImpactManager` | `ProcessImpact()` | `player_hit` / `blade_hit` (directional angle) |
| `VrTimedExplosive` | `Explode()` | `explosion` |
| `HealthAudio` | `OnDeath()` | `death` |
| `HealthStatusReceiver_DamageHud` | `OnApplyHealthStatusUpdate()` | `low_health` / `low_health_end` |

`MelonGame`: `"Pixel Toys"`, `"Battle Sister"`.

The NexusMods dump `BattleSister_bhaptics.zip-1-2-0-0-1690973096` is the original Tactsuit DLL (bHaptics Player). Do **not** install it for this vest — install `ThirdSpace_BattleSister.dll` instead.

## Architecture

```
Battle Sister (Unity/Il2Cpp)
  MelonLoader → ThirdSpace_BattleSister.dll
       TCP 5050 → Python daemon → vest / USB solenoid
```

## Event mapping (8-cell vest)

| Event | Cells | Notes |
|-------|-------|-------|
| Gun fire | Left or right arm | Solenoid pulse |
| Shotgun fire | Full left or right side | Grenade-launcher damage type |
| Melee | Arm cells | Chainsword / collision |
| Two-hand | Opposite arm, lighter | Secondary grasp while firing |
| Player hit | Front / left / back / right from angle | 0° front, 90° left |
| Blade hit | Same as hit, stronger | Axe / club / bloodletter |
| Explosion | Directional if angled, else lower cells | Impact blast vs bomb |
| Death | All cells | |
| Low health | Lower front | Below 50% HP |

## Setup

1. Install MelonLoader 0.6.x+ into Battle Sister and launch once.
2. Build `battlesister-mod/` and copy `ThirdSpace_BattleSister.dll` to `Battle Sister/Mods/` (or use Install Mod in the app).
3. Start the daemon, click **Start** on the Battle Sister page, then launch the game.
