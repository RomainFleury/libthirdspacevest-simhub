# How to Run the Development Environment on Windows

## Quick Start

**From the project root directory**, open PowerShell and run:

```powershell
.\windows\dev-windows.ps1
```

That's it! The script will:
1. Set up Node.js v25.2.1
2. Enable Yarn
3. Install dependencies (if needed)
4. Start the dev server

## Step-by-Step Instructions

### Option 1: Using the Script (Easiest)

1. **Open PowerShell**
   - Press `Win + X` and select "Windows PowerShell" or "Terminal"
   - Or search for "PowerShell" in the Start menu

2. **Navigate to the project directory**
   ```powershell
   cd path\to\libthirdspacevest-simhub
   ```
   (Replace with your actual project path)

3. **Run the script**
   ```powershell
   .\windows\dev-windows.ps1
   ```

4. **If you get an execution policy error**, run this first:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Then try running the script again.

### Option 2: Manual Setup (If script doesn't work)

1. **Open PowerShell** and navigate to the project:
   ```powershell
   cd path\to\libthirdspacevest-simhub\web
   ```
   (Replace with your actual project path)

2. **Set up nvm environment**:
   ```powershell
   # Find nvm installation (usually in AppData\Local\nvm)
   $nvmPath = "$env:LOCALAPPDATA\nvm"
   if (-not (Test-Path $nvmPath)) {
       $nvmPath = "$env:APPDATA\nvm"
   }
   $env:NVM_HOME = $nvmPath
   $env:NVM_SYMLINK = [System.Environment]::GetEnvironmentVariable('NVM_SYMLINK', 'User')
   if (-not $env:NVM_SYMLINK) {
       $env:NVM_SYMLINK = "C:\Program Files\nodejs"
   }
   cd $nvmPath
   .\nvm.exe use 25.2.1
   cd $PSScriptRoot\..\web
   $env:PATH = "$env:NVM_SYMLINK;" + $env:PATH
   ```

3. **Enable Corepack and run dev**:
   ```powershell
   corepack enable
   yarn dev
   ```

## What to Expect

When the dev server starts, you should see:
- Vite dev server starting on `http://localhost:5173`
- Electron window opening automatically
- The debugger UI should load in the Electron window

## Stopping the Dev Server

Press `Ctrl + C` in the PowerShell window to stop the server.

## Troubleshooting

**"Script cannot be loaded because running scripts is disabled"**
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**"Node.js is not available"**
- Make sure nvm-windows is installed
- Try running `.\windows\setup-windows.ps1` first

**"Yarn is not available"**
- Run: `corepack enable`

**Port 5173 already in use**
- Close any other dev servers running on that port
- Or kill the process: `Get-Process -Name node | Stop-Process`

