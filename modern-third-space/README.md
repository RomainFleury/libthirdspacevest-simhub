# modern-third-space

`modern-third-space` is a lightweight Python package that wraps the original `thirdspace.py` driver while keeping the legacy sources untouched inside `legacy-do-not-change/`.

## Goals

- Provide a clean, typed API the Electron debugger app (and other tools) can call.
- Surface useful status information (USB availability, cache key state, last command).
- Offer a tiny CLI (`modern-third-space status`, `... trigger --cell 2 --speed 5`) for quick manual testing or scripting.

## Installation

### PyUSB Dependency

This package requires PyUSB for USB device communication. Install it with:

```bash
pip install pyusb
```

**Platform-specific notes:**

- **macOS**: PyUSB should work out of the box after `pip install pyusb`.
- **Linux**: You may need to install system libraries first:

  ```bash
  # Debian/Ubuntu
  sudo apt-get install libusb-1.0-0-dev
  
  # Fedora/RHEL
  sudo dnf install libusb1-devel
  
  # Then install PyUSB
  pip install pyusb
  ```

- **Windows**: PyUSB should work, but you may need to install [libusb-win32](http://libusb-win32.sourceforge.net/) or [Zadig](https://zadig.akeo.ie/) drivers for your USB device.

If PyUSB is not installed, the `list` command will return a fake device with serial number `"sorry-bro"` to indicate the missing dependency.

## Verifying Setup

After installing the package, you can verify your setup is working correctly:

**Option 1: Use the Node.js diagnostic script (recommended):**

From the `web/` directory:

```bash
cd ../web
yarn check:python
```

This will test both `ping` and `list` commands and provide helpful diagnostics.

**Option 2: Test manually:**

```bash
# Test ping command
python3 -m modern_third_space.cli ping
# Should output: {"status": "ok", "message": "Python bridge is reachable"}

# Test list command
python3 -m modern_third_space.cli list
# Should show connected devices, or a fake device with serial "sorry-bro" if PyUSB isn't installed
```

## Development

```bash
cd modern-third-space
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
pip install pyusb  # Don't forget PyUSB!
modern-third-space status
```

The package dynamically loads the legacy `ThirdSpaceVest` class via `importlib` and never modifies the historical files. Any enhancements should go through the wrapper or new modules here.
