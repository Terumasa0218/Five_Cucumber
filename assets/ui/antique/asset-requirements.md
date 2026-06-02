# Antique UI Asset Requirements

This document defines the accepted image assets for the antique cucumber UI direction.
Replacement assets should keep the same file names and pass `tooling/process-antique-assets.ps1 -ValidateOnly`.

## Validation Command

```powershell
powershell -ExecutionPolicy Bypass -File tooling\process-antique-assets.ps1 -ValidateOnly
```

To regenerate processed cutouts:

```powershell
powershell -ExecutionPolicy Bypass -File tooling\process-antique-assets.ps1
```

## Shared Requirements

- Format: PNG.
- File name: exact match. The implementation expects these names.
- Source path: `assets/ui/antique/source/`.
- Processed path: `assets/ui/antique/processed/`, except `wood-table.png`, which is used directly at `assets/ui/antique/wood-table.png`.
- Transparent cutouts: source images may contain baked checkerboard, but processed images must be alpha-cleaned and cropped by the script.
- Source dimensions are strict. This keeps generated replacements from shifting layout unexpectedly.
- Processed dimensions are maximums. Cropping can change the final width and height, but the output must fit within the declared box.
- Aspect ratio is `width / height`.

## Asset Table

| File name | Part | Current source | Source requirement | Source max | Processed / direct output requirement | Output max |
| --- | --- | ---: | --- | ---: | --- | ---: |
| `wood-table.png` | Battle background | 1672x941, 1,972,455 bytes, ratio 1.777 | 1672x941, ratio 1.74-1.82 | 3,000,000 bytes | Direct: 1672x941, ratio 1.74-1.82 | 3,000,000 bytes |
| `oval-table-wide.png` | CPU battle oval table frame | 1672x941, 2,259,383 bytes, ratio 1.777 | 1672x941, ratio 1.74-1.82 | 3,000,000 bytes | Processed: <=1672x941, ratio 1.78-1.90 | 3,500,000 bytes |
| `room-frame-round.png` | Room and lobby circular frame | 1254x1254, 1,804,898 bytes, ratio 1.000 | 1254x1254, ratio 0.98-1.02 | 2,500,000 bytes | Processed: <=640x640, ratio 0.94-1.04 | 1,000,000 bytes |
| `seat-frame.png` | Player seat frame | 1254x1254, 1,686,393 bytes, ratio 1.000 | 1254x1254, ratio 0.98-1.02 | 2,500,000 bytes | Processed: <=420x420, ratio 0.90-1.02 | 512,000 bytes |
| `label-strip.png` | Long label strip | 2508x627, 1,340,708 bytes, ratio 4.000 | 2508x627, ratio 3.95-4.05 | 2,000,000 bytes | Processed: <=1254x314, ratio 5.80-6.80 | 512,000 bytes |
| `card-face-normal.png` | Normal card face frame | 1060x1484, 1,564,464 bytes, ratio 0.714 | 1060x1484, ratio 0.70-0.73 | 2,500,000 bytes | Processed: <=212x297, ratio 0.66-0.74 | 256,000 bytes |
| `card-face-special-1.png` | Special card face frame | 1060x1484, 1,894,522 bytes, ratio 0.714 | 1060x1484, ratio 0.70-0.73 | 2,500,000 bytes | Processed: <=212x297, ratio 0.66-0.74 | 256,000 bytes |
| `card-face-danger-15.png` | Danger 15 card face frame | 1060x1484, 1,286,864 bytes, ratio 0.714 | 1060x1484, ratio 0.70-0.73 | 2,500,000 bytes | Processed: <=212x297, ratio 0.66-0.74 | 256,000 bytes |
| `card-back.png` | Card back | 1060x1484, 1,993,408 bytes, ratio 0.714 | 1060x1484, ratio 0.70-0.73 | 2,500,000 bytes | Processed: <=212x297, ratio 0.66-0.74 | 256,000 bytes |
| `cucumber-icon.png` | Cucumber point icon | 1254x1254, 1,010,094 bytes, ratio 1.000 | 1254x1254, ratio 0.98-1.02 | 1,500,000 bytes | Processed: <=256x256, ratio 0.82-0.94 | 128,000 bytes |

## Implementation Rejection Rules

The processing script fails before writing output when a source asset is missing, renamed, non-PNG, too large, or outside its required dimensions/aspect ratio.

`-ValidateOnly` also fails when processed/direct assets are missing, oversized, or outside their allowed output dimensions/aspect ratio. Use it before committing replacement assets.

## Notes

- `card-face-danger-15.png` clears checkerboard pixels inside the card center in addition to edge cleanup.
- `wood-table.png` is intentionally direct-use because it is the full background texture, not a transparent cutout.
- If the UI later needs higher-resolution exports, update this document and the script requirements in the same change.
