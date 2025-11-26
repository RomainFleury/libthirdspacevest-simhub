# Third Space Vest - SimHub Plugin

A SimHub plugin that provides haptic feedback for sim racing games using the Third Space Vest.

## Features

- 🏎️ **Braking feedback** - Feel deceleration G-forces on front cells
- 🚀 **Acceleration feedback** - Feel acceleration pushing you back
- 🔄 **Cornering G-forces** - Lateral forces on left/right cells
- 💥 **Impact detection** - Full vest activation on collision
- ⚙️ **Gear shift feedback** - Brief pulse on gear changes
- 🛞 **Surface rumble** - Per-wheel road texture feedback
- 🔧 **ABS/TC feedback** - Pulsing when systems activate
- ⚡ **Configurable intensity** - Per-effect intensity sliders

## Supported Games

Works with **90+ games** supported by SimHub, including:
- iRacing
- Assetto Corsa / Competizione
- F1 2020-2024
- Project Cars 1/2/3
- Forza Horizon/Motorsport
- BeamNG.drive
- Dirt Rally 1/2
- Gran Turismo 7 (with data bridge)
- And many more...

## Prerequisites

1. **SimHub** - [Download here](https://www.simhubdash.com/download-2/)
2. **Third Space Vest daemon** - Must be running on TCP port 5050
3. **Visual Studio 2019/2022** (for building)

## Installation

### Option 1: Pre-built DLL

1. Download `ThirdSpaceSimHub.dll` from releases
2. Copy to your SimHub installation folder:
   ```
   C:\Program Files (x86)\SimHub\ThirdSpaceSimHub.dll
   ```
3. Start SimHub - the plugin will be auto-detected

### Option 2: Build from Source

1. Open `ThirdSpaceSimHub.sln` in Visual Studio

2. Set the SimHub SDK path (choose one):
   
   **Option A**: Set environment variable:
   ```cmd
   setx SIMHUB_PATH "C:\Program Files (x86)\SimHub"
   ```
   
   **Option B**: Copy SDK DLLs to a `libs` folder and update `.csproj`:
   ```xml
   <Reference Include="GameReaderCommon">
     <HintPath>..\libs\GameReaderCommon.dll</HintPath>
   </Reference>
   <Reference Include="SimHub.Plugins">
     <HintPath>..\libs\SimHub.Plugins.dll</HintPath>
   </Reference>
   ```

3. Build the solution (Release mode)

4. Copy `bin\Release\ThirdSpaceSimHub.dll` to SimHub folder

## Usage

### Start the Daemon

Before using the plugin, start the Third Space Vest daemon:

```bash
cd modern-third-space/src
python3 -m modern_third_space.cli daemon start
```

### Configure in SimHub

1. Open SimHub
2. Go to **Additional Plugins** → **Third Space Vest**
3. Click **Connect** to connect to the daemon
4. Enable/disable effects as desired
5. Adjust intensity sliders

### Test Haptics

Click the **Test Haptics** button to trigger all cells and verify the connection.

## Vest Cell Layout

```
  FRONT          BACK
┌───┬───┐    ┌───┬───┐
│ 0 │ 1 │    │ 4 │ 5 │  Upper
├───┼───┤    ├───┼───┤
│ 2 │ 3 │    │ 6 │ 7 │  Lower
└───┴───┘    └───┴───┘
```

### Effect Mapping

| Effect | Cells | Description |
|--------|-------|-------------|
| Braking | 0,1,2,3 (front) | Deceleration pushes forward |
| Acceleration | 4,5,6,7 (back) | Acceleration pushes back |
| Left turn | 0,2,4,6 (left) | G-force pushes left |
| Right turn | 1,3,5,7 (right) | G-force pushes right |
| Impact | All 8 | Collision detected |
| Gear shift | 4,5 (back upper) | Brief pulse |
| ABS | 2,3 (front lower) | Pulsing |
| TC | 6,7 (back lower) | Pulsing |

## Settings

Settings are saved to:
```
%APPDATA%\SimHub\ThirdSpaceSettings.json
```

### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| DaemonHost | 127.0.0.1 | Daemon IP address |
| DaemonPort | 5050 | Daemon TCP port |
| AutoConnect | true | Connect on startup |
| EnableBraking | true | Enable braking feedback |
| EnableAcceleration | true | Enable acceleration feedback |
| EnableGForce | true | Enable cornering feedback |
| EnableGearShift | true | Enable gear shift feedback |
| EnableImpact | true | Enable collision feedback |
| EnableRumble | true | Enable surface rumble |
| EnableABS | true | Enable ABS feedback |
| EnableTC | true | Enable TC feedback |
| BrakingIntensity | 1.0 | Braking intensity (0-2) |
| AccelerationIntensity | 1.0 | Acceleration intensity |
| GForceIntensity | 1.0 | G-force intensity |
| ImpactIntensity | 1.0 | Impact intensity |
| RumbleIntensity | 0.5 | Surface rumble intensity |

## Troubleshooting

### Plugin not appearing in SimHub

- Ensure `ThirdSpaceSimHub.dll` is in the SimHub folder
- Check SimHub logs for errors
- Make sure .NET Framework 4.8 is installed

### Not connecting to daemon

- Verify daemon is running: `python3 -m modern_third_space.cli daemon status`
- Check firewall isn't blocking port 5050
- Try connecting manually with: `nc localhost 5050`

### No haptic feedback

- Check "Connected" status in plugin settings
- Ensure effects are enabled (checkboxes)
- Test with "Test Haptics" button
- Verify vest is selected in daemon (use Electron UI)

### Weak feedback

- Increase intensity sliders
- Check if game is providing telemetry (SimHub should show data)

## Development

### Project Structure

```
ThirdSpaceSimHub/
├── ThirdSpacePlugin.cs      # Main plugin (IPlugin, IDataPlugin)
├── DaemonClient.cs          # TCP client for daemon
├── TelemetryMapper.cs       # Telemetry → haptic mapping
├── HapticCommand.cs         # Command model
├── PluginSettings.cs        # Settings model
├── SettingsView.xaml        # WPF settings UI
└── SettingsView.xaml.cs     # Settings code-behind
```

### SimHub SDK

The plugin implements these SimHub interfaces:
- `IPlugin` - Lifecycle (Init, End)
- `IDataPlugin` - Telemetry updates (DataUpdate)
- `IWPFSettingsV2` - Settings UI

### Adding New Effects

1. Add telemetry reading in `ThirdSpacePlugin.DataUpdate()`
2. Add mapping logic in `TelemetryMapper.MapTelemetry()`
3. Add settings in `PluginSettings.cs`
4. Add UI controls in `SettingsView.xaml`

## License

MIT License - See project root LICENSE file.

## Credits

- [SimHub](https://www.simhubdash.com/) - Telemetry platform
- Third Space Vest daemon team

