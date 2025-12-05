# Third Space Vest - Among Us Integration

BepInEx plugin that adds haptic feedback to Among Us using the Third Space Vest.

## Features

Feel the game like never before with haptic feedback for:

| Event | Description |
|-------|-------------|
| **Being Killed** | Full-body dramatic feedback when impostor kills you |
| **Ejection** | Falling sensation when voted into space |
| **Execute Kill** | Visceral feedback when you kill as impostor |
| **Emergency Meeting** | Alert pulse when meeting starts |
| **Vote Cast** | Confirmation when you cast your vote |
| **Body Reported** | Shock/alarm when you find a body |
| **Task Complete** | Subtle positive feedback |
| **Vent Enter/Exit** | Whoosh sensation |
| **Sabotages** | Different patterns for reactor, oxygen, lights, comms |
| **Game Start/End** | Match beginning and victory/defeat |

## Requirements

- Among Us (Steam or Epic Games)
- BepInEx 6.x for IL2CPP
- Third Space Vest
- Python 3.8+ (for the vest daemon)

## Installation

### 1. Install BepInEx

Download BepInEx 6.x Unity IL2CPP from:
https://builds.bepinex.dev/projects/bepinex_be

Extract to your Among Us game folder:
```
Among Us/
├── BepInEx/
│   ├── core/
│   ├── plugins/
│   └── ...
├── Among Us.exe
└── ...
```

Run the game once to generate BepInEx folders and IL2CPP interop assemblies.

### 2. Install This Plugin

Copy `ThirdSpace_AmongUs.dll` to:
```
Among Us/BepInEx/plugins/ThirdSpace_AmongUs.dll
```

### 3. Start the Vest Daemon

Open a terminal and run:
```bash
python -m modern_third_space.cli daemon start
```

### 4. Play Among Us

Launch the game - the mod will automatically connect to the daemon.

## Configuration

### Custom Daemon Address

If the daemon runs on a different machine, create:
`Among Us/BepInEx/config/ThirdSpace.cfg`

```ini
[Network]
Host = 192.168.1.100
Port = 5050
```

## Building from Source

### Prerequisites

- .NET 6.0 SDK
- Among Us with BepInEx installed (for reference DLLs)

### Build

```powershell
cd amongus-mod
.\build.ps1
```

Or with Visual Studio:
1. Open `ThirdSpace_AmongUs.sln`
2. Build → Build Solution

The DLL will be in `bin/Debug/` or `bin/Release/`.

## Troubleshooting

### Mod not loading?
- Check BepInEx is installed correctly
- Look at `BepInEx/LogOutput.log` for errors
- Make sure Among Us has been run at least once with BepInEx

### No haptic feedback?
- Ensure the daemon is running: `python -m modern_third_space.cli daemon status`
- Check the BepInEx log for `[ThirdSpace]` messages
- Verify the vest is connected in the Electron UI

### Connection issues?
- Default daemon port is 5050
- Check firewall isn't blocking localhost:5050
- Create config file if using different host/port

## Development

The plugin uses Harmony to patch Among Us game methods. Key patches:

| Patch | Class.Method | Event |
|-------|--------------|-------|
| MurderPlayer | `PlayerControl.MurderPlayer` | Kill/Death |
| Ejection | `ExileController.Begin` | Voted out |
| MeetingStart | `MeetingHud.Start` | Emergency meeting |
| CastVote | `MeetingHud.CastVote` | Voting |
| ReportBody | `PlayerControl.ReportDeadBody` | Found body |
| TaskComplete | `PlayerTask.Complete` | Task done |
| VentUse | `Vent.Use` | Enter/exit vent |
| Sabotage | `ShipStatus.RepairSystem` | Sabotages |
| GameStart | `ShipStatus.Begin` | Match start |
| GameEnd | `EndGameManager.SetEverythingUp` | Win/lose |

## License

MIT License - See LICENSE file
