from modern_third_space.relay.recoil import should_pulse_recoil_for_weapon


def test_should_pulse_skips_melee_grenades_chainsaw():
    for weapon in (
        "melee",
        "weapon_melee",
        "katana",
        "fireaxe",
        "chainsaw",
        "weapon_chainsaw",
        "molotov",
        "weapon_molotov",
        "pipe_bomb",
        "vomitjar",
    ):
        assert should_pulse_recoil_for_weapon(weapon) is False, weapon


def test_should_pulse_allows_guns():
    for weapon in (
        "rifle",
        "rifle_ak47",
        "weapon_rifle",
        "smg",
        "pistol",
        "pumpshotgun",
        "sniper_military",
        "pistol_magnum",
        "grenade_launcher",
        "weapon_grenade_launcher",
    ):
        assert should_pulse_recoil_for_weapon(weapon) is True, weapon


def test_should_pulse_unknown_fail_open():
    assert should_pulse_recoil_for_weapon("") is True
    assert should_pulse_recoil_for_weapon("unknown") is True
    assert should_pulse_recoil_for_weapon(None) is True
