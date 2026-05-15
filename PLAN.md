# Five_Cucumber Plan

This file records the active project direction for AI-assisted work.

## Active Direction

Five_Cucumber is Web-first.

Until the Web version is complete or the user explicitly changes direction, implementation should focus on the existing Web stack:

- Next.js
- TypeScript / TSX
- pnpm
- Turborepo
- Firebase-related configuration already present in the repository
- Ably / shared-store diagnostics already present in the repository

## Deferred Direction: Unity and Blender

Unity and Blender are deferred until after the Web version is complete.

They may become useful later if the project needs:

- higher-fidelity 3D cucumber, card, table, or scene assets,
- generated animation or visual material that improves the Web version,
- promotional or cinematic visuals,
- a separate Unity prototype or edition.

Do not add Unity or Blender files during ordinary Web implementation. If the idea becomes relevant, discuss it first and record the decision before implementation.

## Near-Term Priorities

1. Keep AI collaboration rules explicit and easy to follow.
2. Stabilize the Web MVP and core Five Cucumbers gameplay.
3. Improve room flow, realtime state, diagnostics, and deployment confidence.
4. Polish UI and accessibility after core behavior is reliable.
5. Reassess Unity / Blender only after the Web version reaches a clear completion point.

## Open Decisions

- Define the exact acceptance criteria for "Web version complete."
- Decide whether future Blender use is asset-generation only or part of a larger 3D workflow.
- Decide whether Unity is ever a separate edition, a prototype, or unnecessary.
