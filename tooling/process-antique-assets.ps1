param(
  [string]$SourceDir = "assets/ui/antique/source",
  [string]$OutputDir = "assets/ui/antique/processed"
)

Add-Type -AssemblyName System.Drawing

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
  @{ Name = "oval-table-wide.png"; MaxWidth = 1672; MaxHeight = 941; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "room-frame-round.png"; MaxWidth = 640; MaxHeight = 640; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "seat-frame.png"; MaxWidth = 420; MaxHeight = 420; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "label-strip.png"; MaxWidth = 1254; MaxHeight = 314; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "card-face-normal.png"; MaxWidth = 212; MaxHeight = 297; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "card-face-special-1.png"; MaxWidth = 212; MaxHeight = 297; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "card-face-danger-15.png"; MaxWidth = 212; MaxHeight = 297; ClearInner = $true; X = 0.09; Y = 0.16; W = 0.82; H = 0.74 },
  @{ Name = "card-back.png"; MaxWidth = 212; MaxHeight = 297; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 },
  @{ Name = "cucumber-icon.png"; MaxWidth = 256; MaxHeight = 256; ClearInner = $false; X = 0; Y = 0; W = 0; H = 0 }
)

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
  Write-Output "processed $($asset.Name)"
}
