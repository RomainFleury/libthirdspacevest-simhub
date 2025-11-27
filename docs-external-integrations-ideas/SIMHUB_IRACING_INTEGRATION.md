# SimHub / iRacing Integration

> **Status: ✅ IMPLEMENTED**
>
> The SimHub plugin has been implemented. See `simhub-plugin/` for the C# source code.

This document analyzes the integration options for connecting the Third Space Vest with SimHub (and by extension, iRacing and 90+ other sim racing games).

## Overview

**SimHub** is a universal sim racing telemetry platform that supports 90+ games including iRacing, Assetto Corsa, F1 series, Project Cars, etc. Rather than integrating with iRacing directly, **integrating with SimHub gives us access to ALL supported games**.

## Architecture Comparison

| Aspect               | bHaptics Plugin              | OWO Plugin           | Our Approach              |
| -------------------- | ---------------------------- | -------------------- | ------------------------- |
| **Language**         | C# (.NET)                    | C# (.NET)            | C# plugin → Python daemon |
| **Output**           | WebSocket to bHaptics Player | OWO SDK DLL          | TCP to vest daemon (5050) |
| **Telemetry Source** | SimHub `GameData`            | SimHub `GameData`    | SimHub `GameData`         |
| **UI**               | Full WPF config panel        | Simple connect panel | Config panel              |
| **Complexity**       | High (~400 lines)            | Medium (~100 lines)  | Medium                    |

## How SimHub Plugins Work

```
┌─────────────────────────────────────────────────────────────────┐
│                           SimHub                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Game Telemetry Reader (iRacing, AC, F1, etc.)          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  GameData object (updated every frame ~60Hz)             │   │
│  │  • SpeedKmh, MaxSpeedKmh                                 │   │
│  │  • Rpms, MaxRpm                                          │   │
│  │  • Brake, Throttle                                       │   │
│  │  • Gear (with change detection)                          │   │
│  │  • AccelerationSway, AccelerationSurge (G-forces)        │   │
│  │  • FeedbackData (wheel rumble, suspension)               │   │
│  │  • CarDamage1-4 (directional damage)                     │   │
│  │  • ABSActive, TCActive                                   │   │
│  │  • IsInPitLane, GamePaused                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼ IDataPlugin.DataUpdate()          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Our Plugin (ThirdSpaceSimHub.dll)                       │   │
│  │  • Maps telemetry → haptic effects                       │   │
│  │  • Sends commands to Python daemon                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ TCP (port 5050)
┌─────────────────────────────────────────────────────────────────┐
│                    Python Vest Daemon                           │
│                    └── Third Space Vest                         │
└─────────────────────────────────────────────────────────────────┘
```

## Available Telemetry Data

SimHub's `GameData.NewData` provides these key properties:

### Speed & Motion

| Property            | Type   | Description                        |
| ------------------- | ------ | ---------------------------------- |
| `SpeedKmh`          | double | Current speed in km/h              |
| `MaxSpeedKmh`       | double | Maximum speed reached              |
| `AccelerationSway`  | double | Lateral G-force (left/right)       |
| `AccelerationSurge` | double | Longitudinal G-force (accel/brake) |

### Engine & Transmission

| Property | Type   | Description                        |
| -------- | ------ | ---------------------------------- |
| `Rpms`   | int    | Current engine RPM                 |
| `MaxRpm` | int    | Max engine RPM                     |
| `Gear`   | string | Current gear ("N", "1", "2", etc.) |

### Controls

| Property    | Type   | Description            |
| ----------- | ------ | ---------------------- |
| `Brake`     | double | Brake input (0-100)    |
| `Throttle`  | double | Throttle input (0-100) |
| `ABSActive` | int    | ABS activation (0/1)   |
| `TCActive`  | int    | Traction control (0/1) |

### Feedback & Effects

| Property                               | Type     | Description              |
| -------------------------------------- | -------- | ------------------------ |
| `FeedbackData.FrontLeftWheelRumble`    | double   | Surface rumble per wheel |
| `FeedbackData.SuspensionVelocity[0-3]` | double[] | Suspension movement      |
| `CarDamage1-4`                         | double   | Damage per corner        |

### Game State

| Property      | Type | Description       |
| ------------- | ---- | ----------------- |
| `GameRunning` | bool | Game is active    |
| `GamePaused`  | bool | Game is paused    |
| `IsInPitLane` | int  | In pit lane (0/1) |

## Recommended Approach: Custom C# SimHub Plugin

We should create our own SimHub plugin because:

1. **Our vest uses a different protocol** - USB direct, not WebSocket to a player app
2. **We have our own daemon** - We already have the Python TCP daemon (port 5050)
3. **Different motor layout** - Our 8-cell vest layout differs from bHaptics
4. **Full control** - We can customize the effect mapping exactly as needed

### Plugin Structure

```
ThirdSpaceSimHub/
├── ThirdSpaceSimHub.cs        # Main plugin class (IPlugin, IDataPlugin)
├── ThirdSpaceSimHub.csproj    # .NET project file
├── DaemonClient.cs            # TCP client for vest daemon
├── TelemetryMapper.cs         # Map telemetry → haptic commands
├── SettingsView.xaml          # WPF settings UI
├── SettingsView.xaml.cs       # Settings code-behind
└── Properties/
    └── AssemblyInfo.cs
```

