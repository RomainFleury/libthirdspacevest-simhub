"""
Helpers to load the historical `thirdspace.py` module without modifying it.
"""

from __future__ import annotations

import importlib.util
import types
from pathlib import Path
from typing import TYPE_CHECKING, Optional, Type

if TYPE_CHECKING:
    from legacy_thirdspace import ThirdSpaceVest  # type: ignore


class LegacyLoaderError(RuntimeError):
    """Raised when the legacy driver cannot be imported."""


def _legacy_module_path() -> Path:
    repo_root = Path(__file__).resolve().parents[2]
    legacy_py = repo_root / "legacy-do-not-change" / "python" / "thirdspace.py"
    if not legacy_py.exists():
        raise LegacyLoaderError(
            f"Legacy driver not found at expected path: {legacy_py}"
        )
    return legacy_py


_cached_module: Optional[types.ModuleType] = None


def load_legacy_module() -> types.ModuleType:
    global _cached_module
    if _cached_module:
        return _cached_module

    module_path = _legacy_module_path()
    spec = importlib.util.spec_from_file_location("legacy_thirdspace", module_path)
    if spec is None or spec.loader is None:
        raise LegacyLoaderError(f"Unable to create module spec for {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _cached_module = module
    return module


def load_vest_class() -> Type["ThirdSpaceVest"]:
    module = load_legacy_module()
    try:
        return getattr(module, "ThirdSpaceVest")
    except AttributeError as exc:
        raise LegacyLoaderError(
            "Legacy module does not expose `ThirdSpaceVest`"
        ) from exc


