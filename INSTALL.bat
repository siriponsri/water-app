@echo off
chcp 65001 >nul
setlocal EnableExtensions

title ANF3 Laboratory Records - Install
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"
set "UV_EXE="
set "UV_DIR=%APP_DIR%.tools\uv"
set "UV_CACHE_DIR=%APP_DIR%.uv-cache"
set "VENV_DIR=%APP_DIR%.venv"
set "VENV_PY=%VENV_DIR%\Scripts\python.exe"

echo.
echo ANF3 Laboratory Records v7 - user-level setup
echo No Administrator permission is required.
echo.

for /f "delims=" %%U in ('where uv 2^>nul') do if not defined UV_EXE set "UV_EXE=%%U"
if not defined UV_EXE if exist "%UV_DIR%\uv.exe" set "UV_EXE=%UV_DIR%\uv.exe"

if not defined UV_EXE (
  echo [1/3] Downloading uv for this project...
  if not exist "%UV_DIR%" mkdir "%UV_DIR%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $zip=Join-Path $env:TEMP 'anf3-uv.zip'; Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip' -OutFile $zip; $out=Join-Path $env:TEMP 'anf3-uv-extract'; if(Test-Path $out){Remove-Item -Recurse -Force $out}; Expand-Archive -LiteralPath $zip -DestinationPath $out -Force; $exe=Get-ChildItem -LiteralPath $out -Recurse -Filter 'uv.exe' | Select-Object -First 1; if(-not $exe){throw 'uv.exe was not found in the downloaded archive'}; Copy-Item -LiteralPath $exe.FullName -Destination (Join-Path '%UV_DIR%' 'uv.exe') -Force; Remove-Item -LiteralPath $zip -Force; Remove-Item -LiteralPath $out -Recurse -Force"
  if errorlevel 1 (
    echo [ERROR] uv download failed. Check the internet connection and retry.
    exit /b 1
  )
  set "UV_EXE=%UV_DIR%\uv.exe"
) else (
  echo [1/3] uv is already available.
)

rem A .venv can exist and still be unusable: pyvenv.cfg records an absolute path
rem to the Python it was built from, so a folder that was copied, moved, zipped
rem or restored from a backup gives "No pyvenv.cfg file" and the server dies on
rem the first line. Probe it properly and rebuild rather than trusting the
rem presence of python.exe.
echo [2/3] Checking the local Python environment...
call :probe_venv
if defined VENV_OK (
  echo       Existing environment is healthy.
) else (
  if exist "%VENV_DIR%" (
    echo       The existing .venv is incomplete or was built on another PC - rebuilding it.
    rmdir /s /q "%VENV_DIR%"
    if exist "%VENV_DIR%" (
      echo [ERROR] Could not remove "%VENV_DIR%".
      echo         Close any window still running the server, then run INSTALL.bat again.
      exit /b 1
    )
  )
  echo       Creating a fresh environment...
  "%UV_EXE%" venv --python 3.12 "%VENV_DIR%"
  if errorlevel 1 (
    echo [ERROR] Could not create .venv.
    call :hold
    exit /b 1
  )
)

echo [3/3] Installing server dependencies with uv...
"%UV_EXE%" pip install --python "%VENV_PY%" --no-progress -r "%APP_DIR%server\requirements.txt"
if errorlevel 1 (
  echo [ERROR] Dependency installation failed.
  call :hold
  exit /b 1
)

rem Prove the thing the server actually needs, not just that pip exited 0.
"%VENV_PY%" -c "import flask" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Flask is still not importable after installation.
  echo         Delete the .venv folder and run INSTALL.bat again.
  call :hold
  exit /b 1
)

echo.
echo [OK] Installation complete.
echo       Python: %VENV_PY%
echo       Run START-SERVER.bat to launch the local app.
exit /b 0

rem ---------------------------------------------------------------------------
rem Hold the window open only when this was double-clicked, never when
rem START-ANF3.bat called it -- that launcher reports the failure itself, and a
rem second prompt would just be one more Enter to press.
:hold
if defined ANF3_CALLED_BY_LAUNCHER goto :eof
echo.
pause
goto :eof

rem ---------------------------------------------------------------------------
rem Sets VENV_OK only when the environment can actually start Python.
:probe_venv
set "VENV_OK="
if not exist "%VENV_PY%" goto :eof
if not exist "%VENV_DIR%\pyvenv.cfg" goto :eof
"%VENV_PY%" -c "import sys" >nul 2>&1
if errorlevel 1 goto :eof
set "VENV_OK=1"
goto :eof
