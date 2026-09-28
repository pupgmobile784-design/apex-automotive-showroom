"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Material, Mesh, Object3D, Vector3 } from "three";
import type { Vehicle } from "@/lib/vehicles";
import { captureMaterialBaseline } from "@/lib/materialDimming";
import CarBody from "./CarBody";
import { ErrorBoundary } from "./ErrorBoundary";

interface CarModelProps {
  vehicle: Vehicle;
  onReady?: (materials: Material[]) => void;
  /**
   * Gate used by CarCollection's progressive-load strategy (see
   * lib/useProgressiveLoad.ts): while false, this renders the procedural
   * placeholder directly and never attempts the GLB fetch at all, so a
   * fleet of six real models doesn't all compete for bandwidth/parse time
   * the instant the scene mounts. Defaults to true so CarModel is still a
   * safe drop-in on its own.
   */
  allowRealModel?: boolean;
}

const TARGET_LENGTH = 4.2; // matches the placeholder body, keeps the whole fleet scaled consistently

function collectMaterials(root: Object3D): Material[] {
  const found: Material[] = [];
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      // Deliberately do NOT touch `transparent`/`opacity` here. Real GLB
      // materials must keep whatever the artist/exporter authored — glass
      // stays transparent, paint/chrome/carbon/tires stay opaque — or the
      // renderer's depth sorting breaks (ghosting/z-fighting on overlapping
      // panels). We only snapshot the baseline the presence system needs;
      // see lib/materialDimming.ts for how focus/hover is actually shown.
      captureMaterialBaseline(m);
      found.push(m);
    });
  });
  return found;
}

function GLTFCar({ vehicle, onReady }: CarModelProps) {
  const { scene } = useGLTF(vehicle.model);

  const normalized = useMemo(() => {
    const clone = scene.clone(true);

    // Apply the model's own orientation correction FIRST, so every
    // measurement below (size, center, floor) is taken in the orientation
    // the car will actually be shown in — this is what lets rotationOffset
    // correct a backwards-facing export without distorting its fit.
    clone.rotation.y = vehicle.rotationOffset ?? 0;
    clone.updateMatrixWorld(true);

    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    box.getSize(size);
    const longestHorizontal = Math.max(size.x, size.z) || 1;
    const autoScale = TARGET_LENGTH / longestHorizontal;
    clone.scale.setScalar(autoScale * (vehicle.scaleMultiplier ?? 1));
    clone.updateMatrixWorld(true);

    // Re-measure after scaling, then center on X/Z and drop it onto the floor.
    const scaledBox = new Box3().setFromObject(clone);
    const center = new Vector3();
    scaledBox.getCenter(center);
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= scaledBox.min.y;

    const [ox, oy, oz] = vehicle.positionOffset ?? [0, 0, 0];
    clone.position.x += ox;
    clone.position.y += oy;
    clone.position.z += oz;

    clone.traverse((obj) => {
      obj.castShadow = true;
      obj.receiveShadow = true;
    });

    return clone;
  }, [scene, vehicle.rotationOffset, vehicle.scaleMultiplier, vehicle.positionOffset]);

  useEffect(() => {
    onReady?.(collectMaterials(normalized));
    // No disposal here: three.js GLTF geometries/materials are cached and
    // reused by useGLTF, so they shouldn't be torn down on unmount.
  }, [normalized, onReady]);

  return <primitive object={normalized} />;
}

/**
 * Drop-in vehicle renderer. Give it a Vehicle and it will:
 *  1. try to load vehicle.model as a GLB/GLTF (skipped entirely while
 *     allowRealModel is false),
 *  2. auto-scale + center + floor it so any model "just works" regardless
 *     of the units/orientation it was exported with, then apply that
 *     vehicle's rotationOffset/scaleMultiplier/positionOffset correction,
 *  3. fall back to a procedural placeholder body while loading AND if the
 *     load fails for any reason (missing file, bad parse, network error) —
 *     isolated per-car by its own ErrorBoundary, so one bad GLB never takes
 *     down the rest of the fleet or the whole Canvas.
 *
 * Callers never need to know which path was taken — `onReady` always fires
 * with a flat list of materials, which lib/materialDimming.ts drives
 * uniformly for hover/focus brightening.
 */
export default function CarModel({
  vehicle,
  onReady,
  allowRealModel = true,
}: CarModelProps) {
  const fallback = <CarBody color={vehicle.color} onReady={onReady} />;

  if (!allowRealModel) return fallback;

  return (
    <Suspense fallback={fallback}>
      <ErrorBoundary fallback={fallback}>
        <GLTFCar vehicle={vehicle} onReady={onReady} />
      </ErrorBoundary>
    </Suspense>
  );
}
