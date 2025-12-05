# Testing Guide

This document provides examples for testing all components of the `modern-third-space` package without requiring actual hardware or running games.

## Table of Contents

1. [Game Integration Consistency Tests](#game-integration-consistency-tests) ⭐ **NEW - RUN FIRST**
2. [Quick Health Check](#quick-health-check)
3. [Testing the Daemon](#testing-the-daemon)
4. [Testing CS2 GSI Integration](#testing-cs2-gsi-integration)
5. [Testing Half-Life: Alyx Integration](#testing-half-life-alyx-integration)
6. [Testing with Python Scripts](#testing-with-python-scripts)
7. [Simulated Game Payloads](#simulated-game-payloads)

---

## Game Integration Consistency Tests

**⚠️ MANDATORY: Run these tests before adding or modifying game integrations.**

### Install and Run

```bash
cd modern-third-space

# Install the package in development mode (first time only)
pip install -e .

# Run all game integration tests
python3 -m pytest tests/test_game_integrations.py -v
```

### Expected Output

```
======================== 27 passed, N warnings =================
```

All tests must pass. Warnings are advisory (documentation recommendations).

### What the Tests Validate

| Test Category | What It Checks |
|---------------|----------------|
| **Registry** | All integrations have unique IDs, required fields, proper naming |
| **Manager Structure** | Managers are importable, have required methods (start/stop or process_event) |
| **Haptic Mappings** | Mappings exist and use proper cell layout constants |
| **Cell Layout** | Managers import from `vest.cell_layout`, use Cell constants |
| **Event Types** | All integrations have damage/death events documented |
| **Snapshot** | Existing integrations haven't been accidentally modified |
| **Documentation** | STABLE integrations have docs (advisory warning if missing) |

### Adding a New Integration

When adding a new game integration, you must:

1. **Register in `integrations/registry.py`**:
   ```python
   register_integration(GameIntegrationSpec(
       game_id="newgame",
       game_name="New Game",
       # ... all required fields
   ))
   ```

2. **Update Snapshot in `tests/test_game_integrations.py`**:
   ```python
   EXPECTED_INTEGRATIONS = {
       # ... existing entries
       "newgame": {
           "game_name": "New Game",
           "integration_type": "log_file",
           "status": "stable",
           "has_manager": True,
           "event_count_min": 2,
       },
   }
   ```

3. **Run tests and ensure all pass**:
   ```bash
   python3 -m pytest tests/test_game_integrations.py -v
   ```

### Troubleshooting Failed Tests

| Failure | Cause | Fix |
|---------|-------|-----|
| `Missing manager_module` | STABLE integration without manager | Add manager_module and manager_class |
| `Daemon command should start with game_id_` | Wrong command naming | Prefix commands with `{game_id}_` |
| `Missing map_event_to_haptics` | No haptic mapping logic | Add mapping function or `_trigger_*` methods |
| `Should import from vest.cell_layout` | Using raw integers for cells | Import Cell constants from cell_layout |
| `Integration removed without updating snapshot` | Removed integration | Update EXPECTED_INTEGRATIONS if intentional |

---

---

## Quick Health Check

Verify the Python package is installed correctly:

```bash
cd modern-third-space/src

# Basic health check
python3 -m modern_third_space.cli ping
# Expected: {"status": "ok", "message": "Python bridge is reachable"}

# List USB devices (will show fake device if PyUSB not installed)
python3 -m modern_third_space.cli list
```

---

## Testing the Daemon

### Start the Daemon

```bash
# Start on default port 5050
python3 -m modern_third_space.cli daemon start

# Or on a custom port
python3 -m modern_third_space.cli daemon start --port 5051
```

### Check Daemon Status

```bash
python3 -m modern_third_space.cli daemon status
# Expected output:
# Daemon: 🟢 Running
# Status: Daemon running (PID 12345) on 127.0.0.1:5050
# PID file: /tmp/vest-daemon-5050.pid
# Connected to vest: No
# Device selected: No
# Connected clients: 0
```

### Send Commands via netcat

```bash
# Ping the daemon
echo '{"cmd": "ping"}' | nc localhost 5050

# List available devices
echo '{"cmd": "list"}' | nc localhost 5050

# Select a device (use bus/address from list output)
echo '{"cmd": "select_device", "bus": 1, "address": 5}' | nc localhost 5050

# Get selected device
echo '{"cmd": "get_selected_device"}' | nc localhost 5050

# Trigger an effect (cell 0, speed 5)
echo '{"cmd": "trigger", "cell": 0, "speed": 5}' | nc localhost 5050

# Stop all effects
echo '{"cmd": "stop"}' | nc localhost 5050

# Get connection status
echo '{"cmd": "status"}' | nc localhost 5050
```

### Send Commands via Python

```python
import socket
import json

def send_daemon_command(cmd: dict, host="127.0.0.1", port=5050) -> dict:
    """Send a command to the daemon and get response."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((host, port))
    sock.sendall(json.dumps(cmd).encode() + b'\n')
    
    response = sock.recv(4096).decode()
    sock.close()
    
    return json.loads(response.strip())

# Test commands
print(send_daemon_command({"cmd": "ping"}))
print(send_daemon_command({"cmd": "list"}))
print(send_daemon_command({"cmd": "trigger", "cell": 0, "speed": 5}))
```

### Stop the Daemon

```bash
python3 -m modern_third_space.cli daemon stop

# Force stop (SIGKILL)
python3 -m modern_third_space.cli daemon stop --force
```

---

## Testing CS2 GSI Integration

### Check Integration Status

```bash
python3 -m modern_third_space.cli cs2 status
# Shows: GSI Server status, Daemon status, Config file status
```

### Generate Config File

```bash
# Output to stdout (see what would be generated)
python3 -m modern_third_space.cli cs2 generate-config --output /dev/stdout

# Save to a test file
python3 -m modern_third_space.cli cs2 generate-config --output /tmp/test_gsi_config.cfg
```

### Start the Integration

```bash
# Make sure daemon is running first!
python3 -m modern_third_space.cli daemon start &

# Start CS2 GSI on custom port (to avoid conflicts)
python3 -m modern_third_space.cli cs2 start --gsi-port 3001 --daemon-port 5050
```

### Send Simulated CS2 Payloads

While the integration is running, send fake game state updates:

```bash
# Player took 25 damage (100 → 75 health)
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {"name": "Counter-Strike 2", "appid": 730},
    "player": {
      "name": "TestPlayer",
      "team": "CT",
      "activity": "playing",
      "state": {
        "health": 75,
        "armor": 100,
        "helmet": true,
        "flashed": 0,
        "round_kills": 0
      }
    },
    "round": {"phase": "live", "bomb": ""},
    "map": {"name": "de_dust2", "phase": "live"},
    "previously": {
      "player": {"state": {"health": 100}}
    }
  }'

# Player got flashed
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {"name": "Counter-Strike 2", "appid": 730},
    "player": {
      "name": "TestPlayer",
      "team": "CT",
      "activity": "playing",
      "state": {"health": 75, "flashed": 200, "round_kills": 0}
    },
    "round": {"phase": "live"},
    "map": {"phase": "live"},
    "previously": {"player": {"state": {"flashed": 0}}}
  }'

# Player died
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {"name": "Counter-Strike 2", "appid": 730},
    "player": {
      "name": "TestPlayer",
      "team": "CT",
      "activity": "playing",
      "state": {"health": 0, "armor": 0, "flashed": 0, "round_kills": 0}
    },
    "round": {"phase": "live"},
    "map": {"phase": "live"},
    "previously": {"player": {"state": {"health": 75}}}
  }'

# Bomb planted
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {"name": "Counter-Strike 2", "appid": 730},
    "player": {
      "name": "TestPlayer",
      "activity": "playing",
      "state": {"health": 100, "round_kills": 0}
    },
    "round": {"phase": "live", "bomb": "planted"},
    "map": {"phase": "live"},
    "previously": {"round": {"bomb": ""}}
  }'

# Bomb exploded
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {"name": "Counter-Strike 2", "appid": 730},
    "player": {
      "name": "TestPlayer",
      "activity": "playing",
      "state": {"health": 100}
    },
    "round": {"phase": "over", "bomb": "exploded"},
    "map": {"phase": "live"},
    "previously": {"round": {"bomb": "planted"}}
  }'

# Player got a kill
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {"name": "Counter-Strike 2", "appid": 730},
    "player": {
      "name": "TestPlayer",
      "activity": "playing",
      "state": {"health": 100, "round_kills": 1}
    },
    "round": {"phase": "live"},
    "map": {"phase": "live"},
    "previously": {"player": {"state": {"round_kills": 0}}}
  }'

# Round started (freezetime → live)
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {"name": "Counter-Strike 2", "appid": 730},
    "player": {
      "name": "TestPlayer",
      "activity": "playing",
      "state": {"health": 100, "round_kills": 0}
    },
    "round": {"phase": "live"},
    "map": {"phase": "live"},
    "previously": {"round": {"phase": "freezetime"}}
  }'
```

---

## Testing with Python Scripts

### Full Integration Test Script

Save this as `test_cs2_integration.py`:

```python
#!/usr/bin/env python3
"""
Full end-to-end test of CS2 GSI integration.

Usage:
    1. Start daemon: python3 -m modern_third_space.cli daemon start
    2. Run this script: python3 test_cs2_integration.py
"""

import asyncio
import json
import urllib.request
from modern_third_space.integrations.cs2_gsi import CS2GSIIntegration

# Test payloads
PAYLOADS = {
    "damage_25": {
        "provider": {"name": "Counter-Strike 2", "appid": 730},
        "player": {
            "name": "TestPlayer",
            "team": "CT",
            "activity": "playing",
            "state": {"health": 75, "armor": 100, "flashed": 0, "round_kills": 0}
        },
        "round": {"phase": "live", "bomb": ""},
        "map": {"name": "de_dust2", "phase": "live"},
        "previously": {"player": {"state": {"health": 100}}}
    },
    "flash": {
        "provider": {"name": "Counter-Strike 2", "appid": 730},
        "player": {
            "name": "TestPlayer",
            "activity": "playing",
            "state": {"health": 100, "flashed": 200, "round_kills": 0}
        },
        "round": {"phase": "live"},
        "map": {"phase": "live"},
        "previously": {"player": {"state": {"flashed": 0}}}
    },
    "death": {
        "provider": {"name": "Counter-Strike 2", "appid": 730},
        "player": {
            "name": "TestPlayer",
            "activity": "playing",
            "state": {"health": 0, "armor": 0, "flashed": 0, "round_kills": 0}
        },
        "round": {"phase": "live"},
        "map": {"phase": "live"},
        "previously": {"player": {"state": {"health": 75}}}
    },
    "kill": {
        "provider": {"name": "Counter-Strike 2", "appid": 730},
        "player": {
            "name": "TestPlayer",
            "activity": "playing",
            "state": {"health": 100, "round_kills": 1}
        },
        "round": {"phase": "live"},
        "map": {"phase": "live"},
        "previously": {"player": {"state": {"round_kills": 0}}}
    },
}


async def main():
    # Track detected events
    events = []
    
    integration = CS2GSIIntegration(
        gsi_host="127.0.0.1",
        gsi_port=3002,
        daemon_host="127.0.0.1",
        daemon_port=5050
    )
    integration.on_event = lambda t, d: events.append((t, d))
    
    # Start integration
    server_task = asyncio.create_task(integration.start())
    await asyncio.sleep(1)
    
    print("=" * 50)
    print("CS2 GSI Integration Test")
    print("=" * 50)
    print(f"GSI Server: http://127.0.0.1:3002")
    print(f"Daemon connected: {integration.daemon.is_connected}")
    print()
    
    # Send test payloads
    for name, payload in PAYLOADS.items():
        print(f"Sending: {name}...")
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            "http://127.0.0.1:3002",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req)
        await asyncio.sleep(0.5)
    
    await asyncio.sleep(1)
    
    # Stop
    await integration.stop()
    server_task.cancel()
    
    # Report
    print()
    print("=" * 50)
    print("Events Detected")
    print("=" * 50)
    for event_type, data in events:
        print(f"  ✓ {event_type}: {data}")
    
    print()
    print(f"Total events: {len(events)}")
    expected = ["damage", "flash", "damage", "death", "kill"]
    print(f"Expected: {len(expected)}")
    

if __name__ == "__main__":
    asyncio.run(main())
```

### Daemon Connection Test

```python
#!/usr/bin/env python3
"""Test daemon connection and basic commands."""

import asyncio
from modern_third_space.integrations.base import DaemonConnection


async def test_daemon():
    daemon = DaemonConnection(host="127.0.0.1", port=5050)
    
    print("Connecting to daemon...")
    if not await daemon.connect():
        print("Failed to connect!")
        return
    
    print("✓ Connected")
    
    # Ping
    response = await daemon.send_command({"cmd": "ping"})
    print(f"Ping response: {response}")
    
    # List devices
    response = await daemon.send_command({"cmd": "list"})
    print(f"Devices: {response}")
    
    # Trigger test (cell 0, speed 3)
    print("Triggering cell 0...")
    success = await daemon.send_trigger(0, 3)
    print(f"Trigger success: {success}")
    
    await asyncio.sleep(0.5)
    
    # Stop
    print("Stopping...")
    success = await daemon.send_stop()
    print(f"Stop success: {success}")
    
    await daemon.disconnect()
    print("✓ Disconnected")


if __name__ == "__main__":
    asyncio.run(test_daemon())
```

---

## Simulated Game Payloads

### CS2 GSI Payload Reference

The CS2 GSI system sends JSON with this structure:

```json
{
  "provider": {
    "name": "Counter-Strike 2",
    "appid": 730,
    "version": 14000,
    "steamid": "76561198012345678",
    "timestamp": 1700000000
  },
  "player": {
    "steamid": "76561198012345678",
    "name": "PlayerName",
    "team": "CT",
    "activity": "playing",
    "state": {
      "health": 100,
      "armor": 100,
      "helmet": true,
      "flashed": 0,
      "smoked": 0,
      "burning": 0,
      "money": 5000,
      "round_kills": 0,
      "round_killhs": 0,
      "round_totaldmg": 0,
      "equip_value": 3500,
      "defusekit": false
    }
  },
  "round": {
    "phase": "live",
    "bomb": ""
  },
  "map": {
    "name": "de_dust2",
    "phase": "live",
    "round": 5,
    "team_ct": {"score": 3},
    "team_t": {"score": 2}
  },
  "previously": {
    "player": {
      "state": {
        "health": 100
      }
    }
  }
}
```

### Key Fields for Haptics

| Field | Description | Used For |
|-------|-------------|----------|
| `player.activity` | "playing", "menu", "textinput" | Only trigger haptics when "playing" |
| `player.state.health` | 0-100 | Damage detection (compare with previously) |
| `player.state.flashed` | 0-255 | Flash intensity |
| `player.state.round_kills` | Kill count this round | Kill detection |
| `round.phase` | "freezetime", "live", "over" | Round start detection |
| `round.bomb` | "", "planted", "defused", "exploded" | Bomb events |
| `previously.*` | Previous values | Change detection |

---

## Troubleshooting Tests

### Port Already in Use

```bash
# Check what's using a port
lsof -i :5050
lsof -i :3000

# Kill processes using the port
pkill -f "modern_third_space"
```

### Daemon Not Responding

```bash
# Check daemon status
python3 -m modern_third_space.cli daemon status

# Check PID file
cat /tmp/vest-daemon-5050.pid

# Force restart
python3 -m modern_third_space.cli daemon stop --force
python3 -m modern_third_space.cli daemon start
```

### GSI Server Not Receiving Data

```bash
# Test HTTP server is running
curl -X POST http://127.0.0.1:3000 -d '{"test": true}'

# Check CS2 status
python3 -m modern_third_space.cli cs2 status
```

---

## Testing CS2 via Daemon Commands

The CS2 GSI can also be managed directly via daemon commands (used by the Electron UI):

### Start CS2 via Daemon

```python
import socket
import json

def send_cmd(cmd, host="127.0.0.1", port=5050):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))
    s.send((json.dumps(cmd) + '\n').encode())
    data = b''
    while True:
        try:
            s.settimeout(0.5)
            chunk = s.recv(4096)
            if not chunk:
                break
            data += chunk
        except socket.timeout:
            break
    s.close()
    return data.decode()

# Start CS2 GSI on port 3001
print(send_cmd({"cmd": "cs2_start", "gsi_port": 3001}))
# Response: {"event": "cs2_started", "gsi_port": 3001, ...}
#           {"response": "cs2_start", "success": true, "gsi_port": 3001}

# Check CS2 status
print(send_cmd({"cmd": "cs2_status"}))
# Response: {"response": "cs2_status", "running": true, "gsi_port": 3001, "events_received": 0}

# Generate config file content
print(send_cmd({"cmd": "cs2_generate_config", "gsi_port": 3001}))
# Response: {"response": "cs2_generate_config", "config_content": "...", "filename": "..."}

# Stop CS2 GSI
print(send_cmd({"cmd": "cs2_stop"}))
# Response: {"event": "cs2_stopped", ...}
#           {"response": "cs2_stop", "success": true}
```

### Test CS2 Events in UI

1. Start daemon: `python3 -m modern_third_space.cli daemon start`
2. Start Electron: `cd web && yarn dev`
3. In the UI, find the "Counter-Strike 2" panel and click "Start GSI"
4. Send test payloads using curl (see above examples)
5. Watch live events appear in the UI panel!

Events visible in UI:
- 💥 **Damage** - Shows HP amount (e.g., "25 HP")
- 💀 **Death**
- ✨ **Flash** - Shows intensity (e.g., "intensity 200")
- 💣 **Bomb Planted**
- 🔥 **Bomb Exploded**
- 🎯 **Round Start**
- 🎖️ **Kill**

---

## Testing Half-Life: Alyx Integration

### Check Alyx Integration Status

```python
import socket
import json

def send_cmd(cmd, host="127.0.0.1", port=5050):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))
    s.send((json.dumps(cmd) + '\n').encode())
    data = b''
    while True:
        try:
            s.settimeout(0.5)
            chunk = s.recv(4096)
            if not chunk:
                break
            data += chunk
        except socket.timeout:
            break
    s.close()
    return data.decode()

# Check Alyx status
print(send_cmd({"cmd": "alyx_status"}))
# Response: {"response": "alyx_status", "running": false, ...}

# Get mod info (download URLs, install instructions)
print(send_cmd({"cmd": "alyx_get_mod_info"}))
# Response: {"response": "alyx_get_mod_info", "mod_info": {...}}
```

### Start Alyx Integration

```python
# Start with auto-detect (finds console.log automatically)
print(send_cmd({"cmd": "alyx_start"}))
# Response: {"event": "alyx_started", "log_path": "/path/to/console.log"}
#           {"response": "alyx_start", "success": true, "log_path": "..."}

# Start with custom log path
print(send_cmd({"cmd": "alyx_start", "log_path": "/custom/path/console.log"}))
```

### Simulate Alyx Console Log Events

Since Alyx integration reads from `console.log`, you can test by writing directly to a test log file:

```bash
# Create a test log file
TEST_LOG="/tmp/alyx_test_console.log"
touch "$TEST_LOG"

# Start Alyx integration with custom path (via daemon)
python3 -c "
import socket
import json
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(('127.0.0.1', 5050))
s.send(b'{\"cmd\": \"alyx_start\", \"log_path\": \"$TEST_LOG\"}\n')
print(s.recv(4096).decode())
s.close()
"

# Simulate game events by writing to the log
echo '[Tactsuit] {PlayerHurt|75|zombie|180|Zombie|zombie_1}' >> "$TEST_LOG"
echo '[Tactsuit] {PlayerShootWeapon|pistol}' >> "$TEST_LOG"
echo '[Tactsuit] {PlayerDeath|2}' >> "$TEST_LOG"
echo '[Tactsuit] {Reset}' >> "$TEST_LOG"
echo '[Tactsuit] {PlayerGrabbityPull|true}' >> "$TEST_LOG"
echo '[Tactsuit] {GrabbityGloveCatch|false}' >> "$TEST_LOG"
```

### Test Event Format Reference

| Event | Format | Description |
|-------|--------|-------------|
| Player Damage | `{PlayerHurt\|health\|enemy_class\|angle\|enemy_name\|debug_name}` | Angle 0-360° |
| Weapon Fire | `{PlayerShootWeapon\|weapon_class}` | e.g., pistol, shotgun |
| Death | `{PlayerDeath\|damagebits}` | 2=bullet, 8=burn, etc. |
| Spawn | `{Reset}` | Player respawned |
| Gravity Pull | `{PlayerGrabbityPull\|is_primary_hand}` | true/false |
| Gravity Catch | `{GrabbityGloveCatch\|is_primary_hand}` | true/false |
| Barnacle Grab | `{PlayerGrabbedByBarnacle}` | No params |
| Heal | `{PlayerHeal\|angle}` | Health pen used |
| Low Health | `{PlayerHealth\|health}` | Triggers heartbeat |
| Cough | `{PlayerCoughStart}` / `{PlayerCoughEnd}` | Poison gas |

### Stop Alyx Integration

```python
print(send_cmd({"cmd": "alyx_stop"}))
# Response: {"event": "alyx_stopped"}
#           {"response": "alyx_stop", "success": true}
```

### Test Alyx Events in UI

1. Start daemon: `python3 -m modern_third_space.cli daemon start`
2. Start Electron: `cd web && yarn dev`
3. In the UI, find the "Half-Life: Alyx" panel and click "Start Watching"
4. Write test events to the log file (see examples above)
5. Watch live events appear in the UI panel!

Events visible in UI:
- 💥 **Damage Taken** - Shows remaining HP
- 💀 **Death**
- 🔫 **Weapon Fire** - Shows weapon type
- ❤️ **Low Health** - Heartbeat effect
- 💚 **Healing** - Health pen used
- 🧲 **Gravity Pull**
- 🤚 **Gravity Catch**
- 🦑 **Barnacle Grab/Release**
- 🔄 **Player Spawn**

---

## CI/CD Integration

For automated testing, use this pattern:

```bash
#!/bin/bash
set -e

cd modern-third-space/src

# Start daemon in background
python3 -m modern_third_space.cli daemon start --port 5099 &
DAEMON_PID=$!
sleep 2

# Run tests
python3 -c "
import socket
import json

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('127.0.0.1', 5099))
sock.sendall(b'{\"cmd\": \"ping\"}\n')
response = sock.recv(1024).decode()
sock.close()

data = json.loads(response)
assert 'client_id' in data or 'alive' in data, f'Unexpected response: {data}'
print('✓ Daemon ping test passed')
"

# Cleanup
kill $DAEMON_PID 2>/dev/null || true
python3 -m modern_third_space.cli daemon stop --port 5099 2>/dev/null || true

echo "All tests passed!"
```

