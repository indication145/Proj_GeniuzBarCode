# เติมขอบ PNG ให้เป็นจัตุรัส (โลโก้อยู่กลาง พื้นหลังโปร่งใส) สำหรับทำ app icon
# ใช้: powershell -File png-square.ps1 -In <input.png> -Out <output.png>
param([Parameter(Mandatory=$true)][string]$In,[Parameter(Mandatory=$true)][string]$Out)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
try {
  $s = [Math]::Max($src.Width, $src.Height)
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $x = [int](($s - $src.Width) / 2)
  $y = [int](($s - $src.Height) / 2)
  $g.DrawImage($src, $x, $y, $src.Width, $src.Height)
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output ("squared {0}x{0} -> {1}" -f $s, $Out)
} finally { $src.Dispose() }
