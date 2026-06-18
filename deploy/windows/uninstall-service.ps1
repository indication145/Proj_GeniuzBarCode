# Remove the LabelDesigner Windows service. Run as Administrator.
param(
  [string]$Nssm = "nssm",
  [string]$ServiceName = "LabelDesigner"
)
& $Nssm stop $ServiceName
& $Nssm remove $ServiceName confirm
Write-Host "Removed service '$ServiceName'"
