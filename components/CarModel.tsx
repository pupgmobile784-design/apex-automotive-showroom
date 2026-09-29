"use client";

import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import type { Material, Object3D } from "three";
import { useApexStore } from "@/lib/store";
import type { Vehicle } from "@/lib/vehicles";
import { useCarGLTF } from "@/lib/useCarGLTF";
import { normalizeCar } from "@/lib/normalize";
import { prepareCarMaterials } from "@/lib/prepareMaterials";
import { releaseModel, retainModel } from "@/lib/modelCache";
import { ErrorBoundary } from "./ErrorBoundary";

export interface CarReadyInfo {
  root: Object3D;
  materials: Material[];
}

interface CarModelProps {
  vehicle: Vehicle;
  onReady: (info: CarReadyInfo) => void;
}

function GLTFCar({ vehicle, onReady }: CarModelProps) {
  const gl = useThree((s) => s.gl);
  const setLoadProgress = useApexStore((s) => s.setLoadProgress);
  const markReady = useApexStore((s) => s.markReady);

  const handleProgress = useCallback(
    (e: ProgressEvent) => {
      // Content-Length can describe the compressed transfer while the loader
      // counts decoded bytes, so hold at 99 % until the file has really
      // finished rather than ever claiming 100 % early.
      if (e.lengthComputable && e.total > 0) {
        setLoadProgress(vehicle.id, Math.min(0.99, e.loaded / e.total));
      }
    },
    [setLoadProgress, vehicle.id]
  );

  const { scene } = useCarGLTF(vehicle.model, handleProgress);

  // Keep the decoded model alive while this car is mounted; free its GPU
  // memory once nothing shows it (see lib/modelCache.ts).
  useEffect(() => {
    retainModel(vehicle.model);
    return () => releaseModel(vehicle.model, scene);
  }, [vehicle.model, scene]);

  const car = useMemo(
    () => normalizeCar(scene, vehicle),
    [scene, vehicle]
  );

  useEffect(() => {
    const materials = prepareCarMaterials(
      car,
      Math.min(8, gl.capabilities.getMaxAnisotropy())
    );
    onReady({ root: car, materials });
    markReady(vehicle.id);
  }, [car, gl, onReady, markReady, vehicle.id]);

  return <primitive object={car} />;
}

/**
 * Loads one vehicle's real GLB. While it streams in nothing is drawn (the
 * loading screen covers the first car; neighbours simply fade in when
 * ready) — there is deliberately no stand-in geometry. If the file is
 * missing or corrupt, only this car is skipped: the failure is recorded so
 * the UI can say so, and the other cars and the Canvas are unaffected.
 */
export default function CarModel({ vehicle, onReady }: CarModelProps) {
  const markFailed = useApexStore((s) => s.markFailed);
  const onError = useCallback(
    () => markFailed(vehicle.id),
    [markFailed, vehicle.id]
  );

  return (
    <ErrorBoundary fallback={null} onError={onError}>
      <Suspense fallback={null}>
        <GLTFCar vehicle={vehicle} onReady={onReady} />
      </Suspense>
    </ErrorBoundary>
  );
}