### Core Plugin Class (Skeleton)

```csharp
using GameReaderCommon;
using SimHub.Plugins;
using System.Windows.Media;

namespace ThirdSpaceSimHub
{
    [PluginDescription("Third Space Vest Integration")]
    [PluginAuthor("Third Space")]
    [PluginName("Third Space Vest")]
    public class ThirdSpacePlugin : IPlugin, IDataPlugin, IWPFSettingsV2
    {
        private DaemonClient _daemon;
        private TelemetryMapper _mapper;

        public PluginManager PluginManager { get; set; }
        public string LeftMenuTitle => "Third Space Vest";
        public ImageSource PictureIcon => /* vest icon */;

        public void Init(PluginManager pluginManager)
        {
            _daemon = new DaemonClient("127.0.0.1", 5050);
            _mapper = new TelemetryMapper();
            _daemon.Connect();
        }

        public void DataUpdate(PluginManager pluginManager, ref GameData data)
        {
            if (!data.GameRunning || data.GamePaused) return;

            // Map telemetry to haptic commands
            var commands = _mapper.MapTelemetry(data.NewData);

            // Send to daemon
            foreach (var cmd in commands)
            {
                _daemon.SendTrigger(cmd.Cell, cmd.Speed);
            }
        }

        public void End(PluginManager pluginManager)
        {
            _daemon?.Disconnect();
        }

        public Control GetWPFSettingsControl(PluginManager pluginManager)
        {
            return new SettingsView(this);
        }
    }
}
```

### TCP Client for Daemon

```csharp
using System.Net.Sockets;
using System.Text;
using Newtonsoft.Json;

public class DaemonClient
{
    private TcpClient _client;
    private NetworkStream _stream;
    private readonly string _host;
    private readonly int _port;

    public DaemonClient(string host, int port)
    {
        _host = host;
        _port = port;
    }

    public void Connect()
    {
        _client = new TcpClient(_host, _port);
        _stream = _client.GetStream();
    }

    public void SendTrigger(int cell, int speed)
    {
        var cmd = new { cmd = "trigger", cell, speed };
        var json = JsonConvert.SerializeObject(cmd) + "\n";
        var bytes = Encoding.UTF8.GetBytes(json);
        _stream.Write(bytes, 0, bytes.Length);
    }

    public void Disconnect()
    {
        _stream?.Close();
        _client?.Close();
    }
}
```

## Event-to-Haptic Mapping

### Priority Effects (Phase 1)

| Event            | Vest Cells       | Intensity                      | Notes                     |
| ---------------- | ---------------- | ------------------------------ | ------------------------- |
| **Braking**      | Front (0,1)      | Proportional to brake% × speed | Deceleration G-force feel |
| **Acceleration** | Back (4,5,6,7)   | Proportional to throttle × G   | Push-back feel            |
| **Impact**       | All 8            | Damage increase %              | Collision detection       |
| **Gear Shift**   | Back upper (4,5) | Fixed medium                   | Brief pulse on upshift    |

### Motion Effects (Phase 2)

| Event               | Vest Cells      | Intensity           | Notes            |
| ------------------- | --------------- | ------------------- | ---------------- |
| **Cornering Left**  | Left (0,2,4,6)  | G-force magnitude   | Lateral load     |
| **Cornering Right** | Right (1,3,5,7) | G-force magnitude   | Lateral load     |
| **Surface Rumble**  | Based on wheel  | Per-wheel intensity | Road texture     |
| **Slip/Drift**      | Directional     | Slip intensity      | Loss of traction |

### Advanced Effects (Phase 3)

| Event          | Vest Cells      | Intensity   | Notes              |
| -------------- | --------------- | ----------- | ------------------ |
| **ABS Active** | Front (0,1,2,3) | Pulsing     | Anti-lock engaged  |
| **TC Active**  | Back (4,5)      | Pulsing     | Traction control   |
| **Engine RPM** | Back (6,7)      | RPM ratio   | Engine vibration   |
| **Pit Lane**   | All             | Very subtle | Location awareness |

## Vest Cell Layout Reference

```
      FRONT                    BACK
  ┌─────┬─────┐          ┌─────┬─────┐
  │  2  │  5  │  Upper   │  1  │  6  │
  │ UL  │ UR  │          │ UL  │ UR  │
  ├─────┼─────┤          ├─────┼─────┤
  │  3  │  4  │  Lower   │  0  │  7  │
  │ LL  │ LR  │          │ LL  │ LR  │
  └─────┴─────┘          └─────┴─────┘
    L     R                L     R

Braking   → 2,5,3,4 (front cells)
Accel     → 1,6,0,7 (back cells)
Left turn → 2,3,1,0 (left side)
Right turn → 5,4,6,7 (right side)
```

> **Note**: Hardware cell indices from reverse engineering.
> See `docs-external-integrations-ideas/CELL_MAPPING_AUDIT.md` for details.

