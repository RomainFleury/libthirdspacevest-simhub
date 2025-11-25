# MelonLoader Game Integration Strategy

## Overview

This document outlines a comprehensive strategy for integrating MelonLoader-based game mods with the Third Space Vest system. Based on analysis of the OWO_SuperhotVR mod and the project architecture, this strategy provides multiple approaches for bridging game events to haptic feedback.

## Understanding MelonLoader Mods

### Architecture Pattern

MelonLoader mods typically follow this pattern:

1. **Harmony Patches**: Use [Harmony](https://github.com/pardeike/Harmony) to intercept Unity game methods
2. **Event Detection**: Detect game events (player actions, damage, interactions)
3. **Haptic SDK Integration**: Send haptic feedback via OWO SDK, bHaptics SDK, or similar
4. **Mod Loading**: Loaded by MelonLoader at game startup

### Example: OWO_SuperhotVR Mod Analysis

From the source code analysis:

```csharp
// Harmony patch intercepts game method
[HarmonyPatch(typeof(PlayerActionsVR), "Kill", ...)]
public class Patch_KillPlayer
{
    [HarmonyPostfix]
    public static void Postfix(...)
    {
        owoSkin.Feel("Death", Priority: 4);  // Direct OWO SDK call
    }
}
```

**Key Observations:**
- Mods use Harmony to patch game methods
- Events are detected in real-time during gameplay
- Haptic SDK calls are made directly (OWO.Send(), bHaptics.Submit(), etc.)
- No built-in telemetry export mechanism

## Integration Strategies

### Strategy 1: Event Logging & File Monitoring (Recommended for Quick Start)

**Approach:** Modify mods to log events to files, then monitor those files from Electron.

**Implementation Steps:**

1. **Modify Mod Source Code:**
   ```csharp
   // Add event logging to mod
   public void Feel(String key, int Priority = 0, ...)
   {
       // Existing OWO SDK call
       OWO.Send(toSend.WithPriority(Priority));
       
       // NEW: Log event to file
       LogEventToFile(new GameEvent {
           Type = "haptic",
           Name = key,
           Priority = Priority,
           Timestamp = DateTime.Now
       });
   }
   ```

2. **Create Event Logger Module:**
   - Location: `modern-third-space/src/modern_third_space/game_bridges/`
   - File: `melonloader_event_logger.py`
   - Function: Monitor log files, parse events, trigger haptics

3. **Electron Integration:**
   - Add file watcher in `web/electron/`
   - Parse log entries
   - Map events to haptic patterns
   - Call Python bridge via existing IPC

**Pros:**
- ✅ Minimal mod changes required
- ✅ Works with existing mods (if source available)
- ✅ No network dependencies
- ✅ Easy to debug

**Cons:**
- ❌ Requires mod source code access
- ❌ File I/O overhead
- ❌ Potential latency from file writes

---

### Strategy 2: HTTP/WebSocket Event Server (Recommended for Production)

**Approach:** Create a lightweight HTTP/WebSocket server in the mod that broadcasts events, Electron connects as client.

**Implementation Steps:**

1. **Add Event Server to Mod:**
   ```csharp
   public class EventServer
   {
       private HttpListener listener;
       
       public void Start(int port = 8765)
       {
           listener = new HttpListener();
           listener.Prefixes.Add($"http://localhost:{port}/");
           listener.Start();
           // Handle POST requests with event data
       }
       
       public void BroadcastEvent(string eventType, object data)
       {
           // Send JSON to connected clients
       }
   }
   ```

2. **Modify Mod to Use Event Server:**
   ```csharp
   public void Feel(String key, ...)
   {
       OWO.Send(toSend.WithPriority(Priority));
       
       // Broadcast to event server
       eventServer.BroadcastEvent("haptic", new {
           name = key,
           priority = Priority,
           timestamp = DateTime.Now
       });
   }
   ```

3. **Electron Event Client:**
   - Location: `web/electron/gameEventClient.cjs`
   - Connect to mod's HTTP/WebSocket server
   - Receive events in real-time
   - Map to haptic triggers

**Pros:**
- ✅ Real-time event streaming
- ✅ Low latency
- ✅ Can support multiple clients
- ✅ Standard HTTP/WebSocket protocols

**Cons:**
- ❌ Requires mod source code modification
- ❌ Network port management
- ❌ More complex implementation

---

### Strategy 3: Shared Memory / Named Pipes (Windows) / Unix Sockets (Linux/Mac)

**Approach:** Use inter-process communication (IPC) for low-latency event passing.

**Implementation Steps:**

1. **Mod Side (C#):**
   ```csharp
   using System.IO.Pipes;
   
   public class NamedPipeEventSender
   {
       private NamedPipeClientStream pipe;
       
       public void SendEvent(string eventType, object data)
       {
           // Write to named pipe
           var json = JsonConvert.SerializeObject(data);
           pipe.Write(Encoding.UTF8.GetBytes(json));
       }
   }
   ```

2. **Electron Side (Node.js):**
   ```javascript
   const net = require('net');
   
   const client = net.createConnection('\\\\.\\pipe\\thirdspacevest_events', () => {
       console.log('Connected to game mod');
   });
   ```

**Pros:**
- ✅ Very low latency
- ✅ Efficient for high-frequency events
- ✅ No network overhead

**Cons:**
- ❌ Platform-specific (Windows named pipes, Unix sockets)
- ❌ More complex error handling
- ❌ Requires mod source modification

---

### Strategy 4: SDK Proxy/Wrapper (Advanced)

**Approach:** Create a proxy DLL that intercepts OWO/bHaptics SDK calls, forwards to both original SDK and our event system.

**Implementation Steps:**

1. **Create Proxy DLL:**
   - Intercept `OWO.Send()` calls
   - Forward to original OWO SDK
   - Also broadcast events to Electron

2. **Modify Mod to Use Proxy:**
   - Replace OWO.dll reference with proxy
   - No code changes needed in mod

**Pros:**
- ✅ Works with unmodified mods
- ✅ Transparent to mod code
- ✅ Can support multiple haptic systems

**Cons:**
- ❌ Complex DLL injection/proxy setup
- ❌ Platform-specific implementation
- ❌ Potential compatibility issues

---

### Strategy 5: MelonLoader Log Parsing (Fallback)

**Approach:** Parse MelonLoader's console/log output for event patterns.

**Implementation Steps:**

1. **Enable MelonLoader Logging:**
   - Configure MelonLoader to write detailed logs
   - Mods already use `MelonLogger.Msg()` for debugging

2. **Log Parser:**
   - Monitor `MelonLoader/Logs/` directory
   - Parse log entries for haptic event patterns
   - Extract event data from log messages

**Pros:**
- ✅ No mod modifications needed
- ✅ Works with any MelonLoader mod
- ✅ Easy to implement

**Cons:**
- ❌ Relies on log format consistency
- ❌ Higher latency (log file writes)
- ❌ Less reliable (log rotation, formatting changes)

---

## Recommended Implementation Plan

### Phase 1: Proof of Concept (Strategy 1 - File Logging)

1. **Create Event Logger Module:**
   ```
   modern-third-space/src/modern_third_space/game_bridges/
   ├── __init__.py
   ├── melonloader_bridge.py
   └── event_parser.py
   ```

2. **Modify OWO_SuperhotVR Mod:**
   - Add file logging to `OWOSkin.cs`
   - Log all `Feel()` and `FeelWithHand()` calls
   - Write to `Mods/owo/events.log`

3. **Electron Integration:**
   - Add file watcher in `web/electron/`
   - Parse log entries
   - Map events to Third Space Vest patterns

### Phase 2: Production Ready (Strategy 2 - HTTP Server)

1. **Create Event Server Library:**
   - Reusable C# library for MelonLoader mods
   - HTTP server with JSON API
   - WebSocket support for real-time streaming

2. **Update Mods:**
   - Integrate event server library
   - Broadcast all haptic events

3. **Electron Client:**
   - HTTP/WebSocket client
   - Event queue and processing
   - Automatic reconnection

### Phase 3: Advanced Features

1. **Event Mapping UI:**
   - Visual editor for mapping game events to haptic patterns
   - Save/load configurations per game

2. **Multi-Game Support:**
   - Game detection and auto-configuration
   - Per-game event profiles

3. **Performance Monitoring:**
   - Latency tracking
   - Event rate monitoring
   - Debug visualization

## Event Mapping Strategy

### Game Event → Haptic Pattern Mapping

Based on OWO_SuperhotVR mod analysis, common event types:

| Game Event | OWO Sensation | Third Space Vest Mapping |
|------------|---------------|-------------------------|
| Death | "Death" (Priority 4) | All cells, high intensity, long duration |
| Punch Hit | "Punch Hit" (Priority 2) | Hand-specific cells (left/right) |
| Pistol Recoil | "Pistol Recoil" (Priority 2) | Arm + chest cells, short burst |
| Shotgun Recoil | "Shotgun Recoil" (Priority 2) | All cells, high intensity |
| Bullet Parry | "Bullet Parry" (Priority 3) | Hand cells, medium intensity |
| Grab Object | "Grab Object" (Priority 2) | Hand-specific cells |
| Throw | "Throw" (Priority 2) | Hand cells, velocity-based intensity |

### Pattern Translation

```python
def map_owo_to_tsv(owo_event):
    """Convert OWO event to Third Space Vest pattern"""
    mapping = {
        "Death": {
            "cells": [0, 1, 2, 3, 4, 5, 6, 7],  # All cells
            "speed": 10,  # Max intensity
            "duration": 2000  # 2 seconds
        },
        "Punch Hit": {
            "cells": [0, 1] if owo_event.hand == "right" else [2, 3],
            "speed": 8,
            "duration": 200
        },
        # ... more mappings
    }
    return mapping.get(owo_event.name, default_pattern)
```

## Project Structure Recommendations

```
modern-third-space/src/modern_third_space/
├── game_bridges/
│   ├── __init__.py
│   ├── base_bridge.py          # Abstract base class
│   ├── melonloader_bridge.py   # MelonLoader-specific bridge
│   ├── event_parser.py          # Parse events from various sources
│   └── pattern_mapper.py        # Map game events to haptic patterns
│
web/electron/
├── gameEventClient.cjs          # HTTP/WebSocket client for mod events
├── fileWatcher.cjs              # File monitoring for log-based events
└── eventProcessor.cjs           # Process and route game events

misc-documentations/bhaptics-svg-24-nov/
└── [GameName]/
    ├── README.md
    ├── haptics_electron_python_bridge.md
    └── mod_integration/         # Mod source modifications if needed
        └── [ModName]/
            └── [ModifiedFiles].cs
```

## Testing Strategy

1. **Unit Tests:**
   - Event parsing logic
   - Pattern mapping
   - Event queue handling

2. **Integration Tests:**
   - End-to-end: Mod event → Electron → Python → Vest
   - Latency measurement
   - Error handling

3. **Manual Testing:**
   - In-game event triggering
   - Visual feedback verification
   - Performance profiling

## Future Considerations

1. **Mod Distribution:**
   - Fork popular mods with event logging
   - Create mod templates for new games
   - Community mod repository

2. **Cross-Platform:**
   - Windows: Named pipes
   - Linux/Mac: Unix sockets
   - Universal: HTTP/WebSocket

3. **Multi-Haptic Support:**
   - Support OWO, bHaptics, Third Space Vest simultaneously
   - Unified event API
   - Device abstraction layer

## References

- **MelonLoader:** https://melonwiki.xyz/
- **Harmony:** https://github.com/pardeike/Harmony
- **OWO SDK:** https://github.com/OWODevelopers
- **OWO_SuperhotVR Mod:** https://github.com/OWODevelopers/OWO_SuperhotVR
- **Project Architecture:** See `AI_ONBOARDING.md` and `README.md`

---

**Document Status:** Draft - Strategy definition  
**Last Updated:** Based on OWO_SuperhotVR v1.0.0 analysis  
**Next Steps:** Implement Phase 1 proof of concept

