param(
  [string]$SourceDir = "assets/ui/antique/source",
  [string]$OutputDir = "assets/ui/antique/processed",
  [switch]$ValidateOnly
)

Add-Type -AssemblyName System.Drawing

function Get-AntiqueImageInfo {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $item = Get-Item -LiteralPath $Path
  $bitmap = [System.Drawing.Bitmap]::new($item.FullName)
  try {
    return [pscustomobject]@{
      Path = $item.FullName
      Width = $bitmap.Width
      Height = $bitmap.Height
      Aspect = [double]$bitmap.Width / [double]$bitmap.Height
      Bytes = $item.Length
    }
  }
  finally {
    $bitmap.Dispose()
  }
}

function Test-AntiqueImageRequirement {
  param(
    [string]$Path,
    [hashtable]$Requirement,
    [string]$Kind
  )

  $errors = [System.Collections.Generic.List[string]]::new()
  $info = Get-AntiqueImageInfo $Path

  if ($null -eq $info) {
    $errors.Add("missing ${Kind}: $Path")
    return $errors.ToArray()
  }

  if ([System.IO.Path]::GetExtension($Path).ToLowerInvariant() -ne ".png") {
    $errors.Add("invalid extension for ${Kind}: $Path")
  }

  if ($Requirement.ContainsKey("Width") -and $info.Width -ne [int]$Requirement.Width) {
    $errors.Add("${Kind} width must be $($Requirement.Width)px: $Path is $($info.Width)px")
  }

  if ($Requirement.ContainsKey("Height") -and $info.Height -ne [int]$Requirement.Height) {
    $errors.Add("${Kind} height must be $($Requirement.Height)px: $Path is $($info.Height)px")
  }

  if ($Requirement.ContainsKey("MaxWidth") -and $info.Width -gt [int]$Requirement.MaxWidth) {
    $errors.Add("${Kind} width must be <= $($Requirement.MaxWidth)px: $Path is $($info.Width)px")
  }

  if ($Requirement.ContainsKey("MaxHeight") -and $info.Height -gt [int]$Requirement.MaxHeight) {
    $errors.Add("${Kind} height must be <= $($Requirement.MaxHeight)px: $Path is $($info.Height)px")
  }

  if ($Requirement.ContainsKey("AspectMin") -and $info.Aspect -lt [double]$Requirement.AspectMin) {
    $errors.Add("${Kind} aspect must be >= $($Requirement.AspectMin): $Path is $([Math]::Round($info.Aspect, 3))")
  }

  if ($Requirement.ContainsKey("AspectMax") -and $info.Aspect -gt [double]$Requirement.AspectMax) {
    $errors.Add("${Kind} aspect must be <= $($Requirement.AspectMax): $Path is $([Math]::Round($info.Aspect, 3))")
  }

  if ($Requirement.ContainsKey("MaxBytes") -and $info.Bytes -gt [int64]$Requirement.MaxBytes) {
    $errors.Add("${Kind} size must be <= $($Requirement.MaxBytes) bytes: $Path is $($info.Bytes) bytes")
  }

  return $errors.ToArray()
}

function Assert-NoAntiqueAssetErrors {
  param([object[]]$Errors)

  if ($Errors.Count -eq 0) {
    return
  }

  foreach ($errorMessage in $Errors) {
    Write-Error $errorMessage
  }

  exit 1
}

