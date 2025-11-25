# Vest Daemon Architecture

This document describes the architecture for a centralized Python daemon that manages vest connections and provides a unified interface for multiple clients (Electron UI, game mods, scripts).

## Problem Statement

Currently, each vest command spawns a new Python CLI process:

- No persistent connection to the vest
- No way for external integrations (game mods) to send commands
- UI cannot see commands triggered by external sources
- Multiple processes could conflict when accessing USB

## Solution: Centralized Daemon

A long-running Python daemon that:

1. Maintains a single connection to the vest hardware
2. Accepts connections from multiple clients via TCP
3. Routes commands to the vest
4. Broadcasts events to all connected clients

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Electron UI    │     │   Game Mod 1     │     │   Game Mod 2     │
│   (React)        │     │   (C# MelonLoader)│    │   (Python script)│
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │         TCP Socket (localhost:5050)             │
         └────────────────────────┼────────────────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │     Python Daemon        │
                    │     (server/)            │
                    │                          │
                    │  • Manages vest connection│
                    │  • Accepts N clients     │
                    │  • Broadcasts events     │
                    │  • Routes commands       │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │        vest/             │
                    │    (hardware control)    │
                    └──────────────────────────┘
```

## Benefits

| Feature                    | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| **Single vest connection** | No USB conflicts from multiple processes                 |
| **Event broadcast**        | All clients see all commands (UI sees game mod activity) |
| **Language agnostic**      | C#, Python, Node.js, Rust - any language can connect     |
| **Centralized logging**    | All vest activity flows through one point                |
| **Persistent state**       | Connection survives between UI interactions              |

## Protocol: TCP + Newline-Delimited JSON

Simple protocol that any language can implement:

- Connect to `localhost:5050` (configurable)
- Send JSON commands, one per line
- Receive JSON events, one per line

### Device Selection Model

The daemon maintains a **single "selected device"** that all commands operate on:

1. On startup, no device is selected
2. UI (or any client) can call `list` to see available devices
3. UI calls `select_device` to choose which vest to use
4. All subsequent commands (`trigger`, `stop`, etc.) go to the selected device
5. Selection persists until changed or daemon restarts

This avoids sending device info with every command:

```
┌─────────────┐                           ┌─────────────┐
│   Client    │                           │   Daemon    │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  {"cmd": "list"}                        │
       │────────────────────────────────────────►│
       │                                         │
       │  {"response": "list", "devices": [...]} │
       │◄────────────────────────────────────────│
       │                                         │
       │  {"cmd": "select_device", "bus": 1,     │
       │   "address": 5}                         │
       │────────────────────────────────────────►│
       │                                         │  ← Daemon remembers
       │  {"event": "device_selected", ...}      │    this device
       │◄────────────────────────────────────────│
       │                                         │
       │  {"cmd": "trigger", "cell": 0, ...}     │  ← No device info
       │────────────────────────────────────────►│    needed!
       │                                         │
```

### Commands (Client → Daemon)

#### Health Check

```json
{"cmd": "ping"}
```

Response includes daemon state summary:

```json
{"response": "ping", "alive": true, "connected": false, "has_device_selected": true, "client_count": 2}
```

#### Device Discovery & Selection

```json
{"cmd": "list"}
{"cmd": "select_device", "bus": 1, "address": 5}
{"cmd": "select_device", "serial": "ABC123"}
{"cmd": "get_selected_device"}
{"cmd": "clear_device"}
```

#### Vest Control (operates on selected device)

```json
{"cmd": "connect"}
{"cmd": "disconnect"}
{"cmd": "trigger", "cell": 0, "speed": 5}
{"cmd": "stop"}
{"cmd": "status"}
```

### Events (Daemon → All Clients)

Events are broadcast to ALL connected clients, enabling the UI to see activity from game mods.

#### Device Selection Events

```json
{"event": "device_selected", "device": {"bus": 1, "address": 5, "serial": "ABC123"}, "ts": 1700000000}
{"event": "device_cleared", "ts": 1700000000}
{"event": "devices_changed", "devices": [...], "ts": 1700000000}
```

#### Connection Events

```json
{"event": "connected", "device": {"bus": 1, "address": 5, "serial": "ABC123"}, "ts": 1700000000}
{"event": "disconnected", "ts": 1700000000}
```

#### Command Events

```json
{"event": "effect_triggered", "cell": 0, "speed": 5, "ts": 1700000000}
{"event": "all_stopped", "ts": 1700000000}
```

#### Client Events

```json
{"event": "client_connected", "client_id": "abc123", "ts": 1700000000}
{"event": "client_disconnected", "client_id": "abc123", "ts": 1700000000}
```

#### Error Events

```json
{"event": "error", "message": "Device not found", "ts": 1700000000}
{"event": "error", "message": "No device selected", "ts": 1700000000}
```

### Responses (Daemon → Requesting Client)

Direct responses to commands (only sent to the client that made the request):

```json
{"response": "list", "devices": [...], "req_id": "xyz"}
{"response": "get_selected_device", "device": {"bus": 1, "address": 5, "serial": "ABC123"}, "req_id": "xyz"}
{"response": "get_selected_device", "device": null, "req_id": "xyz"}
{"response": "status", "connected": true, "device": {...}, "req_id": "xyz"}
{"response": "ok", "req_id": "xyz"}
{"response": "error", "message": "No device selected", "req_id": "xyz"}
{"response": "error", "message": "Invalid command", "req_id": "xyz"}
```

### Request IDs (Optional)

Clients can include a `req_id` to match responses to requests:

```json
→ {"cmd": "status", "req_id": "abc123"}
← {"response": "status", "connected": true, ..., "req_id": "abc123"}
```

## Python Package Structure

The daemon will be implemented in a new `server/` package, keeping `vest/` isolated:

```
modern_third_space/
├── vest/                    # 🔒 Hardware only (unchanged)
│   ├── controller.py
│   ├── status.py
│   └── discovery.py
├── server/                  # 🆕 Daemon implementation
│   ├── __init__.py
│   ├── daemon.py            # Main daemon loop
│   ├── protocol.py          # JSON protocol handling
│   └── client_manager.py    # Track connected clients
├── cli.py                   # Add "daemon" command
└── ...
```

## CLI Usage

```bash
# Start the daemon
python -m modern_third_space.cli daemon start
python -m modern_third_space.cli daemon start --port 5050  # Custom port (default: 5050)

# Check daemon status (includes health check)
python -m modern_third_space.cli daemon status
python -m modern_third_space.cli daemon status --port 5050

# Stop the daemon
python -m modern_third_space.cli daemon stop
python -m modern_third_space.cli daemon stop --force  # Force kill with SIGKILL
```

### Status Output Example

```
Daemon: 🟢 Running
Status: Daemon running (PID 12345) on 127.0.0.1:5050
PID file: /tmp/vest-daemon-5050.pid
Connected to vest: Yes
Device selected: Yes (bus=1, address=5)
Connected clients: 3
```

## Client Examples

### Python Client

```python
import socket
import json

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('localhost', 5050))

