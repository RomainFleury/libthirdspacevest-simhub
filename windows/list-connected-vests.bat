@echo off
setlocal EnableDelayedExpansion

::: Third Space Vest - List Connected Vests
::: Queries the daemon for connected vests

:: Load optional local python override (windows\.env.bat)
if exist "%~dp0.env.bat" call "%~dp0.env.bat"

::: Resolve Python command (TSV_PYTHON -> py -3.14 -> python/python3)
set "PYTHON_CMD="
set "PYTHON_CMD=%TSV_PYTHON%"

if not defined PYTHON_CMD (
    echo [ERROR] Python is not installed!
    exit /b 1
)

::: Navigate to Python source directory
cd /d "%~dp0..\modern-third-space\src"

::: Query daemon for connected vests
%PYTHON_CMD% -c "import socket, json, sys; s = socket.socket(); s.connect(('127.0.0.1', 5050)); s.send(b'{\"cmd\": \"list\"}\n'); response = s.recv(4096).decode(); s.close(); data = json.loads(response); print(json.dumps(data.get('devices', []), indent=2))"

exit /b 0