$processorSource = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class AntiqueAssetProcessor
{
    public static void Process(
        string inputPath,
        string outputPath,
        int maxWidth,
        int maxHeight,
        bool clearInnerChecker,
        double innerX,
        double innerY,
        double innerWidth,
        double innerHeight)
    {
        using (var original = new Bitmap(inputPath))
        using (var source = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(source))
            {
                graphics.DrawImage(original, 0, 0, original.Width, original.Height);
            }

            var rect = new Rectangle(0, 0, source.Width, source.Height);
            var data = source.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            var stride = data.Stride;
            var bytes = Math.Abs(stride) * source.Height;
            var buffer = new byte[bytes];
            Marshal.Copy(data.Scan0, buffer, 0, bytes);

            var transparent = new bool[source.Width, source.Height];
            FloodCheckerFromEdges(buffer, transparent, source.Width, source.Height, stride);

            if (clearInnerChecker)
            {
                var ix = Clamp((int)Math.Round(source.Width * innerX), 0, source.Width - 1);
                var iy = Clamp((int)Math.Round(source.Height * innerY), 0, source.Height - 1);
                var iw = Clamp((int)Math.Round(source.Width * innerWidth), 1, source.Width - ix);
                var ih = Clamp((int)Math.Round(source.Height * innerHeight), 1, source.Height - iy);
                for (var y = iy; y < iy + ih; y++)
                {
                    for (var x = ix; x < ix + iw; x++)
                    {
                        var offset = y * stride + x * 4;
                        if (IsCheckerPixel(buffer[offset], buffer[offset + 1], buffer[offset + 2]))
                        {
                            transparent[x, y] = true;
                        }
                    }
                }
            }

            var minX = source.Width;
            var minY = source.Height;
            var maxX = -1;
            var maxY = -1;

            for (var y = 0; y < source.Height; y++)
            {
                for (var x = 0; x < source.Width; x++)
                {
                    var offset = y * stride + x * 4;
                    if (transparent[x, y])
                    {
                        buffer[offset + 3] = 0;
                        continue;
                    }

                    if (buffer[offset + 3] > 0)
                    {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            Marshal.Copy(buffer, 0, data.Scan0, bytes);
            source.UnlockBits(data);

            if (maxX < minX || maxY < minY)
            {
                throw new InvalidOperationException("No visible pixels remained for " + inputPath);
            }

            var padding = 4;
            minX = Math.Max(0, minX - padding);
            minY = Math.Max(0, minY - padding);
            maxX = Math.Min(source.Width - 1, maxX + padding);
            maxY = Math.Min(source.Height - 1, maxY + padding);

            var crop = Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
            using (var cropped = source.Clone(crop, PixelFormat.Format32bppArgb))
            using (var output = ResizeIfNeeded(cropped, maxWidth, maxHeight))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
                output.Save(outputPath, ImageFormat.Png);
            }
        }
    }

    private static Bitmap ResizeIfNeeded(Bitmap source, int maxWidth, int maxHeight)
    {
        if (maxWidth <= 0 || maxHeight <= 0 || (source.Width <= maxWidth && source.Height <= maxHeight))
        {
            return (Bitmap)source.Clone();
        }

        var scale = Math.Min((double)maxWidth / source.Width, (double)maxHeight / source.Height);
        var width = Math.Max(1, (int)Math.Round(source.Width * scale));
        var height = Math.Max(1, (int)Math.Round(source.Height * scale));
        var output = new Bitmap(width, height, PixelFormat.Format32bppArgb);

        using (var graphics = Graphics.FromImage(output))
        {
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.DrawImage(source, 0, 0, width, height);
        }

        return output;
    }

    private static void FloodCheckerFromEdges(byte[] buffer, bool[,] transparent, int width, int height, int stride)
    {
        var queue = new Queue<Point>();

        Action<int, int> enqueue = (x, y) =>
        {
            if (x < 0 || y < 0 || x >= width || y >= height || transparent[x, y]) return;
            var offset = y * stride + x * 4;
            if (!IsCheckerPixel(buffer[offset], buffer[offset + 1], buffer[offset + 2])) return;
            transparent[x, y] = true;
            queue.Enqueue(new Point(x, y));
        };

        for (var x = 0; x < width; x++)
        {
            enqueue(x, 0);
            enqueue(x, height - 1);
        }

        for (var y = 0; y < height; y++)
        {
            enqueue(0, y);
            enqueue(width - 1, y);
        }

        var dx = new[] { 1, -1, 0, 0 };
        var dy = new[] { 0, 0, 1, -1 };
        while (queue.Count > 0)
        {
            var point = queue.Dequeue();
            for (var i = 0; i < 4; i++)
            {
                enqueue(point.X + dx[i], point.Y + dy[i]);
            }
        }
    }

    private static bool IsCheckerPixel(byte b, byte g, byte r)
    {
        var max = Math.Max(r, Math.Max(g, b));
        var min = Math.Min(r, Math.Min(g, b));
        var average = (r + g + b) / 3;
        return average >= 232 && (max - min) <= 18;
    }

    private static int Clamp(int value, int min, int max)
    {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
}
"@

Add-Type -TypeDefinition $processorSource -ReferencedAssemblies System.Drawing

$assets = @(
  @{ Name = "oval-table-wide.png"; Part = "CPU battle oval table frame"; SourceWidth = 1672; SourceHeight = 941; SourceAspectMin = 1.74; SourceAspectMax = 1.82; MaxSourceBytes = 3000000; MaxWidth = 1672; MaxHeight = 941; OutputAspectMin = 1.78; OutputAspectMax = 1.90; MaxOutputBytes = 3500000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "room-frame-round.png"; Part = "Room and lobby circular frame"; SourceWidth = 1254; SourceHeight = 1254; SourceAspectMin = 0.98; SourceAspectMax = 1.02; MaxSourceBytes = 2500000; MaxWidth = 640; MaxHeight = 640; OutputAspectMin = 0.94; OutputAspectMax = 1.04; MaxOutputBytes = 1000000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "seat-frame.png"; Part = "Player seat frame"; SourceWidth = 1254; SourceHeight = 1254; SourceAspectMin = 0.98; SourceAspectMax = 1.02; MaxSourceBytes = 2500000; MaxWidth = 420; MaxHeight = 420; OutputAspectMin = 0.90; OutputAspectMax = 1.02; MaxOutputBytes = 512000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "label-strip.png"; Part = "Long label strip"; SourceWidth = 2508; SourceHeight = 627; SourceAspectMin = 3.95; SourceAspectMax = 4.05; MaxSourceBytes = 2000000; MaxWidth = 1254; MaxHeight = 314; OutputAspectMin = 5.80; OutputAspectMax = 6.80; MaxOutputBytes = 512000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "card-face-normal.png"; Part = "Normal card face frame"; SourceWidth = 1060; SourceHeight = 1484; SourceAspectMin = 0.70; SourceAspectMax = 0.73; MaxSourceBytes = 2500000; MaxWidth = 212; MaxHeight = 297; OutputAspectMin = 0.66; OutputAspectMax = 0.74; MaxOutputBytes = 256000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "card-face-special-1.png"; Part = "Special card face frame"; SourceWidth = 1060; SourceHeight = 1484; SourceAspectMin = 0.70; SourceAspectMax = 0.73; MaxSourceBytes = 2500000; MaxWidth = 212; MaxHeight = 297; OutputAspectMin = 0.66; OutputAspectMax = 0.74; MaxOutputBytes = 256000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "card-face-danger-15.png"; Part = "Danger 15 card face frame"; SourceWidth = 1060; SourceHeight = 1484; SourceAspectMin = 0.70; SourceAspectMax = 0.73; MaxSourceBytes = 2500000; MaxWidth = 212; MaxHeight = 297; OutputAspectMin = 0.66; OutputAspectMax = 0.74; MaxOutputBytes = 256000; ClearInner = $true; X = 0.09; Y = 0.16; W = 0.82; H = 0.74 },
  @{ Name = "card-back.png"; Part = "Card back"; SourceWidth = 1060; SourceHeight = 1484; SourceAspectMin = 0.70; SourceAspectMax = 0.73; MaxSourceBytes = 2500000; MaxWidth = 212; MaxHeight = 297; OutputAspectMin = 0.66; OutputAspectMax = 0.74; MaxOutputBytes = 256000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "cucumber-icon.png"; Part = "Cucumber point icon"; SourceWidth = 1254; SourceHeight = 1254; SourceAspectMin = 0.98; SourceAspectMax = 1.02; MaxSourceBytes = 1500000; MaxWidth = 256; MaxHeight = 256; OutputAspectMin = 0.82; OutputAspectMax = 0.94; MaxOutputBytes = 128000; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 }
)

$directAssets = @(
  @{ Name = "wood-table.png"; Part = "Battle background"; OutputPath = "assets/ui/antique/wood-table.png"; SourceWidth = 1672; SourceHeight = 941; SourceAspectMin = 1.74; SourceAspectMax = 1.82; MaxSourceBytes = 3000000; OutputWidth = 1672; OutputHeight = 941; OutputAspectMin = 1.74; OutputAspectMax = 1.82; MaxOutputBytes = 3000000 }
)

$sourceErrors = @()
foreach ($asset in $assets) {
  $inputPath = Join-Path $SourceDir $asset.Name
  $sourceErrors += Test-AntiqueImageRequirement $inputPath @{
    Width = $asset.SourceWidth
    Height = $asset.SourceHeight
    AspectMin = $asset.SourceAspectMin
    AspectMax = $asset.SourceAspectMax
    MaxBytes = $asset.MaxSourceBytes
  } "source $($asset.Name)"
}

foreach ($asset in $directAssets) {
  $inputPath = Join-Path $SourceDir $asset.Name
  $sourceErrors += Test-AntiqueImageRequirement $inputPath @{
    Width = $asset.SourceWidth
    Height = $asset.SourceHeight
    AspectMin = $asset.SourceAspectMin
    AspectMax = $asset.SourceAspectMax
    MaxBytes = $asset.MaxSourceBytes
  } "source $($asset.Name)"
}

Assert-NoAntiqueAssetErrors $sourceErrors

if ($ValidateOnly) {
  $outputErrors = @()

  foreach ($asset in $assets) {
    $outputPath = Join-Path $OutputDir $asset.Name
    $outputErrors += Test-AntiqueImageRequirement $outputPath @{
      MaxWidth = $asset.MaxWidth
      MaxHeight = $asset.MaxHeight
      AspectMin = $asset.OutputAspectMin
      AspectMax = $asset.OutputAspectMax
      MaxBytes = $asset.MaxOutputBytes
    } "processed $($asset.Name)"
  }

  foreach ($asset in $directAssets) {
    $outputErrors += Test-AntiqueImageRequirement $asset.OutputPath @{
      Width = $asset.OutputWidth
      Height = $asset.OutputHeight
      AspectMin = $asset.OutputAspectMin
      AspectMax = $asset.OutputAspectMax
      MaxBytes = $asset.MaxOutputBytes
    } "direct $($asset.Name)"
  }

  Assert-NoAntiqueAssetErrors $outputErrors
  Write-Output "antique asset validation passed"
  exit 0
}

foreach ($asset in $assets) {
  $inputPath = Join-Path $SourceDir $asset.Name
  $outputPath = Join-Path $OutputDir $asset.Name
  [AntiqueAssetProcessor]::Process(
    $inputPath,
    $outputPath,
    [int]$asset.MaxWidth,
    [int]$asset.MaxHeight,
    [bool]$asset.ClearInner,
    [double]$asset.X,
    [double]$asset.Y,
    [double]$asset.W,
    [double]$asset.H
  )
  $outputErrors = Test-AntiqueImageRequirement $outputPath @{
    MaxWidth = $asset.MaxWidth
    MaxHeight = $asset.MaxHeight
    AspectMin = $asset.OutputAspectMin
    AspectMax = $asset.OutputAspectMax
    MaxBytes = $asset.MaxOutputBytes
  } "processed $($asset.Name)"
  Assert-NoAntiqueAssetErrors $outputErrors
  Write-Output "processed $($asset.Name)"
}

$directOutputErrors = @()
foreach ($asset in $directAssets) {
  $directOutputErrors += Test-AntiqueImageRequirement $asset.OutputPath @{
    Width = $asset.OutputWidth
    Height = $asset.OutputHeight
    AspectMin = $asset.OutputAspectMin
    AspectMax = $asset.OutputAspectMax
    MaxBytes = $asset.MaxOutputBytes
  } "direct $($asset.Name)"
}

Assert-NoAntiqueAssetErrors $directOutputErrors
