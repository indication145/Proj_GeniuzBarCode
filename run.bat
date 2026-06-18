@echo off
rem GeniuzBarCode Label Designer - double-click to run
title GeniuzBarCode Label Designer
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
    echo Starting server with Node.js...
    node server.js
    goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo Node not found. Falling back to Python...
    start "" http://localhost:8080/
    py -3 -m http.server 8080
    goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
    echo Node not found. Falling back to Python...
    start "" http://localhost:8080/
    python -m http.server 8080
    goto :end
)

echo.
echo Could not find Node.js or Python on this machine.
echo Install Node.js (https://nodejs.org) or Python, then run this again.

:end
echo.
pause
