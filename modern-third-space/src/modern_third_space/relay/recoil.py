"""
Solenoid / USB-relay recoil helpers shared by game integrations.

Maps weapon names to pulse durations. Pulse is skipped unless the relay is connected
(callers should still gate on user settings).
"""

from __future__ import annotations

from typing import Any, Dict, Optional

DEFAULT_RECOIL_MS = 40
MIN_RECOIL_MS = 25  # Below ~20–25 ms the LC module often misses OFF
MAX_RECOIL_MS = 120  # UI/game tuning cap for recoil feel
MAX_ON_MS = 1000  # Hard cap — safety timer also forces OFF at 1.0 s


def clamp_duration_ms(duration_ms: int) -> int:
    return max(MIN_RECOIL_MS, min(MAX_RECOIL_MS, int(duration_ms)))


def clamp_on_ms(duration_ms: int) -> int:
    """Clamp any ON duration to hardware-safe bounds (25–1000 ms)."""
    return max(MIN_RECOIL_MS, min(MAX_ON_MS, int(duration_ms)))


def duration_ms_for_weapon(weapon: Optional[str], default_ms: int = DEFAULT_RECOIL_MS) -> int:
    """
    Pick a pulse length from a weapon class / name string.

    Longer for slow heavy weapons; shorter for automatic fire.
    """
    w = (weapon or "").lower()
    if any(k in w for k in ("shotgun", "shell", "autoshotgun", "pumpshotgun", "chrome", "spas")):
        return clamp_duration_ms(max(default_ms, 70))
    if any(k in w for k in ("sniper", "hunting", "military", "awp", "scout", "magnum")):
        return clamp_duration_ms(max(default_ms, 55))
    if any(k in w for k in ("smg", "uzi", "rapidfire", "mp5", "silenced")):
        return clamp_duration_ms(min(default_ms, 25))
    if any(k in w for k in ("rifle", "ak47", "m16", "scar", "desert", "ar2")):
        return clamp_duration_ms(min(default_ms, 35))
    if any(k in w for k in ("pistol", "pistol_magnum", "dual")):
        return clamp_duration_ms(default_ms)
    return clamp_duration_ms(default_ms)


def parse_solenoid_settings(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Normalize solenoid recoil settings from a daemon/UI payload.

    Accepted shapes:
      {"solenoid_recoil": {"enabled": true, "duration_ms": 40}}
      {"enabled": true, "duration_ms": 40}   # already the nested object
    """
    enabled = True
    duration_ms = DEFAULT_RECOIL_MS

    raw: Any = payload
    if isinstance(payload, dict) and "solenoid_recoil" in payload:
        raw = payload.get("solenoid_recoil")

    if isinstance(raw, dict):
        if "enabled" in raw:
            enabled = bool(raw.get("enabled"))
        if raw.get("duration_ms") is not None:
            try:
                duration_ms = clamp_duration_ms(int(raw["duration_ms"]))
            except (TypeError, ValueError):
                duration_ms = DEFAULT_RECOIL_MS

    return {"enabled": enabled, "duration_ms": duration_ms}
