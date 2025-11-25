# CS2 UI Integration - Design Document

## Objective

Add a UI section in the Electron app to manage Counter-Strike 2 Game State Integration (GSI), allowing users to:

1. See GSI server status (running/stopped, port)
2. Start/stop the GSI listener
3. Download the CS2 config file
4. See live game events (damage, death, flash, etc.)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron UI                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CS2 Integration Panel                              │    │
│  │  ┌───────────────┐  ┌─────────────────────────────┐ │    │
│  │  │ Status: 🟢    │  │ GSI Port: [3000]            │ │    │
│  │  │ Running       │  │ [Start] [Stop]              │ │    │
│  │  └───────────────┘  └─────────────────────────────┘ │    │
│  │  ┌─────────────────────────────────────────────────┐ │    │
│  │  │ [📥 Download CS2 Config File]                   │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  │  ┌─────────────────────────────────────────────────┐ │    │
│  │  │ Live Events:                                    │ │    │
│  │  │ • 12:34:05 damage: 25hp                        │ │    │
│  │  │ • 12:34:08 flash: intensity 200                │ │    │
│  │  │ • 12:34:12 death                               │ │    │
│  │  └─────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ TCP (existing daemon connection)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Python Daemon (port 5050)                 │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Vest Control    │    │ CS2 GSI Manager                 │ │
│  │ (existing)      │    │ • Embedded HTTP server (:3000)  │ │
│  │ • trigger       │    │ • Receives CS2 game state       │ │
│  │ • stop          │    │ • Detects events                │ │
│  │ • connect       │    │ • Triggers haptics              │ │
│  │                 │    │ • Broadcasts to all clients     │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## New Daemon Protocol

### Commands (Client → Daemon)

#### Start CS2 GSI

```json
{"cmd": "cs2_start", "gsi_port": 3000}
```

Response:
```json
{"response": "cs2_start", "success": true, "gsi_port": 3000}
{"response": "cs2_start", "success": false, "error": "Port 3000 already in use"}
```

#### Stop CS2 GSI

```json
{"cmd": "cs2_stop"}
```

Response:
```json
{"response": "cs2_stop", "success": true}
```

#### Get CS2 Status

```json
{"cmd": "cs2_status"}
```

Response:
```json
{
  "response": "cs2_status",
  "running": true,
  "gsi_port": 3000,
  "events_received": 142,
  "last_event_ts": 1700000000
}
```

#### Generate Config File

```json
{"cmd": "cs2_generate_config", "gsi_port": 3000}
```

Response:
```json
{
  "response": "cs2_generate_config",
  "config_content": "\"ThirdSpace Vest Integration\"\n{\n    \"uri\" ...",
  "filename": "gamestate_integration_thirdspace.cfg"
}
```

### Events (Daemon → All Clients)

#### CS2 Started/Stopped

```json
{"event": "cs2_started", "gsi_port": 3000, "ts": 1700000000}
{"event": "cs2_stopped", "ts": 1700000000}
```

#### CS2 Game Events

These are broadcast whenever the daemon detects a game event:

```json
{"event": "cs2_game_event", "type": "damage", "amount": 25, "ts": 1700000000}
{"event": "cs2_game_event", "type": "death", "ts": 1700000000}
{"event": "cs2_game_event", "type": "flash", "intensity": 200, "ts": 1700000000}
{"event": "cs2_game_event", "type": "bomb_planted", "ts": 1700000000}
{"event": "cs2_game_event", "type": "bomb_exploded", "ts": 1700000000}
{"event": "cs2_game_event", "type": "round_start", "ts": 1700000000}
{"event": "cs2_game_event", "type": "kill", "ts": 1700000000}
```

## Implementation Phases

### Phase 1: Daemon CS2 Commands

**Files to modify:**
- `server/protocol.py` - Add CS2 command/event types
- `server/daemon.py` - Add CS2 command handlers
- `integrations/cs2_gsi.py` - Refactor to be embeddable (not standalone)

