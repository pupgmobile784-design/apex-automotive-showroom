# /public/models

Drop real `.glb` files here with these exact names — `lib/vehicles.ts`
already points at each path, so nothing else needs to change:

```
public/models/
  porsche-911-gt3.glb
  bmw-m4.glb
  amg-gt.glb
  audi-r8.glb
  lamborghini-huracan.glb
  ferrari-488.glb
```

No file for a given car? `CarModel` automatically renders the procedural
placeholder body instead — the site works fully with zero, some, or all six
present. A broken/corrupt file behaves the same way (falls back), and never
affects the other five cars.

## If a model loads facing the wrong way, at the wrong scale, or slightly
## off the floor

Don't touch `CarModel.tsx`. Add `rotationOffset` / `scaleMultiplier` /
`positionOffset` to that vehicle's entry in `lib/vehicles.ts` instead — see
the comment above the `Vehicle` interface there for the exact shape and an
example.

## Tips for the source files

- Keep individual files reasonably sized (a few MB, not tens) — Draco/Meshopt
  compression is already supported by the loader (`useGLTF` defaults both
  to on), so a compressed export will load meaningfully faster.
- Real-world scale units (meters) aren't required — the loader auto-fits
  every model to the fleet's shared length regardless of source scale.
- Standard PBR materials (`MeshStandardMaterial` / `MeshPhysicalMaterial`)
  are preserved as authored: transparency, metalness, roughness, etc. are
  never overridden. Only color/reflection-intensity/emissive are nudged for
  the hover/focus effect — see `lib/materialDimming.ts`.
