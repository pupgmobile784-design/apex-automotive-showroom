# APEX — Interactive Automotive Experience

An immersive WebGL showroom built with Next.js, React Three Fiber, drei, Zustand,
and Tailwind. Nine real automotive GLB models sit in a dark studio arc; hovering,
holding, and scrolling move you through the collection like walking a physical
gallery floor.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Build for production:

```bash
npm run build
npm start
```

`npm run lint` and `npm run build` both pass clean (verified from a fresh
`node_modules` install). `npm run build` also type-checks the whole project.

## What's real vs. placeholder

**Everything.** There is no procedural/primitive fallback car anywhere in this
version — every vehicle on screen is the actual GLB model from the Supercar
Vault 3D pack, loaded, normalized, and lit like the rest of the scene. If a
model's file is ever missing or fails to parse, that one car is simply skipped
(see "Failure handling" below) rather than replaced with a placeholder shape.

## The fleet

| Car | File | Source |
|---|---|---|
| Pagani Imola | `public/models/pagani-imola.glb` | `2021_pagani_imola.glb` |
| McLaren F1 GTR Longtail | `public/models/mclaren-f1-gtr-longtail.glb` | `mclaren_f1_gtr_longtail__www.vecarz.com.glb` |
| Koenigsegg One:1 | `public/models/koenigsegg-one1.glb` | `2014_koenigsegg_one-1.glb` |
| McLaren P1 GTR | `public/models/mclaren-p1-gtr.glb` | `free_mclaren_p1_gtr.glb` |
| Porsche 911 GT3 RS | `public/models/porsche-911-gt3-rs.glb` | `2023_porsche_911_gt3_rs_2.7_carrera_tribute_992.glb` |
| Mercedes-AMG GT3 | `public/models/mercedes-amg-gt3.glb` | `mercedes-amg_gt3__www.vecarz.com.glb` |
| Ferrari F50 | `public/models/ferrari-f50.glb` | `1995_ferrari_f50.glb` |
| Jiotto Caspita | `public/models/jiotto-caspita.glb` | `jiotto_caspita_f1_road_car_1989_by_alex.ka..glb` |
| Ford Mustang Mach 1 | `public/models/ford-mustang-mach-1.glb` | `1969_ford_mustang_mach-1_428_cobra_jet.glb` |

