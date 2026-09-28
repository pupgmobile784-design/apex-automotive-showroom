# APEX — Interactive Automotive Experience

An immersive WebGL showroom built with Next.js, React Three Fiber, drei, Zustand,
and Tailwind. Six cars sit in a dark studio arc; hovering, holding, and scrolling
move you through the collection like walking a physical gallery floor.

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

`npm run lint`, `npm run build`, and `npx tsc --noEmit` all pass clean as of
this version (verified from a fresh `node_modules` install, including a
production `next start` boot test).

## Interaction model (unchanged)

- **Hover** a car in the arc → it brightens, steps toward camera, tilts subtly
  toward the cursor, others dim.
- **Click** a car in the arc → it becomes the focused car (smooth camera
  push-in, cinematic auto-rotate starts).
- **Click and hold** the focused car, then **drag horizontally** → rotate it
  manually; release and it keeps spinning briefly on inertia before settling
  back into the cinematic auto-rotate.
- **Scroll / swipe vertically**, or **arrow keys** → cycle to the next/previous
  car; the whole fleet reflows around the new focus.
- **Pinch** (touch) → zoom the camera in/out on the focused car.
- Mouse position always drives a small camera parallax, on top of all of the
  above (skipped when `prefers-reduced-motion` is set).
- Tab through the page → a visually-hidden, focus-visible vehicle list lets
  keyboard/screen-reader users select a car directly, since the 3D scene has
  no native DOM semantics of its own.
- Adaptive performance (`PerformanceMonitor`) still trims DPR and the
  heaviest lighting effects under load.

## What changed in this pass

This was a **polish pass on the existing architecture**, not a rebuild — no
interaction, component, or file was removed. Everything below was added or
tightened to make the project ready for real automotive GLBs.

### 1. Real GLB material handling was the core fix
`CarModel.tsx` used to force `material.transparent = true` on **every**
material pulled from a loaded GLB, then faded cars in/out via `opacity`.
That's exactly what breaks real production models: flipping an opaque
paint/chrome/carbon material to transparent changes how three.js sorts and
blends it, which shows up as flicker/ghosting once a car has overlapping
body panels, glass, and interior geometry.

- `CarModel.tsx` no longer touches `transparent`/`opacity` on GLB materials
  at all — whatever the model authored (opaque paint, transparent glass,
  metallic chrome, matte tires) is preserved exactly.
- A new shared module, **`lib/materialDimming.ts`**, replaces opacity-based
  fading with a "presence" system driven by color intensity +
  `envMapIntensity` + `emissiveIntensity`. The focused/hovered car reads
  brighter and more reflective; idle cars recede by darkening and reducing
  reflection strength — never by going see-through. It reads a snapshot
  ("baseline") of each material's authored appearance once, so real GLB
  emissive strips (e.g. brake lights) keep their own base glow and only get
  a boost on focus, instead of being reset to black when idle.
- `lib/materials.ts` (the procedural placeholder's materials) was updated to
  match: only glass is authored as `transparent`, everything else is opaque,
  with metalness/roughness/`envMapIntensity` tuned for stronger studio
  reflections on paint/chrome.

### 2. Real GLB readiness
- `public/models/` now exists with a README describing the expected
  filenames (matching `lib/vehicles.ts` exactly) — **no placeholder/fake
  `.glb` files were added**, per your instruction. The site runs fully on
  the procedural fallback until real files are dropped in.
- `Vehicle` (`lib/vehicles.ts`) gained three optional fields —
  `rotationOffset`, `scaleMultiplier`, `positionOffset` — so a model that
  loads facing the wrong way, at the wrong proportion, or slightly off the
  floor can be corrected per-car from data alone, without ever touching
  `CarModel.tsx`.
- `CarModel.tsx`'s normalization pipeline now applies `rotationOffset`
  *before* measuring the model's bounding box, so auto-scale/center/floor
  are computed correctly in the model's corrected orientation, then applies
  `scaleMultiplier` and `positionOffset` on top.

### 3. Progressive loading, prioritizing the active vehicle
All six cars are visible in the arc simultaneously (that's core to the
gallery UX), but they no longer all fetch/decode their GLBs in one burst:
- **`lib/useProgressiveLoad.ts`** (new) gates which cars are allowed to
  attempt their real model. The active vehicle is always allowed instantly
  (including the moment it changes, so clicking a new car never waits); the
  rest of the fleet stagger in shortly after first paint. A car that isn't
  "allowed" yet simply shows its normal procedural placeholder — visually
  identical to the loading state a real model already has.
- `CarCollection.tsx` also preloads the active car's immediate neighbors
  (`useGLTF.preload`) so `next()`/`prev()` doesn't pop to the placeholder,
  with preload rejections safely swallowed (no console noise while
  `public/models/` is still empty).

### 4. Lighting
`SceneLighting.tsx`'s `Environment` preset changed from `"city"` (skyline
reflections) to `"studio"` (softbox-style reflections), which reads as a
dark automotive studio rather than a Three.js demo, per the brief.
Environment resolution now also drops under `PerformanceMonitor`'s
`lowQuality` flag, same as the floor reflection and contact shadows already
did.

