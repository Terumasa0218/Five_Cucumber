# Antique UI Assets

Generated source assets for the antique cucumber table direction.

## Status

- `wood-table.png` is production-ready and used as the battle background.
- Files under `source/` are preserved source references from the May 27, 2026 generation batch.
- The generated `source/` PNGs are RGB images with the checkerboard baked into the pixels.
- Files under `processed/` are alpha-cleaned, cropped, and resized for Web UI use.

## Processing

Asset requirements are defined in `asset-requirements.md`.

Run this from the repository root to regenerate `processed/`:

```powershell
powershell -ExecutionPolicy Bypass -File tooling\process-antique-assets.ps1
```

The cleanup script preserves `source/` and writes transparent PNGs into `processed/`.

To validate current source and processed assets without rewriting files:

```powershell
powershell -ExecutionPolicy Bypass -File tooling\process-antique-assets.ps1 -ValidateOnly
```
