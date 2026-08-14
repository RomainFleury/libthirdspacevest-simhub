"""Compatibility shim — OpenCV digit helpers live in server.ocr.opencv_digits."""

from .ocr.opencv_digits import (  # noqa: F401
    opencv_unavailable_reason,
    read_opencv_cells_number,
    read_opencv_knn_number,
)


def recognize_opencv_knn_from_bgra(raw_bgra: bytes, width: int, height: int) -> str:
    value = read_opencv_knn_number(raw_bgra, width, height)
    return "" if value is None else str(value)


def recognize_opencv_cells_from_bgra(raw_bgra: bytes, width: int, height: int) -> str:
    value = read_opencv_cells_number(raw_bgra, width, height)
    return "" if value is None else str(value)