**Tasks:**
1. Add `CommandType.CS2_START`, `CS2_STOP`, `CS2_STATUS`, `CS2_GENERATE_CONFIG`
2. Add `EventType.CS2_STARTED`, `CS2_STOPPED`, `CS2_GAME_EVENT`
3. Refactor `CS2GSIIntegration` to run inside daemon's event loop
4. Add command handlers in daemon
5. Broadcast `cs2_game_event` when events are detected
6. Test with netcat/curl

### Phase 2: Electron Integration

**Files to modify:**
- `web/electron/daemonBridge.cjs` - Add CS2 command functions
- `web/electron/main.cjs` - Add IPC handlers
- `web/electron/preload.cjs` - Expose CS2 functions
- `web/src/lib/bridgeApi.ts` - TypeScript API

**Tasks:**
1. Add `cs2Start()`, `cs2Stop()`, `cs2Status()`, `cs2GenerateConfig()` functions
2. Handle `cs2_game_event` events and forward to renderer
3. Add IPC handlers in main process
4. Expose in preload
5. Add TypeScript types

### Phase 3: React UI

**Files to create/modify:**
- `web/src/components/CS2IntegrationPanel.tsx` - New component
- `web/src/App.tsx` - Add panel to layout
- `web/src/hooks/useCS2Integration.ts` - Custom hook for CS2 state

**Tasks:**
1. Create `CS2IntegrationPanel` component with:
   - Status indicator (🟢 Running / 🔴 Stopped)
   - Port input field
   - Start/Stop buttons
   - Download config button
   - Live event log (scrollable, recent events)
2. Create `useCS2Integration` hook to manage state
3. Add to main app layout
4. Style to match existing UI

## Testing

### Phase 1 Tests (Daemon)

```bash
# Start daemon
python3 -m modern_third_space.cli daemon start

# Test CS2 commands via netcat
echo '{"cmd": "cs2_status"}' | nc localhost 5050
echo '{"cmd": "cs2_start", "gsi_port": 3001}' | nc localhost 5050
echo '{"cmd": "cs2_status"}' | nc localhost 5050

# Send fake CS2 payload to GSI server
curl -X POST http://127.0.0.1:3001 \
  -H "Content-Type: application/json" \
  -d '{"provider":{"name":"CS2"},"player":{"activity":"playing","state":{"health":75}},"previously":{"player":{"state":{"health":100}}}}'

# Stop CS2
echo '{"cmd": "cs2_stop"}' | nc localhost 5050
```

### Phase 2 Tests (Electron)

- Verify IPC handlers work
- Check events are forwarded to renderer
- Test config file download

### Phase 3 Tests (UI)

- Start/stop CS2 from UI
- Verify status updates
- Download config file
- See live events when sending test payloads

## Success Criteria

1. ✅ User can start/stop CS2 GSI from UI
2. ✅ User can see GSI status (running, port)
3. ✅ User can download config file with one click
4. ✅ User sees live game events in UI
5. ✅ All clients see CS2 events (broadcast)
6. ✅ CS2 GSI survives UI restart (daemon keeps running)

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Daemon CS2 commands | ✅ Complete |
| **Phase 2** | Electron IPC handlers | ✅ Complete |
| **Phase 3** | React UI component | ✅ Complete |

### Commits

- `f20227a` - Phase 1: Daemon CS2 commands (cs2_start, cs2_stop, cs2_status, cs2_generate_config)
- `4944096` - Phase 2: Electron IPC handlers
- `147d81e` - Phase 3: React UI component

### Files Created/Modified

**Phase 1 - Daemon:**
- `server/cs2_manager.py` - Embeddable CS2 GSI manager
- `server/protocol.py` - CS2 command/event types
- `server/daemon.py` - CS2 command handlers

**Phase 2 - Electron:**
- `web/electron/daemonBridge.cjs` - CS2 API methods
- `web/electron/main.cjs` - IPC handlers
- `web/electron/preload.cjs` - Exposed methods
- `web/src/lib/bridgeApi.ts` - TypeScript types and functions

**Phase 3 - React:**
- `web/src/components/CS2IntegrationPanel.tsx` - UI component
- `web/src/hooks/useCS2Integration.ts` - State management hook
- `web/src/App.tsx` - Added CS2 panel to layout

