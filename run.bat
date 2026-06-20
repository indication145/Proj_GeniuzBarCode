@echo off
rem GeniuzBarCode Label Designer - run from source (double-click)
rem For end users: distribute dist\Geniuz_Barcode.exe instead (no Node needed).
title GeniuzBarCode Label Designer
cd /d "%~dp0"

where node >nul 2>nul
if not %errorlevel%==0 (
    echo Node.js not found. Install it from https://nodejs.org then run again.
    goto :end
)

rem Build the Vite app once if it hasn't been built yet
if not exist "web\dist\index.html" (
    echo Building web app ^(first run^)...
    call npm --prefix web install
    call npm --prefix web run build
)

echo Starting server with Node.js...
node server.js

:end
echo.
pause