## Implementation Plan

### Phase 1: Core Plugin (2-3 days)

1. Create C# project with SimHub SDK references
2. Implement `IPlugin`, `IDataPlugin` interfaces
3. Create TCP client for daemon communication
4. Basic effect mapping (brake, accel, impact)
5. Test with iRacing/Assetto Corsacan yo

### Phase 2: Effect Refinement (1-2 days)

1. Add G-force lateral effects (cornering)
2. Add gear shift feedback
3. Tune intensity curves
4. Add ABS/TC pulsing effects

### Phase 3: UI & Polish (1-2 days)

1. Create WPF settings panel
2. Add intensity sliders per effect
3. Add enable/disable toggles
4. Save/load user preferences

### Phase 4: Daemon Integration (N/A)

~~1. Add `simhub_start`, `simhub_stop`, `simhub_status` daemon commands~~
~~2. Add Electron UI panel for SimHub~~
~~3. Status display showing SimHub connection~~

**Note**: This phase was deemed unnecessary because SimHub manages the plugin lifecycle:
- SimHub loads/unloads the plugin automatically
- The plugin connects to daemon when SimHub runs a supported game
- Unlike CS2/Alyx/SUPERHOT, we cannot control SimHub from our daemon
- A status panel would only show "connected: yes/no" with limited value

The integration works fully without daemon-side commands.

## Development Requirements

### Prerequisites

- **Visual Studio 2019/2022** with .NET Framework 4.8
- **SimHub** installed (to get SDK DLLs)
- **NuGet**: Newtonsoft.Json

### SimHub SDK Files (from SimHub installation)

```
C:\Program Files (x86)\SimHub\
├── GameReaderCommon.dll       # GameData types
├── SimHub.Plugins.dll         # Plugin interfaces
└── SimHub.Plugins.Styles.dll  # UI styles (optional)
```

### Build Output

```
ThirdSpaceSimHub.dll → C:\Program Files (x86)\SimHub\
```

## Alternative Approaches Considered

### ❌ Reuse bHaptics Plugin

- **Why not**: Uses WebSocket to bHaptics Player (proprietary)
- Their motor layout differs (Tactsuit has 40 motors)
- Would require reverse-engineering their protocol

### ❌ Reuse OWO Plugin

- **Why not**: Uses OWO SDK DLL (proprietary)
- OWO uses WiFi, we use USB
- Different muscle/motor concepts

### ❌ SimHub UDP Forwarding

- **Why not**: Would need to run additional process
- Less control over telemetry timing
- Extra latency

### ❌ SimHub ShakeIt Integration

- **Why not**: ShakeIt is for bass shakers/motors
- Different protocol and timing needs
- Not designed for wearable haptics

## Existing Resources

### In This Repository

- `misc-documentations/bhaptics-svg-24-nov/simhub-bhaptics/` - bHaptics plugin source
- `misc-documentations/bhaptics-svg-24-nov/iracing/OWOPlugin-SimHub-1.0.1/` - OWO plugin source

### External

- [SimHub GitHub Wiki](https://github.com/zegreatclan/SimHub/wiki)
- [SimHub Plugin Development](https://github.com/zegreatclan/simhub-plugins)
- [SimHub Download](https://www.simhubdash.com/download-2/)

## Supported Games (via SimHub)

With SimHub integration, we automatically support 90+ games:

**Popular Titles:**

- iRacing
- Assetto Corsa / Competizione
- F1 2020-2024
- Project Cars 1/2/3
- Forza Horizon/Motorsport
- Gran Turismo 7
- BeamNG.drive
- Dirt Rally 1/2
- WRC series
- Euro/American Truck Simulator
- And many more...

## Questions to Resolve

1. **Do we need a SimHub UI panel?** Or just "install DLL and it works"?
2. **Should effects be configurable?** Per-effect enable/intensity settings?
3. **Should we add SimHub commands to daemon?** `simhub_status` etc?
4. **Windows-only or cross-platform?** SimHub is Windows-only anyway

## Next Steps

1. **Set up C# development environment** with Visual Studio
2. **Create minimal plugin** that connects to daemon
3. **Test with iRacing** in practice session
4. **Iterate on effect mapping** based on feel
5. **Add configuration UI** if needed

---

## Status

**Current**: ✅ **IMPLEMENTED**

The SimHub plugin is complete and located in `simhub-plugin/`:

- ✅ Phase 1: Core Plugin - `ThirdSpacePlugin.cs`
- ✅ Phase 2: Effect Mapping - `TelemetryMapper.cs`
- ✅ Phase 3: Settings UI - `SettingsView.xaml`
- ⬚ Phase 4: Daemon Integration - N/A (SimHub manages plugin lifecycle, not needed)

### Building the Plugin

1. Open `simhub-plugin/ThirdSpaceSimHub.sln` in Visual Studio
2. Set `SIMHUB_PATH` environment variable to your SimHub installation
3. Build in Release mode
4. Copy `ThirdSpaceSimHub.dll` to SimHub folder

See `simhub-plugin/README.md` for detailed instructions.
