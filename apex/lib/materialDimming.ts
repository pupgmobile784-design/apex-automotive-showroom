import { Color, Material, MathUtils, MeshStandardMaterial } from "three";

/**
 * Drives the fleet's "emerging from darkness" look — the focused/hovered
 * car reads brighter, everything else recedes — without ever touching
 * `transparent` or `opacity`.
 *
 * The old approach forced every material's `transparent = true` and
 * animated `opacity`. That's exactly what production GLB models can't
 * tolerate: flipping an opaque paint/chrome/carbon material to transparent
 * changes how three.js sorts and blends it, which shows up as flickering
 * or incorrect draw order once a real car has overlapping panels, glass,
 * and interior geometry. Real transparency (glass) should be authored by
 * the model and left alone.
 *
 * Instead, "focus" is expressed as:
 *  - color pulled up/down toward the material's own authored color
 *  - envMapIntensity pulled up/down (reflections read stronger when lit)
 *  - emissiveIntensity nudged up on top of whatever the material already
 *    had (a real headlight/brake-light keeps glowing at its authored
 *    level even when idle; it just gets an extra boost when focused —
 *    and a material with black emissive, i.e. almost everything on a real
 *    GLB, is completely unaffected, which is the safe default)
 */

type PBRMaterial = MeshStandardMaterial;

function isPBRMaterial(material: Material): material is PBRMaterial {
  return (material as PBRMaterial).isMeshStandardMaterial === true;
}

interface Baseline {
  color: Color;
  emissiveIntensity: number;
  envMapIntensity: number;
}

const baselines = new WeakMap<Material, Baseline>();

/**
 * Snapshot a material's authored appearance the first time we see it.
 * Idempotent — safe to call every time a car mounts, even though real GLB
 * materials are shared by reference across mounts (drei's useGLTF cache).
 * Every later update reads from this baseline rather than the live
 * (already-mutated) values, so repeated dimming/brightening never drifts.
 */
export function captureMaterialBaseline(material: Material) {
  if (!isPBRMaterial(material) || baselines.has(material)) return;
  baselines.set(material, {
    color: material.color.clone(),
    emissiveIntensity: material.emissiveIntensity,
    envMapIntensity: material.envMapIntensity,
  });
}

const RECEDED_BRIGHTNESS = 0.4; // how dark an inactive car's color/reflections get
const RECEDED_ENV = 0.55;
const HOVER_GLOW = 0.16;
const ACTIVE_GLOW = 0.35;

/**
 * Per-frame update for one material. No-ops silently for anything without
 * a captured baseline (an unsupported material type, or a mesh that never
 * went through captureMaterialBaseline) so an unusual imported material can
 * never throw here — it just renders at whatever it authored.
 */
export function applyMaterialPresence(
  material: Material,
  isActive: boolean,
  isHovered: boolean,
  lambda: number,
  delta: number
) {
  const base = baselines.get(material);
  if (!base || !isPBRMaterial(material)) return;

  const focus = isActive || isHovered ? 1 : 0;
  const brightness = MathUtils.lerp(RECEDED_BRIGHTNESS, 1, focus);
  const envFactor = MathUtils.lerp(RECEDED_ENV, 1, focus);
  const glow = isActive ? ACTIVE_GLOW : isHovered ? HOVER_GLOW : 0;

  material.color.r = MathUtils.damp(
    material.color.r,
    base.color.r * brightness,
    lambda,
    delta
  );
  material.color.g = MathUtils.damp(
    material.color.g,
    base.color.g * brightness,
    lambda,
    delta
  );
  material.color.b = MathUtils.damp(
    material.color.b,
    base.color.b * brightness,
    lambda,
    delta
  );

  material.envMapIntensity = MathUtils.damp(
    material.envMapIntensity,
    base.envMapIntensity * envFactor,
    lambda,
    delta
  );

  material.emissiveIntensity = MathUtils.damp(
    material.emissiveIntensity,
    base.emissiveIntensity + glow,
    lambda,
    delta
  );
}