### 5. Mobile performance
`AutomotiveScene.tsx` now starts at a lower initial DPR (1 instead of 1.5)
on coarse-pointer (touch) devices, rather than starting high and stepping
down only after `PerformanceMonitor` notices a slow frame.

### 6. Loading screen
`LoadingScreen.tsx` now shows the actual numeric percentage next to the
progress bar (still driven entirely by drei's real `useProgress`, never a
fake number).

### 7. Visual polish
`CarInfo.tsx` gained a small active-vehicle dot indicator next to the
01/06 counter, and slightly more breathing room in the spec grid. UI stays
minimal — the car is still the only thing that moves.

### 8. Code quality / performance fixes
- **`CarInfo.tsx`** was calling `useApexStore()` with no selector — a
  whole-store subscription that re-rendered it on *every* pointer move,
  drag tick, and camera update in the app, despite only ever reading
  `vehicles`/`activeIndex`. Fixed to selective subscriptions.
- **`Car.tsx`** and **`CameraController.tsx`** were subscribing to
  `hoveredId`/`isHeld`/`dragRotation`/`pointer`/`reducedMotion` via the
  Zustand hook purely to read them inside `useFrame` — meaning React
  re-rendered these components on every pointer move/drag tick even though
  nothing in their actual JSX output depends on those values. Both now read
  this per-frame state with `useApexStore.getState()` directly inside the
  `useFrame` callback, which is the standard R3F + Zustand pattern for
  values that only drive imperative animation. `Car.tsx` (× 6 instances)
  effectively no longer re-renders due to pointer/drag/hover activity at
  all.
- Minor: hoisted two `Vector3` constants in `CameraController.tsx` that were
  being allocated fresh every frame.

## Where things live

```
app/                     Next.js App Router shell (layout, page, globals.css)
lib/
  vehicles.ts              Vehicle data shape (id, name, brand, model, specs, color,
                            rotationOffset/scaleMultiplier/positionOffset)
  store.ts                 Shared zustand store (hover/focus/drag/inertia/zoom/reduced-motion)
  materials.ts              Shared PBR material presets (paint, glass, chrome, carbon, tire, rim, headlight)
  materialDimming.ts        Hover/focus "presence" system (color + envMapIntensity + emissiveIntensity)
  useProgressiveLoad.ts     Gates which cars attempt their real GLB, active vehicle first
  useReducedMotion.ts       Syncs prefers-reduced-motion into the store
components/
  AutomotiveScene.tsx       Canvas root: lighting + camera + car collection + adaptive quality
  CarCollection.tsx         Places every vehicle in the arc, figures out who's "active",
                             drives the progressive-load gate + neighbor preloading
  Car.tsx                   One vehicle: position/scale/rotation/brightness animation
  CarModel.tsx              Loads a real GLB via useGLTF, auto-normalizes + applies per-car
                             orientation config, falls back gracefully
  CarBody.tsx               High-quality procedural placeholder body (used until/if a GLB is missing)
  ErrorBoundary.tsx         Generic React error boundary (used per-car, and around the whole scene)
  CarInteraction.tsx        Pointer-event hook (hover / hold / drag / inertia)
  CameraController.tsx      Cinematic camera rig (push-in + parallax + pinch-zoom)
  SceneLighting.tsx         Studio key/rim/fill lights, reflective floor, contact shadows, fog
  ScrollController.tsx      Wheel + touch-swipe + pinch + arrow-key input
  CustomCursor.tsx          Minimal dot cursor (EXPLORE / ROTATE), disabled on coarse pointers
  LoadingScreen.tsx         Premium loading overlay (drei's useProgress, real percentage)
  VehicleNav.tsx            Accessible, keyboard-reachable car selection
  CarInfo.tsx               Bottom-left spec readout + bottom-right dot indicator/01-06 counter
  Header.tsx                APEX wordmark + top-right nav
public/
  models/                   Drop real .glb files here — see public/models/README.md
```

