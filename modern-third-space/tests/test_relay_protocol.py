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


def test_default_address_constant():
    assert DEFAULT_ADDRESS == 0x01
