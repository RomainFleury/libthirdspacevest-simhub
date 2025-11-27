# Third Space Vest - GTA V Integration

Script Hook V .NET mod for Grand Theft Auto V that provides haptic feedback using the Third Space Vest.

## Features (Phase 1)

- ✅ **Player Damage** - Directional haptic feedback based on damage angle
- ✅ **Player Death** - Full vest pulse on all cells
- 🔜 Weapon fire recoil (optional)

## Prerequisites

1. **GTA V** (Steam/Epic/Rockstar Launcher)
2. **Script Hook V** (C++ core)
   - Download from: [dev-c.com](http://www.dev-c.com/gtav/scripthookv/)
   - Extract `ScriptHookV.dll` to `GTA V/` folder
3. **Script Hook V .NET**
   - Download from: [GitHub: crosire/scripthookvdotnet](https://github.com/crosire/scripthookvdotnet)
   - Extract `ScriptHookVDotNet.dll` and `ScriptHookVDotNet.asi` to `GTA V/` folder
4. **Third Space Vest Daemon** (running on port 5050)
   - Start with: `python3 -m modern_third_space.cli daemon start`

## Building

### Option 1: Visual Studio

1. Open `ThirdSpaceGTAV.sln` in Visual Studio 2019/2022
2. Copy Script Hook V .NET DLLs to `libs/` folder:
   - `ScriptHookVDotNet.dll`
   - `GTA.dll` (from Script Hook V .NET)
3. Build in Release mode
4. Copy `bin/Release/ThirdSpaceGTAV.dll` to `GTA V/scripts/` folder

### Option 2: Command Line

```powershell
# Copy SDK DLLs to libs folder first
mkdir libs
copy "C:\path\to\ScriptHookVDotNet.dll" libs\
copy "C:\path\to\GTA.dll" libs\

# Build
msbuild ThirdSpaceGTAV.sln /p:Configuration=Release
```

## Installation

1. Build the mod (see above)
2. Copy `ThirdSpaceGTAV.dll` to `GTA V/scripts/` folder
3. Start the Python daemon:
   ```bash
   python3 -m modern_third_space.cli daemon start
   ```
4. Launch GTA V
5. The mod will automatically connect to the daemon on startup

## Usage

Once installed and running:

- **Player takes damage**: Haptic feedback triggers on the side where damage came from
- **Player dies**: Full vest pulse on all cells
- **Connection status**: Check in-game notifications (green = connected, red = disconnected)

## Troubleshooting

### Mod not loading

- Ensure Script Hook V and Script Hook V .NET are installed correctly
- Check `GTA V/scripts/` folder exists
- Verify DLL is in the correct location

### Not connecting to daemon

- Verify daemon is running: `python3 -m modern_third_space.cli daemon status`
- Check firewall isn't blocking port 5050
- Look for in-game notifications showing connection status

### No haptic feedback

- Check daemon is connected (green notification in-game)
- Verify vest device is selected in daemon (use Electron UI)
- Test with "Test Haptics" in Electron UI

## Development

### Project Structure

```
ThirdSpaceGTAV/
├── ThirdSpaceGTAV.cs          # Main mod entry point
├── DaemonClient.cs            # TCP client for daemon
├── EventHooks.cs              # Game event detection
├── HapticMapper.cs            # Event → haptic mapping
└── Properties/
    └── AssemblyInfo.cs        # Assembly metadata
```

### Adding New Events

1. Add event detection in `EventHooks.cs`
2. Add haptic mapping in `HapticMapper.cs` or `gtav_manager.py`
3. Send event via `_daemon.SendEvent()` in `EventHooks.cs`

## License

MIT License - See project root LICENSE file.

