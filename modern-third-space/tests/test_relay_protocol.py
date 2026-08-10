"""Unit tests for USB LC relay framing and controller helpers."""

from __future__ import annotations

from modern_third_space.relay.protocol import build_frame, DEFAULT_ADDRESS, START_BYTE


def test_build_frame_on_default_address():
    assert build_frame(True) == bytes([0xA0, 0x01, 0x01, 0xA2])


def test_build_frame_off_default_address():
    assert build_frame(False) == bytes([0xA0, 0x01, 0x00, 0xA1])


def test_build_frame_checksum_custom_address():
    frame = build_frame(True, address=0x02)
    assert frame[0] == START_BYTE
    assert frame[1] == 0x02
    assert frame[2] == 0x01
    assert frame[3] == (START_BYTE + 0x02 + 0x01) & 0xFF


def test_clamp_duration_min_25():
    from modern_third_space.relay.recoil import clamp_duration_ms, clamp_on_ms, MIN_RECOIL_MS, MAX_ON_MS

    assert MIN_RECOIL_MS == 25
    assert clamp_duration_ms(10) == 25
    assert clamp_duration_ms(40) == 40
    assert clamp_on_ms(5) == 25
    assert clamp_on_ms(5000) == MAX_ON_MS
    assert MAX_ON_MS == 1000


def test_default_address_constant():
    assert DEFAULT_ADDRESS == 0x01


def test_parse_vid_pid_ch340():
    from modern_third_space.relay.discovery import parse_vid_pid, is_likely_lc_relay, CH340_VID, CH340_PID

    vid, pid = parse_vid_pid("USB VID:PID=1A86:7523 SER= LOCATION=1-7:x.0")
    assert vid == CH340_VID
    assert pid == CH340_PID
    assert is_likely_lc_relay(
        {
            "vid": vid,
            "pid": pid,
            "description": "USB-SERIAL CH340 (COM7)",
            "manufacturer": "wch.cn",
            "product": "",
            "hwid": "USB VID:PID=1A86:7523",
        }
    )


def test_interval_s_for_rpm():
    from modern_third_space.relay.mouse_recoil import interval_s_for_rpm

    assert abs(interval_s_for_rpm(600) - 0.1) < 1e-6
    assert abs(interval_s_for_rpm(120) - 0.5) < 1e-6
    # Never shorter than min_interval
    assert interval_s_for_rpm(1200, min_interval_s=0.04) >= 0.04


def test_likely_relay_does_not_match_generic_usb_serial():
    from modern_third_space.relay.discovery import is_likely_lc_relay

    assert not is_likely_lc_relay(
        {
            "vid": 0x2833,
            "pid": 0x0051,
            "description": "USB Serial Device (COM3)",
            "manufacturer": "Microsoft",
            "product": "",
            "hwid": "USB VID:PID=2833:0051",
        }
    )
