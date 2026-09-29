import { Material, Mesh, MeshPhysicalMaterial, Object3D } from "three";
import { captureMaterialBaseline } from "./materialDimming";

/**
 * Walk a freshly-loaded car once and get its materials ready for the
 * showroom. Everything the artist authored is kept exactly as-is — paint,
 * chrome, carbon, rubber, textures, metalness/roughness, alpha modes. Only
 * two things are touched:
 *
 * 1. KHR_materials_transmission glass (a MeshPhysicalMaterial with
 *    transmission > 0). Three.js renders every transmissive object through
 *    an extra full-scene render into an offscreen buffer, every frame. With
 *    several cars on screen that roughly doubles the cost of the whole
 *    scene, on exactly the devices least able to afford it. It's swapped
 *    for ordinary alpha-blended glass of the same tint, which looks the
 *    same against a dark studio and costs nothing extra. Glass that was
 *    already authored as BLEND/MASK is left alone.
 *
 * 2. Anisotropy on textures, raised so paint decals/carbon weave stay sharp
 *    at the grazing angles a turntable produces.
 *
 * Returns the unique materials so the presence system can drive them.
 */
export function prepareCarMaterials(
  root: Object3D,
  maxAnisotropy: number
): Material[] {
  const unique = new Set<Material>();

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    // Hover raycasts hit the car's single bounding proxy (see Car.tsx),
    // never these hundreds of thousands of triangles.
    mesh.raycast = () => {};
    mesh.frustumCulled = true;

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach((m) => unique.add(m));
  });

  unique.forEach((material) => {
    const physical = material as MeshPhysicalMaterial;
    if (physical.isMeshPhysicalMaterial && physical.transmission > 0) {
      const glassiness = Math.min(1, physical.transmission);
      physical.transmission = 0;
      physical.transmissionMap = null;
      physical.thickness = 0;
      physical.transparent = true;
      physical.opacity = Math.max(0.12, 1 - glassiness * 0.82);
      physical.depthWrite = false;
      physical.needsUpdate = true;
    }

    // Anisotropic filtering on every texture slot.
    Object.values(material).forEach((value) => {
      const tex = value as { isTexture?: boolean; anisotropy?: number };
      if (tex && tex.isTexture) tex.anisotropy = maxAnisotropy;
    });

    captureMaterialBaseline(material);
  });

  return Array.from(unique);
}
