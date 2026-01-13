# Daemon Launch Methods Audit

This document audits all the different ways the Python daemon can be started and provides recommendations for improving reliability and consistency.

## Executive Summary

There are **two main approaches** to starting the daemon:
1. **Windows batch scripts** - Use sophisticated Python version detection (TSV_PYTHON → py -3.11 → python)
2. **JavaScript/Electron code** - Uses hardcoded `python` or `python3` with no version pinning

**The JavaScript approach is the one used in production builds**, but it lacks the Python version detection logic that makes the batch scripts reliable.

---

## Current Daemon Launch Methods

### 1. Windows Batch Scripts (`/windows/`)

| Script | Purpose | Python Resolution |
|--------|---------|-------------------|
| `start-daemon.bat` | Standalone daemon start | TSV_PYTHON → py -3.11 → python/python3 |
| `start-daemon-custom.bat` | Debug daemon start (with extra flags) | TSV_PYTHON → py -3.11 → python |
| `start-all.bat` | Start daemon + UI together | TSV_PYTHON → py -3.11 → python/python3 |
| `start-ui.bat` | Start UI only (daemon via Electron) | Shows TSV_PYTHON info |
| `run.bat` | Start UI only | N/A |
| `build-release.bat` | Build production installer | TSV_PYTHON → py -3.11 → python/python3 |

**Python Resolution Logic (Batch Scripts):**
```batch
:: 1. Check TSV_PYTHON environment variable
if defined TSV_PYTHON (
    set "PYTHON_CMD=%TSV_PYTHON%"
) else (
    :: 2. Try py launcher with Python 3.11
    where py >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        py -3.11 -c "import sys" >nul 2>&1
        if %ERRORLEVEL% equ 0 set "PYTHON_CMD=py -3.11"
    )
    :: 3. Fall back to python/python3
    if not defined PYTHON_CMD set "PYTHON_CMD=python"
)
```

**Pros:**
- ✅ Supports `TSV_PYTHON` override via `.env.bat`
- ✅ Uses `py -3.11` launcher for version pinning
- ✅ Clear fallback chain
- ✅ Shows Python version to user

**Cons:**
- ❌ Windows-only
- ❌ Not used in production builds
- ❌ User must manually start daemon first (unless using `start-all.bat`)

---

### 2. JavaScript/Electron (`/web/electron/`)

#### `daemonBridge.cjs` (Primary - Used in Production)

This is the **main daemon management code** used by the Electron app.

**Development Mode:**
```javascript
// In _startDaemon() method
const pythonCmd = process.platform === "win32" ? "python" : "python3";
cmd = pythonCmd;
args = ["-u", "-m", "modern_third_space.cli", "daemon", "--port", "5050", "start", ...];
options = {
  cwd: daemonInfo.path,
  env: { ...process.env, PYTHONPATH: daemonInfo.path },
};
```

**Production Mode:**
```javascript
// Uses bundled executable
const bundledDaemon = path.join(
  process.resourcesPath,
  "daemon",
  process.platform === "win32" ? "vest-daemon.exe" : "vest-daemon"
);
```

**Pros:**
- ✅ Auto-starts daemon if not running
- ✅ Production uses bundled exe (reliable)
- ✅ Handles both development and production
- ✅ TCP-based detection of daemon readiness

**Cons:**
- ❌ Development mode uses hardcoded `python` (Windows) or `python3`
- ❌ No support for TSV_PYTHON
- ❌ No py launcher support
- ❌ May pick wrong Python version if multiple installed

#### `pythonBridge.cjs` (Legacy/Alternative)

Runs individual Python CLI commands without daemon:

```javascript
const pythonProcess = spawn("python3", pythonArgs, { ... });
```

**Status:** Legacy code, not actively used for daemon management.

#### `scripts/runPythonCommand.mjs`

Helper script for running Python CLI commands:

```javascript
const pythonProcess = spawn("python3", pythonArgs, { ... });
```

Used by:
- `stop-daemon.mjs`
- `check-python-setup.mjs`

---

## Comparison Matrix

| Feature | Batch Scripts | daemonBridge.cjs | pythonBridge.cjs |
|---------|---------------|------------------|------------------|
| TSV_PYTHON support | ✅ | ❌ | ❌ |
| py -3.11 launcher | ✅ | ❌ | ❌ |
| Version pinning | ✅ 3.11 | ❌ | ❌ |
| Auto-start daemon | ❌ (manual) | ✅ | N/A |
| Used in production | ❌ | ✅ (bundled exe) | ❌ |
| Cross-platform | ❌ | ✅ | ✅ |
| Debug flags | ✅ (custom.bat) | ✅ (hardcoded) | ❌ |

---

## Issues Identified

### Issue 1: Python Version Mismatch in Development

When a developer has multiple Python versions installed (e.g., 3.10, 3.11, 3.12):

- **Batch scripts** correctly use `py -3.11` or TSV_PYTHON
- **JavaScript code** uses `python` or `python3` which may resolve to a different version

This can cause:
- Import errors (different package installations per version)
- Subtle behavior differences between development and production
- "Works on my machine" issues

### Issue 2: Inconsistent Environment Configuration

The batch scripts respect `.env.bat` for TSV_PYTHON, but the JavaScript code doesn't read this file:

```batch
# windows/.env.bat.example
set TSV_PYTHON=py -3.11
```

The JavaScript code has no equivalent mechanism.

