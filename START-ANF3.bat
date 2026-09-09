@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

rem ===========================================================================
rem  ANF3 Laboratory Records - the one file to double-click
rem ---------------------------------------------------------------------------
rem  This workspace is meant to sit on the department share drive so there is
rem  one copy to update. It must NOT be RUN from there. Three things break when
rem  several PCs run out of one shared folder:
rem
rem    * .venv records an absolute path to the Python it was built from, so it
rem      only works on the PC that created it. Every other PC decides the
rem      environment is broken and rebuilds it - deleting the folder out from
rem      under whoever is using it at the time.
rem    * activity-log.jsonl and .anf3-port are single files every PC writes to.
rem      Appends from two machines can tear a line; the port file makes each PC
rem      believe the others' server is its own.
rem    * two PCs printing the same worksheet write the same output PDF at the
rem      same time. That is a controlled document.
rem
rem  So: the share drive holds the master copy, each PC gets its own working
rem  copy under %LOCALAPPDATA%, and this launcher keeps them in step. Run it
rem  from the share drive and it copies itself down, then hands over. Run it
rem  from the local copy and it just starts. Update the share drive and the
rem  next launch refreshes each PC on its own.
rem ===========================================================================

title ANF3 Laboratory Records
set "APP_DIR=%~dp0"
set "LOCAL_DIR=%LOCALAPPDATA%\ANF3-Laboratory-Records\"

rem Already the local working copy? Nothing to sync - just start.
if /i "%APP_DIR%"=="%LOCAL_DIR%" goto :run_here

rem The owner can force the old behaviour for a one-off test.
if /i "%~1"=="/here" goto :run_here

echo.
echo ANF3 Laboratory Records
echo   Master copy : %APP_DIR%
echo   This PC     : %LOCAL_DIR%
echo.

call :read_version "%APP_DIR%VERSION.txt" MASTER_VERSION
call :read_version "%LOCAL_DIR%VERSION.txt" LOCAL_VERSION

if not exist "%LOCAL_DIR%server\pdf_server.py" (
  echo [1/2] First run on this PC - copying the workspace across.
  goto :copy_down
)
if not "!MASTER_VERSION!"=="!LOCAL_VERSION!" (
  echo [1/2] The master copy has been updated ^(!LOCAL_VERSION! -^> !MASTER_VERSION!^) - refreshing this PC.
  goto :copy_down
)

echo [1/2] This PC is already up to date ^(!LOCAL_VERSION!^).
goto :hand_over

:copy_down
rem robocopy handles UNC paths and long file names, which xcopy does not.
rem   /MIR  make the local copy match the master exactly
rem   /XD   never copy per-machine state: the environment, the caches, the
rem         downloaded packages, the generated output, the release archives
rem   /XF   never copy the per-machine runtime files
rem Exit codes below 8 are success; 8 and above are real failures.
robocopy "%APP_DIR%." "%LOCAL_DIR%." /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 ^
  /XD ".venv" "node_modules" ".git" ".uv-cache" "pdfs" "words" "release" "shots" "__pycache__" ^
  /XF ".anf3-port" "activity-log.jsonl" "log-forward.json"
if errorlevel 8 (
  echo.
  echo [!] Could not copy the workspace to this PC.
  echo     Check that you can write to: %LOCAL_DIR%
  echo     Starting from the share drive instead, which is slower and cannot
  echo     be relied on if several people do it at once.
  echo.
  pause
  goto :run_here
)
echo       Copy complete.

:hand_over
if not exist "%LOCAL_DIR%.venv\Scripts\python.exe" (
  echo [2/2] Setting up the Python environment on this PC ^(one time^)...
  set "ANF3_CALLED_BY_LAUNCHER=1"
  call "%LOCAL_DIR%INSTALL.bat"
  set "ANF3_CALLED_BY_LAUNCHER="
  if errorlevel 1 (
    echo.
    echo [!] Setup did not finish. Read the message above, then run this again.
    pause
    exit /b 1
  )
) else (
  echo [2/2] Starting.
)
echo.
call "%LOCAL_DIR%START-ANF3.bat"
exit /b %errorlevel%

rem ===========================================================================
rem  Running from the local working copy: find an ANF3 server or start one.
rem ===========================================================================
:run_here
rem The usual port is often taken on a laboratory PC, so the server picks the
rem next free one and writes it to .anf3-port. Look for an ANF3 server that is
rem already running - first on whatever port it recorded, then across the range
rem the server searches - and reuse it instead of starting a second copy.
set "FOUND="

if exist "%APP_DIR%.anf3-port" (
  set /p RECORDED=<"%APP_DIR%.anf3-port"
  if defined RECORDED call :probe !RECORDED!
)

if not defined FOUND (
  for /l %%P in (8000,1,8009) do (
    if not defined FOUND call :probe %%P
  )
)

if defined FOUND (
  echo [INFO] ANF3 is already running on port %FOUND%. Opening the browser.
  start "" "http://localhost:%FOUND%"
  exit /b 0
)

call "%APP_DIR%START-SERVER.bat"
exit /b %errorlevel%

rem ---------------------------------------------------------------------------
rem Reads a version stamp into the named variable. Missing file means "unknown",
rem which never matches a real version, so the copy is refreshed.
:read_version
set "%~2=none"
if exist "%~1" (
  for /f "usebackq delims=" %%V in ("%~1") do (
    set "%~2=%%V"
    goto :eof
  )
)
goto :eof

rem ---------------------------------------------------------------------------
rem Sets FOUND only when an ANF3 server answers on this port. /api/status is
rem this application's own route, so another program sitting on the port will
rem not be mistaken for ours.
:probe
powershell -NoProfile -NonInteractive -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:%1/api/status'; if ($r.StatusCode -eq 200) { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 set "FOUND=%1"
goto :eof
