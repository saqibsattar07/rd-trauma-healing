Add-Type -AssemblyName System.Drawing

$srcPath = "e:\rd-trauma-healing\artifacts\rd-trauma-healing\public\rd-trauma-healing-logo.png"
$pubDir = "e:\rd-trauma-healing\artifacts\rd-trauma-healing\public"
$orig = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Png($img, [int]$w, [int]$h, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Resize-Png $orig 16 16 (Join-Path $pubDir "favicon-16x16.png")
Resize-Png $orig 32 32 (Join-Path $pubDir "favicon-32x32.png")
Resize-Png $orig 48 48 (Join-Path $pubDir "favicon-48x48.png")
Resize-Png $orig 180 180 (Join-Path $pubDir "apple-touch-icon.png")

# Also generate favicon.ico using 32x32 bitmap
$bmp32 = New-Object System.Drawing.Bitmap(32, 32)
$g32 = [System.Drawing.Graphics]::FromImage($bmp32)
$g32.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g32.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g32.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g32.DrawImage($orig, 0, 0, 32, 32)
$hIcon = $bmp32.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::OpenWrite((Join-Path $pubDir "favicon.ico"))
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$g32.Dispose()
$bmp32.Dispose()

$orig.Dispose()
Write-Output "Successfully generated favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, apple-touch-icon.png, and favicon.ico"
