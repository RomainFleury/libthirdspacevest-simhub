# Fixing Corepack Permission Errors

## Problem
When running `corepack enable`, you get:
```
EPERM: operation not permitted, open 'C:\Program Files\nodejs\pnpm'
```

This happens because Node.js is installed in `C:\Program Files\nodejs\` which requires administrator privileges to modify.

## Solutions

### Option 1: Run as Administrator (Quick Fix)
1. Close your current terminal
2. Right-click on PowerShell or Command Prompt
3. Select "Run as administrator"
4. Navigate to your project: `cd C:\WORK\libthirdspacevest-simhub`
5. Run: `corepack enable`

### Option 2: Use User-Level Node.js Installation (Recommended)
Install Node.js in your user directory instead of Program Files:

1. Download Node.js installer from https://nodejs.org/
2. During installation, choose "Install for current user only" (not "Install for all users")
3. This installs Node.js to `%APPDATA%\npm` or `%LOCALAPPDATA%\Programs\nodejs\`
4. Restart your terminal
5. Run: `corepack enable`

### Option 3: Fix Permissions on Node.js Directory
1. Open File Explorer
2. Navigate to `C:\Program Files\nodejs\`
3. Right-click the folder → Properties → Security tab
4. Click "Edit" → Add your user account
5. Grant "Full control" or at least "Modify" permissions
6. Click OK and apply to all subfolders
7. Restart your terminal
8. Run: `corepack enable`

### Option 4: Use nvm-windows (Alternative)
If you use nvm-windows to manage Node.js versions:
1. Install nvm-windows: https://github.com/coreybutler/nvm-windows
2. Install Node.js via nvm: `nvm install <version>`
3. nvm installs to your user directory, avoiding permission issues
4. Run: `corepack enable`

## Verify Fix
After applying one of the solutions:
```powershell
corepack enable
yarn --version
```

Should show: `4.11.0` (or the version from package.json)

