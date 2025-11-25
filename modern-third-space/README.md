# modern-third-space

`modern-third-space` is a lightweight Python package that wraps the original `thirdspace.py` driver while keeping the legacy sources untouched inside `legacy-do-not-change/`.

## Goals

- Provide a clean, typed API the Electron debugger app (and other tools) can call.
- Surface useful status information (USB availability, cache key state, last command).
- Offer a tiny CLI (`modern-third-space status`, `... trigger --cell 2 --speed 5`) for quick manual testing or scripting.

## Development

```bash
cd modern-third-space
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
modern-third-space status
```

The package dynamically loads the legacy `ThirdSpaceVest` class via `importlib` and never modifies the historical files. Any enhancements should go through the wrapper or new modules here.


