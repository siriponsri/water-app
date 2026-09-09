@echo off
chcp 65001 >nul
setlocal EnableExtensions

title ANF3 Laboratory Records - Office Support
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

if not exist "%APP_DIR%.venv\Scripts\python.exe" (
  call "%APP_DIR%INSTALL.bat"
  if errorlevel 1 exit /b 1
)

set "UV_EXE=%APP_DIR%.tools\uv\uv.exe"
for /f "delims=" %%U in ('where uv 2^>nul') do if exist "%%U" set "UV_EXE=%%U"
if not exist "%UV_EXE%" (
  echo [ERROR] uv was not found. Run INSTALL.bat first.
  exit /b 1
)

echo Installing pywin32 and comtypes with uv...
"%UV_EXE%" pip install --python "%APP_DIR%.venv\Scripts\python.exe" --no-progress pywin32 comtypes
if errorlevel 1 exit /b 1
echo [OK] Office PDF support is installed for the local environment.
pause