All nine ship in this repo, in `/public/models`, individually 7–26 MB
(111 MB total — every file is under GitHub's 100 MB single-file limit). They
were re-exported from the source pack with `gltf-transform` (baked
transforms, merged primitives sharing a material, deduplicated/pruned
buffers — a structural cleanup, not a quality reduction; only the two
textures that shipped at 4096px were downscaled to 2048px). Nothing was
decimated and no material was simplified.

**Full attribution** for each model lives in `lib/vehicles.ts` (the
`credit` field on every entry) and is shown in-app via the **CREDITS**
button in the header. The original pack's own `README.md` is preserved
unmodified at `licenses/Supercar-Vault-3D-README.md`. Specs (power/torque/
0–100/top speed) are only shown for cars where the source pack carried real
figures — three cars (AMG GT3, Caspita, Mustang) only had a copy-pasted
placeholder spec block in the source data, so rather than invent numbers,
those fields are simply omitted for those cars in the UI.

## Files changed / added

**New:**
- `lib/normalize.ts` — auto-orients, auto-scales, centers and floors any GLB regardless of its export units/origin
- `lib/prepareMaterials.ts` — preserves every authored PBR material; only swaps expensive `KHR_materials_transmission` glass for cheap alpha-blended glass, and raises texture anisotropy
- `lib/modelCache.ts` — reference-counted GPU memory: a model's textures/geometry are freed once no car is showing it
- `lib/useCarGLTF.ts` — GLB loader with real byte-level progress (Draco/Meshopt-ready, unused by these particular files since they're uncompressed)
- `lib/useProgressiveLoad.ts` — only the active car ± 2 neighbours are ever loaded at once; the rest load in as you scroll, and release again once far away
- `components/ModelErrorNotice.tsx` — graceful on-brand message (+ a "next vehicle" button) if a car's GLB genuinely fails to load
- `components/CreditsDialog.tsx` — the attribution screen (opens from **CREDITS** in the header)
- `licenses/Supercar-Vault-3D-README.md` — the source pack's own README, preserved

**Rewritten:**
- `lib/vehicles.ts` — all 9 real cars, their GLB paths, real specs where available, and attribution
- `components/CarModel.tsx` — loads the real GLB (Suspense + per-car error isolation), no placeholder path
- `components/Car.tsx` — invisible hit-box + soft blob shadow (see "Performance" below) instead of driving materials directly; still owns all hover/drag/rotation/dimming behaviour
- `components/CarCollection.tsx` — wires up the progressive load gate
- `components/CameraController.tsx` — now frames each car by its *own measured* height/width (see "Camera" below) instead of one fixed shot
- `components/CarInfo.tsx` — shows only the spec fields a car actually has; adds the car's tagline
- `components/Header.tsx` — added the CREDITS button; header is now responsive (stacks on narrow/mobile viewports instead of overlapping — this was a genuine bug found during testing, see below)
- `components/SceneLighting.tsx` — studio reflections now render from a **local**, procedurally-lit room (`RoomEnvironment`) instead of fetching an HDRI from an external CDN (see "Bug found during verification")
- `lib/store.ts` — added load-progress/ready/failed tracking and the credits-dialog open state
- `app/page.tsx` — wires in `ModelErrorNotice` and `CreditsDialog`

**Removed:**
- `components/CarBody.tsx`, `lib/materials.ts` — the procedural placeholder body and its hand-built materials. No longer used or reachable anywhere in the normal path.

**Unchanged** (reviewed, still correct as-is): `components/CarInteraction.tsx`, `components/ScrollController.tsx`, `components/CustomCursor.tsx`, `components/VehicleNav.tsx`, `components/ErrorBoundary.tsx`, `lib/materialDimming.ts`, `lib/device.ts`, `lib/useReducedMotion.ts`.

## Normalization — no per-model hardcoding

Every car is auto-oriented (nose-along-X exports are rotated to match the
fleet's nose-along-Z), auto-scaled so its length matches the rest of the
fleet, centered, and dropped onto the studio floor — regardless of what
units or origin it was exported with (the shipped models range from 0.02 to
46 raw units long). None of the 9 shipped models needed a manual
correction. If a future model needs one, `lib/vehicles.ts` has three
optional per-car fields (`rotationOffset`, `scaleMultiplier`,
`positionOffset`) that correct it from data alone — nothing in
`CarModel.tsx` or `normalize.ts` needs to change.

## Camera

`CameraController.tsx` reads each car's own measured height/width (written
once per load by `normalize.ts`) and scales the camera's height and
pull-back distance to it, so a low hypercar and a boxier muscle car both
sit in frame the same way — not one fixed shot tuned for a single
silhouette.

## Performance

Nine real, detailed GLBs (up to a few hundred thousand triangles each)
can't all be on screen, loaded, and lit the same way a handful of boxes
could:

- **Progressive loading** (`lib/useProgressiveLoad.ts`) — only the active
  car and its two nearest neighbours in the arc are ever loaded; the rest
  load in, nearest-first, as the fleet rotates towards them, and release
  again once they've drifted far away.
- **GPU memory is freed**, not just left to the GC, once a car's model is
  no longer shown (`lib/modelCache.ts`): geometries, materials, and — since
  decoded images can be large — the decoded textures themselves.
- **No per-car real-time shadow casting for the whole fleet.** Only the
  active car casts a real shadow; every other car gets a cheap static
  radial "contact blob" shadow (a single always-cheap plane), which is
  indistinguishable at a glance in a dark studio but avoids re-rendering
  eight full shadow maps every frame.
- **Hover/click hit-testing** uses a small invisible box sized to each
  car's real bounding box, not its actual (hundreds-of-thousands-of-
  triangle) mesh — raycasting is O(1) instead of O(triangles).
- **`KHR_materials_transmission` glass** (real refractive glass, which
  three.js renders via an extra full-scene offscreen pass, every frame,
  per transmissive object) is swapped for ordinary alpha-blended glass of
  the same tint in `lib/prepareMaterials.ts` — visually equivalent against
  a dark backdrop, without doubling render cost per car that has it.
- Existing adaptive quality (`PerformanceMonitor` dropping DPR, shadow
  resolution, and disabling contact shadows/reflections under load) is
  unchanged and still applies on top of all of the above.

## Bug found during verification

While testing, `SceneLighting.tsx`'s studio reflections turned out to
depend on fetching an HDRI file from an external CDN
(`raw.githack.com`) at runtime — a real fragility risk (one failed/blocked
request away from either a broken environment or, since it shared a
Suspense boundary with the car collection, stalling the whole scene). Fixed
by rendering the studio environment locally from a procedurally-lit room
(`RoomEnvironment`, bundled with three.js) instead — no network dependency,
same visual result.

A second issue — the header's nav overlapping/clipping the "APEX" wordmark
on narrow (~390px) viewports — was also found and fixed (`Header.tsx` now
stacks vertically below that breakpoint).

## Failure handling

If a specific `.glb` is missing or fails to parse, `CarModel.tsx` isolates
the failure to that one car (its own `ErrorBoundary` + `Suspense`): the
other eight keep working, the Canvas doesn't crash, and
`ModelErrorNotice.tsx` shows an on-brand message with a one-tap "next
vehicle" button instead of leaving that spot on the stage silently empty.

## Verification performed

- `npm run lint` — clean
- `npm run build` — clean (compiles, type-checks, prerenders `/`)
- Full app loaded headlessly and screenshotted for two structurally
  different cars (a low hypercar and a boxier muscle car) — both correctly
  oriented, scaled, floored, and framed; zero console errors/warnings in
  either case
- Same test repeated at a 390×844 mobile viewport with touch emulated —
  same result, and is what caught the header bug above
- Verified every model file is under GitHub's 100 MB per-file limit

Not verified in this pass (no way to simulate a physical touchscreen or a
real GPU from this environment): actual pinch-to-zoom gesture feel, and
frame-rate on real low-end mobile hardware. The interaction code paths
themselves are unchanged from the version already built for hover/drag/
scroll/touch, and PerformanceMonitor's adaptive quality still applies.

## Adding another car

1. Drop the `.glb` in `/public/models/`.
2. Add an entry to `VEHICLES` in `lib/vehicles.ts` — id, name, brand, model
   path, real specs if you have them, and a `credit` block. Add
   `rotationOffset`/`scaleMultiplier`/`positionOffset` only if the model
   needs a correction (see "Normalization" above).

That's it — the arc, camera, loader, progressive-load gate, dot indicator,
and credits dialog all read that array directly.

## Deploying (Vercel via GitHub)

From the repo root:

```bash
git add -A
git commit -m "Integrate real GLB models from Supercar Vault 3D"
git push origin main
```

`vercel.json` (already in the repo root) pins the framework to Next.js, and
`.gitignore` excludes `node_modules`/`.next`, so the push stays well clear
of GitHub's size limits even with the 111 MB of models included. Vercel
will pick up the push and redeploy automatically — no dashboard changes
needed beyond what's already configured.
