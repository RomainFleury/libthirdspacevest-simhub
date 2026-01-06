# Windows Setup

Simple setup for running the Third Space Vest Debugger on Windows.

## Quick Start

### 1. Install Requirements

You need **Node.js** and **Python**:

| Software | How to Install |
|----------|----------------|
| **Node.js** | Download from [nodejs.org](https://nodejs.org/) (LTS version) |
| **Python** | Download from [python.org](https://www.python.org/downloads/) (3.11+) |

> **Important**: During Python installation, check "Add to PATH"

### 2. Install App Dependencies

**Double-click** `install.bat`

### 3. Run the App

**Double-click** `start-all.bat`

This opens two windows:
- **Daemon window** - The Python backend (keep open)
- **App window** - The debugger UI

---

## Scripts

| Script | What it does |
|--------|--------------|
| `install.bat` | Installs Node.js dependencies |
| `start-all.bat` | Starts daemon + app together |
| `run.bat` | Starts just the Electron app |
| `start-daemon.bat` | Starts just the Python daemon |
| `build-release.bat` | Builds a distributable installer (see below) |

---

## Building a Release

To create a standalone Windows installer that doesn't require Python or Node.js:

**Double-click** `build-release.bat`

This creates:
- `web/release/Third Space Vest Setup 1.0.0.exe` - Windows installer
- `web/release/Third Space Vest-1.0.0-portable.zip` - Portable version

See [BUILD-RELEASE.md](../BUILD-RELEASE.md) for detailed build instructions.

## Detailed Instructions

See [SETUP.md](./SETUP.md) for step-by-step instructions and troubleshooting.

---

## For Developers

The `advanced/` folder contains PowerShell scripts for development setups with nvm-windows:

- `setup-windows.ps1` - Full nvm-based setup
- `dev-windows.ps1` - Development with specific Node version
- `dev-env.ps1` - Environment helper
