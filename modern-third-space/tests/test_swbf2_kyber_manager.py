"""Tests for the EA Battlefront II KYBER LAN telemetry manager."""

from __future__ import annotations

import asyncio
import json

import pytest

from modern_third_space.server.swbf2_kyber_manager import (
    KyberEvent,
    KyberProtocolError,
    SWBF2KyberManager,
    damage_direction_cells,
    map_event_to_haptics,
)
from modern_third_space.server.protocol import (
    Command,
    CommandType,
    event_swbf2_game_event,
    response_swbf2_status,
)
from modern_third_space.vest.cell_layout import (
    ALL_CELLS,
    FRONT_CELLS,
    RIGHT_SIDE,
    Cell,
)


class FakeWriter:
    def __init__(self) -> None:
        self.writes: list[bytes] = []
        self.closed = False

    def is_closing(self) -> bool:
        return self.closed

    def write(self, data: bytes) -> None:
        self.writes.append(data)

    async def drain(self) -> None:
        return None

    def close(self) -> None:
        self.closed = True

    async def wait_closed(self) -> None:
        return None


def envelope(event: str, seq: int, **fields):
    return {
        "schema": 1,
        "event": event,
        "epoch": "stream-1",
        "seq": seq,
        **fields,
    }


def test_damage_direction_cells() -> None:
    base = {
        "victim_position": [0, 0, 0],
        "victim_forward": [0, 0, 1],
    }
    assert damage_direction_cells({**base, "source_position": [0, 0, 5]}) == FRONT_CELLS
    assert damage_direction_cells({**base, "source_position": [5, 0, 0]}) == RIGHT_SIDE
    assert damage_direction_cells(base) == []


def test_haptic_mapping() -> None:
    shot = KyberEvent("shot_fired", {"weapon": "heavy_shotgun"}, 1.0)
    assert map_event_to_haptics(shot) == [
        (Cell.FRONT_UPPER_LEFT, 7),
        (Cell.FRONT_UPPER_RIGHT, 7),
    ]

    damage = KyberEvent("damage_received", {"amount": 16}, 1.0)
    assert [cell for cell, _ in map_event_to_haptics(damage)] == ALL_CELLS
    assert map_event_to_haptics(KyberEvent("player_spawned", {}, 1.0)) == []


def test_swbf2_daemon_protocol() -> None:
    command = Command.from_dict(
        {
            "cmd": "swbf2_start",
            "kyber_host": "192.168.1.50",
            "kyber_port": 5051,
            "player_name": "Leia",
        }
    )
    assert command.is_valid()
    assert CommandType(command.cmd) is CommandType.SWBF2_START
    assert command.kyber_host == "192.168.1.50"
    assert command.kyber_port == 5051
    assert command.player_name == "Leia"

    event = event_swbf2_game_event("shot_fired", {"weapon": "blaster"}).to_dict()
    assert event["event"] == "swbf2_game_event"
    assert event["event_type"] == "shot_fired"

    status = {"running": True, "events_received": 2, "connection_state": "subscribed"}
    response = response_swbf2_status(status).to_dict()
    assert response["running"] is True
    assert response["integration_status"] == status


@pytest.mark.asyncio
async def test_roster_resolution_subscription_and_gameplay() -> None:
    game_events = []
    triggers = []
    recoils = []
    manager = SWBF2KyberManager(
        on_game_event=lambda event, params: game_events.append((event, params)),
        on_trigger=lambda cell, speed: triggers.append((cell, speed)),
        on_recoil=recoils.append,
    )
    manager._running = True
    manager._player_name = "  ROMAIN "
    writer = FakeWriter()
    manager._writer = writer  # type: ignore[assignment]

    await manager.process_message(envelope("hello", 1))
    await manager.process_message(
        envelope(
            "player_list",
            2,
            players=[
                {"player_id": "100", "name": "Alex"},
                {"player_id": "200", "name": "Romain"},
                {"player_id": "300", "name": "Romain", "is_bot": True},
            ],
        )
    )

    assert manager.status()["connection_state"] == "subscribing"
    assert json.loads(writer.writes[-1]) == {
        "schema": 1,
        "action": "subscribe",
        "player_id": "200",
    }

    await manager.process_message(
        envelope("subscribed", 3, player_id="200", name="Romain")
    )
    await manager.process_message(
        envelope("shot_fired", 4, player_id="200", weapon="blaster")
    )

    assert manager.status()["connection_state"] == "subscribed"
    assert manager.status()["matched_player_id"] == "200"
    assert game_events[0][0] == "shot_fired"
    assert triggers == [
        (Cell.FRONT_UPPER_LEFT, 5),
        (Cell.FRONT_UPPER_RIGHT, 5),
    ]
    assert len(recoils) == 1


@pytest.mark.asyncio
async def test_duplicate_names_are_ambiguous() -> None:
    manager = SWBF2KyberManager()
    manager._running = True
    manager._player_name = "same"
    writer = FakeWriter()
    manager._writer = writer  # type: ignore[assignment]

    await manager.process_message(envelope("hello", 1))
    await manager.process_message(
        envelope(
            "player_list",
            2,
            players=[
                {"player_id": "1", "name": "Same"},
                {"player_id": "2", "name": "same"},
            ],
        )
    )

    assert manager.status()["connection_state"] == "ambiguous_player_name"
    assert writer.writes == []


@pytest.mark.asyncio
async def test_protocol_rejects_epoch_change() -> None:
    manager = SWBF2KyberManager()
    await manager.process_message(envelope("hello", 1))
    with pytest.raises(KyberProtocolError, match="epoch changed"):
        await manager.process_message(
            {
                "schema": 1,
                "event": "player_list",
                "epoch": "other",
                "seq": 2,
                "players": [],
            }
        )


@pytest.mark.asyncio
async def test_end_to_end_reconnecting_client_subscription() -> None:
    received_subscription: asyncio.Future[dict] = asyncio.get_running_loop().create_future()
    game_events: list[str] = []

    async def plugin(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        for message in (
            envelope("hello", 1, server_name="test"),
            envelope(
                "player_list",
                2,
                players=[{"player_id": "42", "name": "Leia"}],
            ),
        ):
            writer.write(json.dumps(message).encode() + b"\n")
        await writer.drain()
        subscription = json.loads(await reader.readline())
        received_subscription.set_result(subscription)
        for message in (
            envelope("subscribed", 3, player_id="42", name="Leia"),
            envelope("shot_fired", 4, player_id="42", weapon="blaster"),
        ):
            writer.write(json.dumps(message).encode() + b"\n")
        await writer.drain()
        await reader.read()
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(plugin, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    manager = SWBF2KyberManager(
        on_game_event=lambda event, _params: game_events.append(event)
    )
    try:
        success, error = manager.start("127.0.0.1", port, "Leia")
        assert success and error is None
        subscription = await asyncio.wait_for(received_subscription, timeout=1)
        assert subscription["player_id"] == "42"
        for _ in range(20):
            if game_events:
                break
            await asyncio.sleep(0.01)
        assert game_events == ["shot_fired"]
        assert manager.status()["matched_player_name"] == "Leia"
    finally:
        await manager.stop()
        server.close()
        await server.wait_closed()