## Adding real GLB car models

1. Drop `.glb` files into `public/models/` matching the paths already listed
   in `lib/vehicles.ts` (e.g. `model: "/models/porsche-911-gt3.glb"`). See
   `public/models/README.md` for the exact filenames and compression notes.
2. Load it and look at it. If it's:
   - **facing the wrong way** → add `rotationOffset: Math.PI` (or whatever
     radian value corrects it) to that vehicle's entry in `lib/vehicles.ts`
   - **too big/small relative to the rest of the fleet** → add
     `scaleMultiplier` (e.g. `1.1` for 10% bigger)
   - **slightly off the floor or off-center** → add `positionOffset: [x, y, z]`
   
   None of this requires touching `CarModel.tsx` — see the `Vehicle`
   interface comment in `lib/vehicles.ts`.
3. That's it. `CarModel` will:
   - load it with `useGLTF` inside a `Suspense` boundary (showing the
     placeholder body as a loading state), staggered by
     `lib/useProgressiveLoad.ts` so the active vehicle always loads first,
   - auto-scale it so its longest horizontal dimension matches the rest of
     the fleet, center it, and drop it onto the studio floor, honoring your
     per-vehicle corrections,
   - preserve every material's authored properties (transparency, metalness,
     roughness, color) exactly — only color intensity/reflection
     strength/emissive get nudged for the hover/focus effect,
   - fall back to the procedural `CarBody` if the fetch 404s or the file
     fails to parse, isolated per-car via `ErrorBoundary` so one bad file
     never affects the other five or crashes the Canvas.

### Adding a brand-new car (not just replacing a model)

Append a new entry to `VEHICLES` in `lib/vehicles.ts` with its own `id`,
`model` path, specs, and placeholder `color`. Nothing else needs to change —
`CarCollection` reads the array length directly, so the arc, navigation,
counter, and progressive loader all pick it up automatically.

## Typography note

`.apex-display` / `.apex-mono` (in `app/globals.css`) currently use
dependency-free system font stacks (condensed sans + monospace) rather than
Google Fonts — a deliberate choice made while testing in a sandboxed build
environment without access to `fonts.googleapis.com`. If your deployment
target has normal network access, swapping in `next/font/google` (Oswald +
JetBrains Mono pair well with the existing letter-spacing/uppercase
treatment) is a ~10-line change contained to `app/layout.tsx` and the two
CSS variables at the top of `globals.css`.

## Accessibility

- `prefers-reduced-motion` is synced into the store and respected by the
  camera rig, the cinematic auto-rotate, and CSS transitions/animations.
- The custom cursor and its CSS `cursor: none` are both disabled on coarse
  (touch) pointers via `matchMedia`, not just viewport width.
- `VehicleNav` gives keyboard/screen-reader users a real, labeled way to
  select any car, since 3D hover/click has no DOM equivalent.
- Header nav buttons have `aria-label`s and visible focus states.

## Performance notes

- `PerformanceMonitor` (drei) watches actual frame times and responds by
  lowering `dpr` first (starting lower already on touch devices), then
  dropping shadow map resolution, environment/floor-reflection resolution,
  and disabling contact shadows — adaptive rather than a fixed "is this a
  phone" guess.
- Real GLB loading is staggered by `lib/useProgressiveLoad.ts` so the
  active vehicle always has loading priority; neighbors are preloaded so
  navigation feels instant once models are in place.
- `useGLTF` uses Draco/Meshopt decoding by default (drei's default), so a
  compressed export will parse meaningfully faster.
- Non-focused cars are dimmed + scaled down via `lib/materialDimming.ts`,
  which is also cheap to extend into a future LOD pass.

## Known simplifications (by design, for this pass)

- Cars are procedural placeholders until real GLBs are added — the loading
  pipeline, per-car fallback, progressive-load gate, and
  presence/brightness system are all real and exercised today against the
  actual failure path (missing files), since no real GLB exists in the repo.
- Pinch-to-zoom moves the camera; it does not (yet) reproject to keep the
  pinch midpoint fixed on-screen, which is the next natural refinement if a
  more precise touch-zoom feel is wanted.
