# Update GeniuzBarCode Label Designer to the latest version.
#
#   git pull  ->  install deps (if changed)  ->  build web  ->  restart service  ->  health check
#
# The web build runs BEFORE the service restart, so if the build fails the old
# version keeps serving (no downtime). .env is never touched (it is gitignored).
#
# Run in an ELEVATED PowerShell (Run as Administrator):
#   .\deploy\windows\update.ps1
#   .\deploy\windows\update.ps1 -ServiceName GeniuzBarCode -Port 8282
#
param(
  [string]$ServiceName = "LabelDesigner",
  [int]$Port = 8282,
  [string]$Nssm = "nssm"
)
$ErrorActionPreference = "Stop"

# repo root = two levels up from this script (deploy\windows\)
$AppDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $AppDir
Write-Host "== Updating GeniuzBarCode ==" -ForegroundColor Cyan
Write-Host "  AppDir  : $AppDir"
Write-Host "  Service : $ServiceName"
Write-Host "  Port    : $Port"

# remember current commit so we can roll back if needed
$prev = (git rev-parse HEAD).Trim()
Write-Host "  Current : $prev"

# 1. pull latest code
Write-Host "`n[1/4] git pull ..." -ForegroundColor Yellow
git pull
$now = (git rev-parse HEAD).Trim()
if ($now -eq $prev) {
  Write-Host "  Already up to date ($now). Rebuilding anyway to be safe." -ForegroundColor DarkGray
} else {
  Write-Host "  $prev -> $now"
}

# 2. install deps (npm ci-style refresh; safe to run every time)
Write-Host "`n[2/4] install dependencies ..." -ForegroundColor Yellow
npm --prefix web install
npm install

# 3. build the web app (server.js serves web\dist, which is gitignored)
Write-Host "`n[3/4] build web ..." -ForegroundColor Yellow
npm --prefix web run build
if (-not (Test-Path "$AppDir\web\dist\index.html")) {
  throw "Build did not produce web\dist\index.html - aborting before restart. Rollback: git reset --hard $prev"
}

# 4. restart the Node service to pick up new server.js
Write-Host "`n[4/4] restart service '$ServiceName' ..." -ForegroundColor Yellow
& $Nssm restart $ServiceName

# health check (retry a few times while the service comes up)
Write-Host "`nHealth check http://localhost:$Port/api/health ..." -ForegroundColor Yellow
$ok = $false
foreach ($i in 1..10) {
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 3
    if ($r.ok) { $ok = $true; break }
  } catch { Start-Sleep -Milliseconds 800 }
}
if ($ok) {
  Write-Host "`nDone. Service healthy at version $now." -ForegroundColor Green
  Write-Host "Open the site and hard-refresh (Ctrl+F5) to load the new build."
} else {
  Write-Warning "Service did not return {ok:true} on port $Port."
  Write-Warning "Check logs\err.log. Rollback: git reset --hard $prev; npm --prefix web run build; $Nssm restart $ServiceName"
  exit 1
}
