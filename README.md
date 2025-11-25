# Project Structure

This repository is organized to keep the original `libthirdspacevest` sources intact while adding modern tooling around them.

- `legacy-do-not-change/` is a verbatim copy of the historical codebase. Please treat everything under this directory as read-only. Any bug fixes or experiments that require touching the legacy C/Python sources should be done via overlays or patches elsewhere so that the pristine reference remains untouched.
- `modern-third-space/` hosts the new Python package that dynamically loads the legacy `thirdspace.py` driver and exposes a clean API/CLI for other tools (the Electron debugger, scripts, etc.).
- `web/` contains the Electron + React + Tailwind workspace (and the Repomix tooling). Node dependencies, configuration, and the future debugger UI live here so they stay isolated from the legacy tree.

When adding new functionality:

1. Leave `legacy-do-not-change/` unchanged.
2. Build/extend the Python bridge in `modern-third-space/` (install with `pip install -e .` if you need local changes).
3. Place all Node/Electron work under `web/`.
4. Use bridging layers (scripts, adapters, etc.) outside the legacy directory if you need to interact with the original driver.

This setup lets us iterate on modern tooling while preserving the historical code for reference. Let me know if additional guardrails or documentation would help.
