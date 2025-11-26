# SimHub Plugin - Windows Finalization Guide

> **For AI Agents**: This document guides you through finalizing the Third Space Vest SimHub plugin on a Windows machine.

## Context

The SimHub plugin C# code has been written but needs to be:
1. Built with the actual SimHub SDK
2. Tested with SimHub
3. Potentially fixed for any compile errors
4. Packaged for distribution

## Prerequisites Check

Before starting, verify these are installed:

```powershell
# Check Visual Studio (need 2019 or 2022 with .NET desktop workload)
# Check SimHub is installed
Test-Path "C:\Program Files (x86)\SimHub\SimHub.exe"

# Check .NET Framework 4.8
# Should be present on Windows 10/11
```

## Step 1: Set Up SimHub SDK References

The project references SimHub DLLs that need to be available. Choose ONE option:

### Option A: Environment Variable (Recommended)

```powershell
# Set SIMHUB_PATH to your SimHub installation
[Environment]::SetEnvironmentVariable("SIMHUB_PATH", "C:\Program Files (x86)\SimHub", "User")

# Restart your terminal/IDE after setting this
```

### Option B: Copy SDK DLLs Locally

```powershell
# Create libs folder and copy required DLLs
mkdir simhub-plugin\libs

# Copy from SimHub installation
Copy-Item "C:\Program Files (x86)\SimHub\GameReaderCommon.dll" "simhub-plugin\libs\"
Copy-Item "C:\Program Files (x86)\SimHub\SimHub.Plugins.dll" "simhub-plugin\libs\"
```

Then update `ThirdSpaceSimHub.csproj` to use local paths:

```xml
<Reference Include="GameReaderCommon">
  <HintPath>..\libs\GameReaderCommon.dll</HintPath>
  <Private>False</Private>
</Reference>
<Reference Include="SimHub.Plugins">
  <HintPath>..\libs\SimHub.Plugins.dll</HintPath>
  <Private>False</Private>
</Reference>
```

## Step 2: Restore NuGet Packages

```powershell
cd simhub-plugin
nuget restore ThirdSpaceSimHub.sln
# OR use Visual Studio's automatic restore
```

## Step 3: Build the Plugin

### Via Command Line

```powershell
cd simhub-plugin
msbuild ThirdSpaceSimHub.sln /p:Configuration=Release
```

### Via Visual Studio

1. Open `simhub-plugin/ThirdSpaceSimHub.sln`
2. Set configuration to **Release**
3. Build → Build Solution (Ctrl+Shift+B)

### Expected Output

```
simhub-plugin\ThirdSpaceSimHub\bin\Release\ThirdSpaceSimHub.dll
```

## Step 4: Fix Any Compile Errors

Common issues and fixes:

### Missing SimHub Types

If you see errors about missing `GameReaderCommon` or `SimHub.Plugins` types:
- Verify Step 1 was completed correctly
- Check the DLL paths in `.csproj`

### Nullable Reference Warnings

The code uses nullable types. If there are warnings, they can be ignored or add to `.csproj`:

```xml
<PropertyGroup>
  <Nullable>disable</Nullable>
</PropertyGroup>
```

### Missing WPF References

If XAML compilation fails, ensure these references exist in `.csproj`:

```xml
<Reference Include="PresentationCore" />
<Reference Include="PresentationFramework" />
<Reference Include="WindowsBase" />
<Reference Include="System.Xaml" />
```

## Step 5: Install Plugin in SimHub

```powershell
# Copy the built DLL to SimHub
Copy-Item "simhub-plugin\ThirdSpaceSimHub\bin\Release\ThirdSpaceSimHub.dll" "C:\Program Files (x86)\SimHub\"

# Restart SimHub
```

## Step 6: Test the Plugin

### 6.1 Start the Python Daemon

In a separate terminal:

```powershell
cd modern-third-space\src
python -m modern_third_space.cli daemon start
```

### 6.2 Verify in SimHub

1. Open SimHub
2. Go to **Settings** → **Plugins**
3. Find "Third Space Vest" and enable it
4. Go to **Additional Plugins** → **Third Space Vest**
5. Click **Connect** to connect to daemon
6. Click **Test Haptics** to verify

### 6.3 Test with a Game

1. Start any SimHub-supported game (iRacing, Assetto Corsa, etc.)
2. Drive and verify haptic feedback:
   - Hard braking → front cells
   - Hard acceleration → back cells
   - Cornering → side cells
   - Collision → all cells

## Step 7: Create Release Package (Optional)

```powershell
# Create release folder
mkdir release
Copy-Item "simhub-plugin\ThirdSpaceSimHub\bin\Release\ThirdSpaceSimHub.dll" "release\"
Copy-Item "simhub-plugin\README.md" "release\"

# Create ZIP
Compress-Archive -Path "release\*" -DestinationPath "ThirdSpaceSimHub-v1.0.0.zip"
```

## Troubleshooting

### Plugin Not Appearing in SimHub

- Check SimHub logs: `%APPDATA%\SimHub\Logs\`
- Ensure DLL is directly in SimHub folder (not a subfolder)
- Restart SimHub completely

### Not Connecting to Daemon

- Verify daemon is running: `python -m modern_third_space.cli daemon status`
- Check firewall isn't blocking port 5050
- Try connecting with: `Test-NetConnection -ComputerName localhost -Port 5050`

### No Haptic Feedback

- Check "Connected" status in plugin settings
- Verify vest is selected in the Electron UI or daemon
- Try the "Test Haptics" button
- Check SimHub is receiving telemetry from the game

## Files Reference

```
simhub-plugin/
├── ThirdSpaceSimHub.sln           # Solution file
├── README.md                       # User documentation
├── FINALIZE_ON_WINDOWS.md         # This file
└── ThirdSpaceSimHub/
    ├── ThirdSpaceSimHub.csproj    # Project file
    ├── packages.config             # NuGet packages
    ├── ThirdSpacePlugin.cs         # Main plugin entry point
    ├── DaemonClient.cs             # TCP connection to daemon
    ├── TelemetryMapper.cs          # Telemetry → haptic mapping
    ├── HapticCommand.cs            # Command data model
    ├── PluginSettings.cs           # Settings data model
    ├── SettingsView.xaml           # WPF settings UI
    ├── SettingsView.xaml.cs        # Settings code-behind
    └── Properties/
        └── AssemblyInfo.cs         # Assembly metadata
```

## Success Criteria

The plugin is finalized when:

- [ ] Project builds without errors
- [ ] DLL is installed in SimHub folder
- [ ] Plugin appears in SimHub's plugin list
- [ ] Plugin connects to Python daemon successfully
- [ ] "Test Haptics" triggers all vest cells
- [ ] Haptic feedback works during gameplay

## Next Steps After Finalization

1. **Add vest icon**: Create `vest-icon.png` (32x32) and add to project resources
2. **Test with multiple games**: Verify telemetry mapping works across different titles
3. **Fine-tune mappings**: Adjust thresholds in `TelemetryMapper.cs` based on feel
4. **Add more effects**: Engine RPM vibration, slip/drift detection, etc.

