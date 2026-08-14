# Windows OCR setup (ammo recoil default)

Live recoil **defaults to Windows OCR**. You can override to OpenCV + kNN on Daemon Settings.

## What we can ship vs what Windows must provide

| Piece | In our build? |
|-------|----------------|
| Python WinRT OCR packages (`winrt-Windows.Media.Ocr`, etc.) | **Yes** — daemon `pip install -e .` |
| Windows **Optical character recognition** language pack | **No** — this is an OS optional feature. Microsoft does not allow bundling it in a third-party installer. |

We also **should not** silently run elevated `Add-WindowsCapability` from the app: it needs admin, can fail on managed PCs, and the wrong language pack is worse than a clear prompt.

## Check

Daemon Settings → Windows OCR shows **ready** or **not installed**.

If missing:

1. Open **Settings → Time & language → Language & region** (the app has an “Open Windows language settings” button).
2. Add **English (United States)** if it is not listed.
3. Language options → **Optical character recognition** → Download.
4. Restart the Third Space daemon → Refresh.

Then Test OCR / Start on Screen Health recoil.

## Optional override

OpenCV + kNN is faster but often returns a **wrong number** instead of blank. Install separately if you want it:

```text
py -3.14 -m pip install "opencv-python-headless>=4.8,<5"
```
