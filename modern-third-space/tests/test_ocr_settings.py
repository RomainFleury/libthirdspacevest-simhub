from pathlib import Path

from modern_third_space.server import ocr_settings as ocr_settings_mod
from modern_third_space.server.ocr_settings import load_ocr_settings, save_ocr_settings


def test_ocr_settings_roundtrip(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    # Re-resolve path after env change
    loaded = load_ocr_settings()
    assert loaded["engine"] == "windows_ocr"
    saved = save_ocr_settings("tesseract")
    assert saved["engine"] == "tesseract"
    assert Path(saved["path"]).is_file()
    again = load_ocr_settings()
    assert again["engine"] == "tesseract"
    assert ocr_settings_mod.ocr_settings_path().parent == tmp_path / "Third Space Vest"