### Issue 3: Development vs Production Disparity

- **Production:** Uses `vest-daemon.exe` (bundled, reliable, no Python needed)
- **Development:** Uses whatever Python `python`/`python3` resolves to

This means issues found in development may not exist in production and vice versa.

### Issue 4: Multiple Startup Paths = Confusion

Users and developers have too many choices:
- `start-daemon.bat` + `run.bat`
- `start-all.bat`
- Just `run.bat` (relies on daemonBridge auto-start)
- `yarn dev` from web folder

---

## Recommendations

### Option A: Unify on JavaScript with Better Python Resolution ⭐ RECOMMENDED

**Goal:** Make `daemonBridge.cjs` use the same Python resolution logic as batch scripts.

**Changes:**

1. **Update `daemonBridge.cjs` to detect Python reliably:**

```javascript
function getPythonCommand() {
  // 1. Check TSV_PYTHON environment variable
  if (process.env.TSV_PYTHON) {
    return process.env.TSV_PYTHON.split(' '); // Handle "py -3.11"
  }
  
  // 2. On Windows, try py launcher with 3.11
  if (process.platform === 'win32') {
    try {
      execSync('py -3.11 -c "import sys"', { stdio: 'ignore' });
      return ['py', '-3.11'];
    } catch (e) {
      // py -3.11 not available, fall through
    }
  }
  
  // 3. Fall back to python/python3
  return [process.platform === 'win32' ? 'python' : 'python3'];
}
```

2. **Update `runPythonCommand.mjs` with same logic** (for stop-daemon, check-python-setup)

3. **Keep batch scripts as "convenience shortcuts"** but document they're optional

**Pros:**
- One reliable Python detection mechanism
- Works cross-platform
- Respects TSV_PYTHON when set
- No code duplication between batch and JS

**Cons:**
- Requires testing on multiple Windows configurations
- Slightly more complex JS code

---

### Option B: Keep Batch Scripts as Primary (Development Only)

**Goal:** Keep batch scripts for development, JS for production only.

**Changes:**
1. Document that developers should use batch scripts
2. Remove auto-start from `daemonBridge.cjs` in development
3. Update documentation to require manual daemon start

**Pros:**
- Simpler JS code
- Batch scripts already work well

**Cons:**
- Windows-only development experience
- Extra step for developers
- Inconsistent developer experience

---

### Option C: Read Python Path from Config File

**Goal:** Both batch scripts and JS read from same config file.

**Changes:**
1. Create a `daemon-config.json` or `.daemon-env` file
2. Batch scripts read this file
3. JavaScript reads this file
4. Users configure Python path once

```json
{
  "python_command": "py -3.11",
  "daemon_port": 5050,
  "debug_flags": []
}
```

**Pros:**
- Single source of truth
- Can add other config options

**Cons:**
- Adds complexity
- Another file to manage
- Overkill for the problem

---

## Implementation Status

### ✅ IMPLEMENTED: Option A - Unified Python Detection

The following changes have been made:

1. **`daemonBridge.cjs`** - Added `detectPythonCommand()` function that:
   - Reads `TSV_PYTHON` environment variable if set
   - Tries `py -3.11` on Windows via py launcher
   - Falls back to `python`/`python3`
   - Logs which Python is being used

2. **`runPythonCommand.mjs`** - Added same Python detection logic for consistency

3. **`start-ui.bat`** - Now resolves Python and sets `TSV_PYTHON` environment variable before launching Electron, so the JavaScript code inherits the correct Python

4. **`start-all.bat`** - Updated to pass `TSV_PYTHON` to Electron via `endlocal`

5. **Removed redundant scripts:**
   - `run.bat` (replaced by `start-ui.bat` or `yarn dev`)
   - `run-with-python.bat` (utility script no longer needed)
   - `start-daemon-custom.bat` (debug flags can be added via environment)

6. **Updated documentation:**
   - `windows/README.md` - Updated script list, added Python detection section
   - `windows/SETUP.md` - Updated to reference `start-all.bat`

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `web/electron/daemonBridge.cjs` | Added `detectPythonCommand()` with TSV_PYTHON + py launcher | ✅ Done |
| `web/scripts/runPythonCommand.mjs` | Added same Python detection logic | ✅ Done |
| `windows/start-ui.bat` | Resolves Python and exports TSV_PYTHON | ✅ Done |
| `windows/start-all.bat` | Exports TSV_PYTHON to Electron | ✅ Done |
| `windows/README.md` | Updated script list, added Python detection docs | ✅ Done |
| `windows/SETUP.md` | Updated to reference start-all.bat | ✅ Done |

## Files Removed

| File | Reason |
|------|--------|
| `windows/run.bat` | Redundant with `start-ui.bat` and `yarn dev` |
| `windows/run-with-python.bat` | Utility script no longer needed |
| `windows/start-daemon-custom.bat` | Debug flags can be set via environment |

---

## Conclusion

The **recommended approach is Option A**: Unify Python resolution in the JavaScript code to match the batch scripts' logic. This ensures:

1. **Consistent behavior** across all startup methods
2. **Production reliability** maintained (uses bundled exe)
3. **Development reliability** improved (uses proper Python detection)
4. **Backwards compatibility** with TSV_PYTHON/.env.bat users
5. **Cross-platform support** maintained

The batch scripts can remain as convenience shortcuts for Windows developers, but the JavaScript code should be the source of truth for daemon management.