# Send command
sock.sendall(json.dumps({"cmd": "trigger", "cell": 0, "speed": 5}).encode() + b'\n')

# Read events
for line in sock.makefile('r'):
    event = json.loads(line)
    print(f"Event: {event}")
```

### C# Client (for MelonLoader mods)

```csharp
using System.Net.Sockets;
using System.Text;
using Newtonsoft.Json;

var client = new TcpClient("localhost", 5050);
var stream = client.GetStream();

// Send command
var cmd = JsonConvert.SerializeObject(new { cmd = "trigger", cell = 0, speed = 5 });
var bytes = Encoding.UTF8.GetBytes(cmd + "\n");
stream.Write(bytes, 0, bytes.Length);

// Read events (in a separate thread)
var reader = new StreamReader(stream);
while (true) {
    var line = reader.ReadLine();
    var evt = JsonConvert.DeserializeObject<Dictionary<string, object>>(line);
    Console.WriteLine($"Event: {evt["event"]}");
}
```

### Node.js / Electron Client

```javascript
const net = require("net");

const client = net.createConnection({ port: 5050 }, () => {
  // Send command
  client.write(JSON.stringify({ cmd: "trigger", cell: 0, speed: 5 }) + "\n");
});

// Receive events
let buffer = "";
client.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop(); // Keep incomplete line in buffer

  for (const line of lines) {
    if (line) {
      const event = JSON.parse(line);
      console.log("Event:", event);
    }
  }
});
```

## Electron Integration

The Electron app will:

1. **Optionally** start the daemon if not already running
2. Connect to the daemon via TCP
3. Forward events to React UI via IPC
4. Send commands from UI through the daemon

```
┌─────────────────────────────────────────────────────┐
│                    Electron App                      │
│  ┌─────────────┐    IPC     ┌─────────────────────┐ │
│  │  React UI   │◄──────────►│  Main Process       │ │
│  │  (renderer) │            │  (daemonBridge.cjs) │ │
│  └─────────────┘            └──────────┬──────────┘ │
│                                        │ TCP        │
└────────────────────────────────────────┼────────────┘
                                         ▼
                              ┌─────────────────────┐
                              │   Python Daemon     │
                              │   (localhost:5050)  │
                              └─────────────────────┘
