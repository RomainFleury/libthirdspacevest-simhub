"""
Client connection management for the vest daemon.

Tracks connected TCP clients and provides broadcast functionality.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Dict, Optional, Set

from .protocol import Event, event_client_connected, event_client_disconnected


@dataclass
class Client:
    """Represents a connected client."""
    id: str
    writer: asyncio.StreamWriter
    name: Optional[str] = None
    version: Optional[str] = None
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Client):
            return False
        return self.id == other.id


class ClientManager:
    """
    Manages connected clients and message broadcasting.
    
    Thread-safe for use with asyncio.
    """
    
    def __init__(self) -> None:
        self._clients: Dict[str, Client] = {}
        self._lock = asyncio.Lock()
    
    async def add_client(self, writer: asyncio.StreamWriter) -> Client:
        """
        Register a new client connection.
        
        Returns the Client object with a unique ID.
        """
        client_id = str(uuid.uuid4())[:8]
        client = Client(id=client_id, writer=writer)
        
        async with self._lock:
            self._clients[client_id] = client
        
        # Broadcast that a new client connected
        await self.broadcast(event_client_connected(client_id))
        
        return client
    
    async def remove_client(self, client: Client) -> None:
        """
        Unregister a client connection.
        """
        async with self._lock:
            if client.id in self._clients:
                del self._clients[client.id]
        
        # Broadcast that client disconnected
        await self.broadcast(event_client_disconnected(client.id))
    
    async def identify_client(self, client: Client, name: str, version: Optional[str] = None) -> None:
        """
        Set client identification info.
        """
        async with self._lock:
            if client.id in self._clients:
                self._clients[client.id].name = name
                self._clients[client.id].version = version
    
    async def broadcast(self, event: Event, exclude: Optional[Client] = None) -> None:
        """
        Send an event to all connected clients.
        
        Args:
            event: The event to broadcast
            exclude: Optional client to exclude (e.g., the sender)
        """
        message = event.to_json().encode()
        
        async with self._lock:
            clients_to_send = [
                c for c in self._clients.values()
                if exclude is None or c.id != exclude.id
            ]
        
        # Send to all clients, handling failures gracefully
        for client in clients_to_send:
            try:
                client.writer.write(message)
                await client.writer.drain()
            except Exception:
                # Client may have disconnected, will be cleaned up elsewhere
                pass
    
    async def send_to_client(self, client: Client, message: str) -> bool:
        """
        Send a message to a specific client.
        
        Returns True if successful, False if client disconnected.
        """
        try:
            client.writer.write(message.encode())
            await client.writer.drain()
            return True
        except Exception:
            return False
    
    @property
    def client_count(self) -> int:
        """Number of connected clients."""
        return len(self._clients)
    
    def get_client_info(self) -> list:
        """Get info about all connected clients."""
        return [
            {
                "id": c.id,
                "name": c.name,
                "version": c.version,
            }
            for c in self._clients.values()
        ]

