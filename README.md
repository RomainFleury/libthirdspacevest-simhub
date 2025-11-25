## Project Structure

This repository is organized to keep the original `libthirdspacevest` sources intact while adding modern tooling around them.

- `legacy-do-not-change/` is a verbatim copy of the historical codebase. Please treat everything under this directory as read-only. Any bug fixes or experiments that require touching the legacy C/Python sources should be done via overlays or patches elsewhere so that the pristine reference remains untouched.
- `web/` contains the new JavaScript workspace where we will build the Electron/Web front-end and other supporting tools (e.g. Repomix snapshots). Node dependencies, configuration, and future app code all live here so they stay isolated from the legacy tree.

When adding new functionality:

1. Leave `legacy-do-not-change/` unchanged.
2. Place all Node/Electron work under `web/`.
3. Use bridging layers (scripts, adapters, etc.) outside the legacy directory if you need to interact with the original driver.

This setup lets us iterate on modern tooling while preserving the historical code for reference. Let me know if additional guardrails or documentation would help.
