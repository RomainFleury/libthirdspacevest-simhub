# Windows Setup Guide

## Quick Start (5 minutes)

### Step 1: Install Node.js and Python

**Node.js:**
- **Windows Store (Easiest):** Search "Node.js LTS" in Microsoft Store, click Install
- **Direct Download:** Go to https://nodejs.org/, download the LTS version

**Python 3.14+:**
1. Go to https://www.python.org/downloads/
2. Download Python 3.14 or newer
3. Run installer, **CHECK "Add to PATH"** ⚠️
4. Restart your terminal after installation

### Step 2: Check Setup & Install Dependencies

1. **Double-click** `check-setup.bat` in this folder
2. Follow the prompts (it will ask if you want to save your Python configuration)
3. Wait for all checks to complete
4. You'll see a summary showing passed/failed checks

### Step 3: Run the App

1. **Double-click** `start-all.bat` in this folder
2. Two windows will open: the daemon and the app UI

---

## Troubleshooting

### "Node is not recognized"
- Restart your computer after installing Node.js
- Make sure you installed Node.js LTS from nodejs.org

### "yarn is not recognized"  
- Run `check-setup.bat` again
- Or open Command Prompt and run: `corepack enable`

### The app window doesn't open
- Make sure you started the Python daemon first
- Check if port 5173 is free (close other dev tools)

### Install fails with permission error
- Right-click `check-setup.bat` → "Run as administrator"

### Wrong Python version being used
- Run `check-setup.bat` to configure the correct Python
- Or manually edit `windows\.env.bat` to set `TSV_PYTHON=py -3.14`

---

## Manual Installation (if scripts don't work)

Open Command Prompt (cmd) and run these commands:

```cmd
:: Set Python version (optional but recommended)
set TSV_PYTHON=py -3.14

:: Install Python package
cd path\to\libthirdspacevest-simhub\modern-third-space
pip install -e .
pip install libusb bettercam

:: Enable Yarn
corepack enable

:: Go to web folder
cd ..\web

:: Install dependencies
yarn install

:: Run the app
yarn dev
```

---

## Requirements

- Windows 10 or 11
- Python 3.14+ (Add to PATH during install)
- Node.js 18+ (LTS recommended)
- ~500MB disk space for dependencies

