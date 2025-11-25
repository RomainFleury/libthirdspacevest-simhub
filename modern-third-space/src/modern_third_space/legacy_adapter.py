"""
Helpers to access the vendored legacy driver.
"""

from __future__ import annotations

from typing import Type

from .legacy_port import ThirdSpaceVest


class LegacyLoaderError(RuntimeError):
    """Kept for backwards-compatibility with earlier code paths."""


def load_vest_class() -> Type["ThirdSpaceVest"]:
    """Return the vendored `ThirdSpaceVest` class."""
    return ThirdSpaceVest

