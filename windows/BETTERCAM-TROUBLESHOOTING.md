# BetterCam Troubleshooting Guide

## What is RDP?

**RDP (Remote Desktop Protocol)** is Microsoft's protocol for connecting to a Windows computer remotely. When you connect via Remote Desktop, your session type changes from "Console" to "RDP-TCP".

**Why BetterCam doesn't work over RDP:**
- BetterCam uses Windows **Desktop Duplication API (DXGI)**, which requires direct access to the graphics adapter
- RDP uses a virtual graphics adapter that doesn't support Desktop Duplication API
- This is a Windows limitation, not a BetterCam bug

**How to check if you're on RDP:**
```batch
echo %SESSIONNAME%
```
- If it shows `Console` → You're running locally (BetterCam should work)
- If it shows `RDP-TCP` or `RDP` → You're on Remote Desktop (BetterCam won't work)

## Windows Capture Restrictions

Windows has several security/performance features that can block screen capture:

1. **Desktop Duplication API Requirements:**
   - Requires a DirectX 11.1+ compatible graphics adapter
   - Must have hardware acceleration enabled
   - Cannot work over Remote Desktop (RDP)
   - Cannot work in some virtualized environments

2. **Graphics Driver Issues:**
   - Outdated or incompatible graphics drivers
   - Missing DirectX runtime components
   - Graphics adapter not properly initialized

3. **Windows Security Features:**
   - Some security software blocks screen capture APIs
   - Windows Defender or other antivirus may interfere
   - Group Policy restrictions

4. **Display Configuration:**
   - Multiple monitors with different refresh rates
   - Display scaling issues
   - Graphics adapter switching (e.g., laptop with integrated + discrete GPU)

## Troubleshooting Steps

### 1. Check if you're on RDP
```batch
echo %SESSIONNAME%
```
If it's not `Console`, you need to run locally.

### 2. Test BetterCam directly
```batch
py -3.14 -c "import bettercam; cap=bettercam.create(output_idx=0, output_color='BGRA'); frame=cap.grab(); print('SUCCESS' if frame is not None else 'FAILED')"
```

### 3. Update Graphics Drivers
- Go to your GPU manufacturer's website (NVIDIA, AMD, Intel)
- Download and install the latest drivers
- Restart your computer

### 4. Check DirectX
- Press `Win + R`, type `dxdiag`, press Enter
- Check the "Display" tab for DirectX version (should be 11.1+)

### 5. Run as Administrator
Sometimes Windows requires elevated privileges for screen capture:
- Right-click Command Prompt → "Run as administrator"
- Run the validation script again

### 6. Check Windows Display Settings
- Right-click desktop → Display settings
- Make sure your display is properly configured
- Try disabling/enabling hardware acceleration in your browser (if testing)

## Fallback: Using MSS Instead

If BetterCam doesn't work, the system will automatically fall back to `mss` (GDI-based capture), which:
- Works over RDP
- Works in virtualized environments
- Is slower but more compatible
- Doesn't require DirectX 11.1+

The Screen Health feature will still work, just with lower performance.

