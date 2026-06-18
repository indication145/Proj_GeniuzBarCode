# Install "GeniuzBarCode Label Designer" as a Windows service using NSSM.
#
# Prerequisites:
#   1) Node.js 18+ installed (node on PATH)
#   2) NSSM downloaded from https://nssm.cc/download  (place nssm.exe on PATH,
#      or pass its full path via -Nssm)
#   3) .env created in the repo root (copy from .env.example, fill secrets)
#
# Run in an ELEVATED PowerShell (Run as Administrator):
#   .\deploy\windows\install-service.ps1
#
param(
  [string]$Nssm = "nssm",
  [string]$ServiceName = "LabelDesigner",
  [int]$Port = 8080
)
$ErrorActionPreference = "Stop"

# repo root = two levels up from this script (deploy\windows\)
$AppDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path "$AppDir\logs" | Out-Null

Write-Host "Installing service '$ServiceName'"
Write-Host "  AppDir : $AppDir"
Write-Host "  node   : $node"
Write-Host "  Port   : $Port"

& $Nssm install $ServiceName $node "server.js"
& $Nssm set $ServiceName AppDirectory $AppDir
& $Nssm set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "NO_OPEN=1" "PORT=$Port"
& $Nssm set $ServiceName AppStdout "$AppDir\logs\out.log"
& $Nssm set $ServiceName AppStderr "$AppDir\logs\err.log"
& $Nssm set $ServiceName AppRotateFiles 1
& $Nssm set $ServiceName Start SERVICE_AUTO_START
& $Nssm start $ServiceName

Write-Host "Done. Test: curl http://localhost:$Port/api/health"
