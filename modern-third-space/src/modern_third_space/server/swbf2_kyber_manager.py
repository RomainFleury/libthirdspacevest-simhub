"""EA Battlefront II (2017) telemetry client for KYBER LAN servers.

The manager connects from the local vest daemon to the KYBER server plugin,
tracks roster snapshots, resolves a configured display name to a KYBER user
ID, and subscribes to that player's authoritative combat events.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

from ..relay.recoil import DEFAULT_RECOIL_MS, duration_ms_for_weapon
from ..vest.cell_layout import (
    ALL_CELLS,
    BACK_CELLS,
    FRONT_CELLS,
    LEFT_SIDE,
    RIGHT_SIDE,
    Cell,
)

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1
DEFAULT_KYBER_PORT = 5051
MAX_LINE_BYTES = 8192

GameEventCallback = Callable[[str, dict[str, Any]], None]
StatusCallback = Callable[[dict[str, Any]], None]
TriggerCallback = Callable[[int, int], None]
RecoilCallback = Callable[[int], None]


class KyberProtocolError(ValueError):
    """Raised when the KYBER telemetry stream violates its contract."""


@dataclass(frozen=True)
class KyberEvent:
    """Validated gameplay event received from the KYBER plugin."""

    type: str
    params: dict[str, Any]
    timestamp: float


def _vector3(value: Any) -> Optional[tuple[float, float, float]]:
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        return None
    try:
        result = tuple(float(component) for component in value)
    except (TypeError, ValueError):
        return None
    if not all(math.isfinite(component) for component in result):
        return None
    return result  # type: ignore[return-value]


def damage_direction_cells(params: dict[str, Any]) -> list[int]:
    """Map KYBER world-space damage vectors to vest cells.

    Frostbite's X/Z plane is treated as horizontal. A positive Y component of
    ``forward x incoming`` maps to the player's right side. Runtime validation
    against the pinned game build remains required before directional release.
    """

    source = _vector3(params.get("source_position"))
    victim = _vector3(params.get("victim_position"))
    forward = _vector3(params.get("victim_forward"))
    if source is None or victim is None or forward is None:
        return []

    incoming_x = source[0] - victim[0]
    incoming_z = source[2] - victim[2]
    forward_x = forward[0]
    forward_z = forward[2]
    incoming_length = math.hypot(incoming_x, incoming_z)
    forward_length = math.hypot(forward_x, forward_z)
    if incoming_length <= 1e-6 or forward_length <= 1e-6:
        return []

    incoming_x /= incoming_length
    incoming_z /= incoming_length
    forward_x /= forward_length
    forward_z /= forward_length

    dot = forward_x * incoming_x + forward_z * incoming_z
    if dot >= math.sqrt(0.5):
        return list(FRONT_CELLS)
    if dot <= -math.sqrt(0.5):
        return list(BACK_CELLS)

    cross_y = forward_z * incoming_x - forward_x * incoming_z
    return list(RIGHT_SIDE if cross_y > 0 else LEFT_SIDE)


def map_event_to_haptics(event: KyberEvent | dict[str, Any]) -> list[tuple[int, int]]:
    """Map a subscribed KYBER event to ``(cell, speed)`` commands."""

    if isinstance(event, KyberEvent):
        event_type = event.type
        params = event.params
    else:
        event_type = str(event.get("event") or event.get("type") or "")
        params = event

    if event_type == "shot_fired":
        weapon = str(params.get("weapon") or "").casefold()
        if any(token in weapon for token in ("shotgun", "heavy", "scatter")):
            speed = 7
        elif any(token in weapon for token in ("rapid", "smg", "automatic")):
            speed = 4
        else:
            speed = 5
        return [
            (Cell.FRONT_UPPER_LEFT, speed),
            (Cell.FRONT_UPPER_RIGHT, speed),
        ]

    if event_type == "damage_received":
        try:
            amount = max(0.0, float(params.get("amount") or 0.0))
        except (TypeError, ValueError):
            amount = 0.0
        speed = max(3, min(10, int(round(3.0 + amount / 8.0))))
        cells = damage_direction_cells(params) or list(ALL_CELLS)
        return [(cell, speed) for cell in cells]

    if event_type == "player_killed":
        return [(cell, 10) for cell in ALL_CELLS]

    return []


class SWBF2KyberManager:
    """Maintain a reconnecting, name-resolved KYBER telemetry subscription."""

    def __init__(
        self,
        on_game_event: Optional[GameEventCallback] = None,
        on_status_change: Optional[StatusCallback] = None,
        on_trigger: Optional[TriggerCallback] = None,
        on_recoil: Optional[RecoilCallback] = None,
    ) -> None:
        self.on_game_event = on_game_event
        self.on_status_change = on_status_change
        self.on_trigger = on_trigger
        self.on_recoil = on_recoil

        self._running = False
        self._task: Optional[asyncio.Task[None]] = None
        self._writer: Optional[asyncio.StreamWriter] = None
        self._host = ""
        self._port = DEFAULT_KYBER_PORT
        self._player_name = ""
        self._state = "stopped"
        self._epoch: Optional[str] = None
        self._last_seq: Optional[int] = None
        self._matched_player_id: Optional[str] = None
        self._matched_player_name: Optional[str] = None
        self._pending_player_id: Optional[str] = None
        self._roster: list[dict[str, Any]] = []
        self._last_error: Optional[str] = None
        self._events_received = 0
        self._last_event_ts: Optional[float] = None
        self._last_event_type: Optional[str] = None
        self._reconnect_count = 0
        self._sequence_gaps = 0
        self._solenoid_enabled = True
        self._solenoid_duration_ms = DEFAULT_RECOIL_MS

    @property
    def is_running(self) -> bool:
        return self._running

    def status(self) -> dict[str, Any]:
        return {
            "running": self._running,
            "connection_state": self._state,
            "host": self._host or None,
            "port": self._port,
            "player_name": self._player_name or None,
            "matched_player_id": self._matched_player_id,
            "matched_player_name": self._matched_player_name,
            "players": list(self._roster),
            "epoch": self._epoch,
            "last_seq": self._last_seq,
            "events_received": self._events_received,
            "last_event_ts": self._last_event_ts,
            "last_event_type": self._last_event_type,
            "reconnect_count": self._reconnect_count,
            "sequence_gaps": self._sequence_gaps,
            "last_error": self._last_error,
        }

    def start(
        self,
        host: str,
        port: int,
        player_name: str,
        solenoid_recoil: Optional[dict[str, Any]] = None,
    ) -> tuple[bool, Optional[str]]:
        """Start reconnecting to the configured KYBER telemetry endpoint."""

        if self._running:
            return False, "Battlefront II KYBER integration is already running"

        host = str(host or "").strip()
        player_name = str(player_name or "").strip()
        try:
            port = int(port)
        except (TypeError, ValueError):
            return False, "KYBER telemetry port must be an integer"
        if not host:
            return False, "KYBER server host is required"
        if not 1 <= port <= 65535:
            return False, "KYBER telemetry port must be between 1 and 65535"
        if not player_name:
            return False, "KYBER player display name is required"

        self._host = host
        self._port = port
        self._player_name = player_name
        self._running = True
        self._events_received = 0
        self._last_event_ts = None
        self._last_event_type = None
        self._reconnect_count = 0
        self._sequence_gaps = 0
        self._last_error = None
        self._clear_stream_state()

        if isinstance(solenoid_recoil, dict):
            self._solenoid_enabled = bool(solenoid_recoil.get("enabled", True))
            try:
                duration = int(solenoid_recoil.get("duration_ms", DEFAULT_RECOIL_MS))
            except (TypeError, ValueError):
                duration = DEFAULT_RECOIL_MS
            self._solenoid_duration_ms = max(25, min(120, duration))
        else:
            self._solenoid_enabled = True
            self._solenoid_duration_ms = DEFAULT_RECOIL_MS

        self._set_state("waiting_for_server")
        self._task = asyncio.create_task(self._run(), name="swbf2-kyber-client")
        return True, None

    async def stop(self) -> bool:
        """Stop reconnecting and close the active telemetry stream."""

        if not self._running:
            return False
        self._running = False
        task = self._task
        self._task = None
        if task is not None:
            task.cancel()
        await self._close_writer()
        if task is not None:
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._clear_stream_state()
        self._set_state("stopped")
        return True

    async def _run(self) -> None:
        delay = 1.0
        while self._running:
            try:
                self._set_state("waiting_for_server")
                reader, writer = await asyncio.open_connection(
                    self._host,
                    self._port,
                    limit=MAX_LINE_BYTES + 1,
                )
                self._writer = writer
                self._last_error = None
                self._clear_stream_state()
                self._set_state("waiting_for_player")
                delay = 1.0
                await self._read_stream(reader)
                if self._running:
                    raise ConnectionError("KYBER telemetry server closed the connection")
            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._last_error = str(exc)
                logger.warning("KYBER telemetry connection failed: %s", exc)
                self._set_state("waiting_for_server")
                await self._close_writer()
                if self._running:
                    self._reconnect_count += 1
                    self._notify_status()
                    await asyncio.sleep(delay)
                    delay = min(10.0, delay * 2.0)
        await self._close_writer()

    async def _read_stream(self, reader: asyncio.StreamReader) -> None:
        while self._running:
            line = await reader.readline()
            if not line:
                return
            if len(line) > MAX_LINE_BYTES:
                raise KyberProtocolError("KYBER telemetry line exceeds 8192 bytes")
            try:
                message = json.loads(line.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise KyberProtocolError(f"Invalid KYBER NDJSON record: {exc}") from exc
            if not isinstance(message, dict):
                raise KyberProtocolError("KYBER telemetry record must be a JSON object")
            await self.process_message(message)

    async def process_message(self, message: dict[str, Any]) -> None:
        """Validate and process one decoded KYBER telemetry record."""

        if message.get("schema") != SCHEMA_VERSION:
            raise KyberProtocolError("Unsupported KYBER telemetry schema")
        event_type = message.get("event")
        if not isinstance(event_type, str) or not event_type:
            raise KyberProtocolError("KYBER telemetry event name is required")

        epoch = message.get("epoch")
        seq = message.get("seq")
        if not isinstance(epoch, str) or not epoch:
            raise KyberProtocolError("KYBER telemetry epoch is required")
        if not isinstance(seq, int) or isinstance(seq, bool) or seq < 1:
            raise KyberProtocolError("KYBER telemetry seq must be a positive integer")

        if self._epoch is None:
            self._epoch = epoch
        elif epoch != self._epoch:
            raise KyberProtocolError("KYBER telemetry epoch changed within a stream")

        if self._last_seq is not None:
            if seq <= self._last_seq:
                return
            if seq > self._last_seq + 1:
                self._sequence_gaps += seq - self._last_seq - 1
        self._last_seq = seq

        if event_type == "hello":
            self._notify_status()
            return
        if event_type == "player_list":
            await self._handle_player_list(message.get("players"))
            return
        if event_type == "subscribed":
            self._handle_subscribed(message)
            return
        if event_type == "error":
            self._last_error = str(message.get("message") or "KYBER plugin error")
            self._set_state("waiting_for_player")
            return
        if event_type in {
            "shot_fired",
            "damage_received",
            "player_killed",
            "player_spawned",
        }:
            self._handle_gameplay_event(event_type, message)

    async def _handle_player_list(self, players: Any) -> None:
        if not isinstance(players, list):
            raise KyberProtocolError("player_list.players must be an array")

        roster: list[dict[str, Any]] = []
        for raw_player in players:
            if not isinstance(raw_player, dict):
                continue
            player_id = raw_player.get("player_id")
            name = raw_player.get("name")
            if not isinstance(player_id, (str, int)) or not isinstance(name, str):
                continue
            roster.append(
                {
                    "player_id": str(player_id),
                    "name": name,
                    "is_bot": bool(raw_player.get("is_bot", False)),
                }
            )
        self._roster = roster

        if self._matched_player_id and not any(
            player["player_id"] == self._matched_player_id for player in roster
        ):
            self._matched_player_id = None
            self._matched_player_name = None
            self._pending_player_id = None

        configured = self._player_name.strip().casefold()
        matches = [
            player
            for player in roster
            if not player["is_bot"] and player["name"].strip().casefold() == configured
        ]
        if not matches:
            self._pending_player_id = None
            self._set_state("waiting_for_player")
            return
        if len(matches) > 1:
            self._pending_player_id = None
            self._last_error = f"Multiple KYBER players match '{self._player_name}'"
            self._set_state("ambiguous_player_name")
            return

        match = matches[0]
        player_id = match["player_id"]
        if self._matched_player_id == player_id and self._state == "subscribed":
            self._notify_status()
            return
        if self._pending_player_id == player_id and self._state == "subscribing":
            self._notify_status()
            return

        self._pending_player_id = player_id
        self._last_error = None
        self._set_state("subscribing")
        await self._send({"schema": SCHEMA_VERSION, "action": "subscribe", "player_id": player_id})

    def _handle_subscribed(self, message: dict[str, Any]) -> None:
        player_id = str(message.get("player_id") or "")
        name = message.get("name")
        if not player_id or player_id != self._pending_player_id or not isinstance(name, str):
            raise KyberProtocolError("Unexpected KYBER subscription acknowledgement")
        self._matched_player_id = player_id
        self._matched_player_name = name
        self._pending_player_id = None
        self._last_error = None
        self._set_state("subscribed")

    def _handle_gameplay_event(self, event_type: str, message: dict[str, Any]) -> None:
        if self._state != "subscribed" or not self._matched_player_id:
            return
        event_player_id = (
            message.get("victim_id")
            if event_type in {"damage_received", "player_killed"}
            else message.get("player_id")
        )
        if str(event_player_id or "") != self._matched_player_id:
            return

        params = {
            key: value
            for key, value in message.items()
            if key not in {"schema", "event", "epoch", "seq"}
        }
        params["epoch"] = self._epoch
        params["seq"] = self._last_seq
        event = KyberEvent(type=event_type, params=params, timestamp=time.time())
        self._events_received += 1
        self._last_event_ts = event.timestamp
        self._last_event_type = event_type

        if self.on_game_event:
            self.on_game_event(event_type, params)
        for cell, speed in map_event_to_haptics(event):
            if self.on_trigger:
                self.on_trigger(cell, speed)
        if event_type == "shot_fired" and self._solenoid_enabled and self.on_recoil:
            weapon = str(params.get("weapon") or "")
            self.on_recoil(duration_ms_for_weapon(weapon, self._solenoid_duration_ms))
        self._notify_status()

    async def _send(self, payload: dict[str, Any]) -> None:
        writer = self._writer
        if writer is None or writer.is_closing():
            raise ConnectionError("KYBER telemetry connection is not available")
        encoded = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8") + b"\n"
        if len(encoded) > MAX_LINE_BYTES:
            raise KyberProtocolError("KYBER telemetry command exceeds 8192 bytes")
        writer.write(encoded)
        await writer.drain()

    async def _close_writer(self) -> None:
        writer = self._writer
        self._writer = None
        if writer is None:
            return
        writer.close()
        try:
            await writer.wait_closed()
        except (ConnectionError, OSError):
            pass

    def _clear_stream_state(self) -> None:
        self._epoch = None
        self._last_seq = None
        self._matched_player_id = None
        self._matched_player_name = None
        self._pending_player_id = None
        self._roster = []

    def _set_state(self, state: str) -> None:
        changed = state != self._state
        self._state = state
        if changed:
            self._notify_status()

    def _notify_status(self) -> None:
        if self.on_status_change:
            self.on_status_change(self.status())
