# DevLog-002: GLB Viewer alongside PLY Viewer

**Date**: 2026-10-05
**Status**: Done

## Requirement

Load a GLB model by link or by upload, using the same UI/UX and operations as the PLY (3DGS) viewer.

## Plan

- Format detection by extension of file name or URL path: `.glb` / `.gltf` -> GLB path, everything else -> existing Spark splat path (unchanged behavior).
- `App.tsx` tracks `format` next to the URL, since blob URLs from uploads carry no extension.
- `SplatViewer.tsx` gets a `format` prop and loads either:
  - PLY: `SplatLoader` + `SplatMesh` (unchanged transform: pos (0,1,0), scale 0.5, rot x 210 deg).
  - GLB: `GLTFLoader` with `DRACOLoader` (decoder from gstatic CDN, fetched only for Draco files) and `MeshoptDecoder` (bundled). Model wrapped in a pivot group at (0,1,0), centered on its bounding box and scaled to max dimension 1, so it frames like the splats and arrow-key rotation pivots about the model center. glTF is Y-up, so no initial rotation.
  - Lighting for GLB: PMREM `RoomEnvironment` as `scene.environment`, only while a GLB is loaded (splats ignore it).
- Same controls for both: OrbitControls, WASDQE (+Shift fine), arrows / `[` `]` rotate the loaded object, debug panel, progress bar, error banner.
- Dispose GLB geometries/materials/textures when replacing the model.
- Landing page: URL placeholder, drop zone text and `accept` mention GLB.

## TODO

- [x] DevLog plan
- [x] Format detection util
- [x] Viewer GLB loading path
- [x] App / landing page wiring
- [x] Build + lint
- [x] Browser test: GLB by URL, GLB by upload, Draco glTF by URL, PLY regression

## Progress

- 2026-10-05: implemented. `pnpm run build` passes; `pnpm lint` shows only the 2 pre-existing warnings (containerRef cleanup, intentional callback omission from DevLog-001).
- 2026-10-05: headless Chromium (SwiftShader) test against the dev server, screenshots inspected:
  - GLB by `?url=` (Khronos DamagedHelmet.glb, 3.8 MB): renders centered with PBR env lighting, "Loading complete!" shown.
  - GLB by upload (same file via the landing page file input): identical render.
  - Draco glTF by `?url=` (Khronos Duck glTF-Draco): decoder fetched from CDN, renders.
  - PLY regression (SAM3 wirebonds, 18 MB): renders as before, scene rotation 210/0/360 deg.
  - Arrow keys rotate the GLB about its center (debug panel X 30, Y 45 deg); WASD moves camera as for splats.

## Notes

- `.gltf` with external buffers/textures works by URL (relative resources resolve) but not by upload (single file only); upload `accept` is `.ply,.glb`.
- KTX2-compressed textures are not configured (needs a transcoder path); GLB animations are not played.