```

## Future Enhancements

### Authentication (if needed)

```json
→ {"cmd": "auth", "token": "secret123"}
← {"response": "auth", "ok": true}
```

### Client Identification

```json
→ {"cmd": "identify", "name": "SuperhotVR Mod", "version": "1.0.0"}
← {"event": "client_identified", "client_id": "abc", "name": "SuperhotVR Mod"}
```

### Effect Patterns (higher-level commands)

```json
→ {"cmd": "pattern", "name": "impact_front", "intensity": 0.8}
```

## Implementation Status

### ✅ Phase 1: Core Daemon (COMPLETE)

- [x] Basic TCP server in `server/daemon.py`
- [x] JSON protocol parsing in `server/protocol.py`
- [x] Client connection management (`server/client_manager.py`)
- [x] Device selection state (`select_device`, `get_selected_device`, `clear_device`)
- [x] Vest command routing (to selected device)
- [x] Event broadcasting to all clients
- [x] `ping` command for health checks

### ✅ Phase 2: Electron Integration (COMPLETE)

- [x] Created `daemonBridge.cjs` (TCP client for daemon)
- [x] Forward events to React via IPC
- [x] Update UI to display daemon events in log panel
- [x] `preload.cjs` exposes `onDaemonEvent` and `onDaemonStatus`

### ✅ Phase 3: CLI & Lifecycle (COMPLETE)

- [x] Add `daemon start/stop/status` subcommands to CLI
- [x] PID file management (`/tmp/vest-daemon-{port}.pid`)
- [x] Port configuration (`--port`)
- [x] Health checks via `ping` command
- [x] `lifecycle.py` module for daemon management

### ✅ Phase 4: Documentation & Examples (COMPLETE)

- [x] Client library examples (Python, C#, Node.js) - see above
- [x] Integration guide for game mods - see `CS2_INTEGRATION.md`
- [x] Testing guide - see `modern-third-space/TESTING.md`

## Related Documents

- `CS2_INTEGRATION.md` - Counter-Strike 2 game integration guide
- `MELONLOADER_INTEGRATION_STRATEGY.md` - How game mods will use this daemon
- `AI_ONBOARDING.md` - Project architecture overview
- `modern-third-space/README.md` - Python package documentation
- `modern-third-space/TESTING.md` - Testing examples and curl commands
