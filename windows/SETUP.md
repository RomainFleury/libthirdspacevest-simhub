# Windows Setup Guide

## Quick Start (5 minutes)

### Step 1: Install Node.js

**Option A: Using Windows Store (Easiest)**
1. Open Microsoft Store
2. Search for "Node.js LTS"
3. Click Install

**Option B: Direct Download**
1. Go to https://nodejs.org/
2. Download the **LTS** version (green button)
3. Run the installer, click Next through all steps

### Step 2: Install the App

1. **Double-click** `install.bat` in this folder
2. Wait for it to finish (may take 2-3 minutes)
3. You'll see "✓ Setup complete!" when done

### Step 3: Run the App

1. **Double-click** `run.bat` in this folder
2. The app window will open automatically

---

## Troubleshooting

### "Node is not recognized"
- Restart your computer after installing Node.js
- Make sure you installed Node.js LTS from nodejs.org

### "yarn is not recognized"  
- Run `install.bat` again
- Or open Command Prompt and run: `corepack enable`

### The app window doesn't open
- Make sure you started the Python daemon first
- Check if port 5173 is free (close other dev tools)

### Install fails with permission error
- Right-click `install.bat` → "Run as administrator"

---

## Manual Installation (if scripts don't work)

Open Command Prompt (cmd) and run these commands:

```cmd
:: Enable Yarn
corepack enable

:: Go to web folder
cd path\to\libthirdspacevest-simhub\web

:: Install dependencies
yarn install

:: Run the app
yarn dev
```

---

## Requirements

- Windows 10 or 11
- Node.js 18+ (LTS recommended)
- ~500MB disk space for dependencies

