import { BufferGeometry, Material, Mesh, Object3D, Texture } from "three";
import { clearCarGLTF } from "./useCarGLTF";

/**
 * Reference-counted lifetime for loaded GLBs.
 *
 * The loader caches each file forever, and cars share geometry/materials with
 * that cached scene. With nine multi-megabyte models that would keep
 * hundreds of MB of decoded textures alive, so once no <Car> is showing a
 * model any more we free its GPU buffers, close its decoded images and drop
 * it from the cache (re-visiting it later just re-reads the browser's HTTP
 * cache).
 *
 * The release is deferred one tick so a React StrictMode
 * mount → unmount → remount (dev only) never frees a model that is about to
 * be used again.
 */
const refCounts = new Map<string, number>();

export function retainModel(url: string) {
  refCounts.set(url, (refCounts.get(url) ?? 0) + 1);
}

export function releaseModel(url: string, scene: Object3D) {
  const next = (refCounts.get(url) ?? 1) - 1;
  refCounts.set(url, next);
  if (next > 0) return;
  window.setTimeout(() => {
    if ((refCounts.get(url) ?? 0) > 0) return;
    disposeScene(scene);
    clearCarGLTF(url);
    refCounts.delete(url);
  }, 0);
}

function disposeTexture(texture: Texture, seen: Set<Texture>) {
  if (seen.has(texture)) return;
  seen.add(texture);
  const image = texture.image as { close?: () => void } | undefined;
  texture.dispose();
  // Decoded ImageBitmaps live in RAM until closed explicitly.
  if (image && typeof image.close === "function") image.close();
}

export function disposeScene(root: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
      (m) => materials.add(m)
    );
  });

  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (value && (value as Texture).isTexture) {
        disposeTexture(value as Texture, textures);
      }
    });
    material.dispose();
  });
  geometries.forEach((g) => g.dispose());
}
