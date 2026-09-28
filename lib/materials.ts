import { MeshStandardMaterial } from "three";

/**
 * Centralized PBR material presets so every placeholder car reads as
 * automotive photography rather than a game asset, tuned for the
 * dark-studio Environment + spot rig in SceneLighting.tsx.
 *
 * Only glass is authored as transparent. Everything else is fully opaque —
 * on real GLB materials we never override this (see CarModel.tsx), and on
 * these placeholder materials we don't fake it either, so the renderer's
 * default depth sorting is never disturbed. Focus/hover brightening is
 * handled separately, via color + envMapIntensity + emissiveIntensity (see
 * lib/materialDimming.ts) rather than opacity.
 */

export function createPaintMaterial(color: string) {
  return new MeshStandardMaterial({
    color,
    metalness: 0.92,
    roughness: 0.2,
    // Tinted-to-paint emissive at zero intensity: invisible until the
    // presence system nudges emissiveIntensity up on focus, at which point
    // the paint itself reads with a subtle self-glow instead of just
    // catching more light.
    emissive: color,
    emissiveIntensity: 0,
    envMapIntensity: 1.5,
  });
}

export function createGlassMaterial() {
  return new MeshStandardMaterial({
    color: "#0a0a0d",
    metalness: 0.2,
    roughness: 0.05,
    transparent: true,
    opacity: 0.82,
    envMapIntensity: 1.3,
  });
}

export function createChromeMaterial() {
  return new MeshStandardMaterial({
    color: "#ededed",
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1.7,
  });
}

export function createTireMaterial() {
  return new MeshStandardMaterial({
    color: "#050505",
    metalness: 0.05,
    roughness: 0.92,
    envMapIntensity: 0.4,
  });
}

export function createRimMaterial() {
  return new MeshStandardMaterial({
    color: "#c9c9c9",
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: 1.3,
  });
}

export function createCarbonMaterial() {
  return new MeshStandardMaterial({
    color: "#0b0b0d",
    metalness: 0.3,
    roughness: 0.4,
    envMapIntensity: 0.8,
  });
}

export function createHeadlightMaterial() {
  return new MeshStandardMaterial({
    color: "#fefefe",
    emissive: "#ffffff",
    emissiveIntensity: 0.4,
    metalness: 0.1,
    roughness: 0.15,
    envMapIntensity: 1,
  });
}
