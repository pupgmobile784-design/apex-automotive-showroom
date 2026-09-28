"use client";

import { useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Material, MathUtils } from "three";
import { useApexStore } from "@/lib/store";
import type { Vehicle } from "@/lib/vehicles";
import { applyMaterialPresence } from "@/lib/materialDimming";
import { useCarInteraction } from "./CarInteraction";
import CarModel from "./CarModel";

interface CarProps {
  vehicle: Vehicle;
  index: number;
  basePosition: [number, number, number];
  baseRotationY: number;
  isActive: boolean;
  /** Forwarded to CarModel — see lib/useProgressiveLoad.ts. */
  allowRealModel: boolean;
}

export default function Car({
  vehicle,
  index,
  basePosition,
  baseRotationY,
  isActive,
  allowRealModel,
}: CarProps) {
  const groupRef = useRef<Group>(null);
  const { onPointerOver, onPointerOut, onPointerDown } = useCarInteraction(
    vehicle,
    index
  );

  const cinematicSpin = useRef(0);

  // Populated by CarModel once the real GLB (or the placeholder fallback)
  // is ready. A ref, not state, so 60fps brightness updates below never
  // trigger a re-render.
  const materialsRef = useRef<Material[]>([]);
  const handleReady = useCallback((mats: Material[]) => {
    materialsRef.current = mats;
  }, []);

  useFrame((_, rawDelta) => {
    const g = groupRef.current;
    if (!g) return;

    // hoveredId/isHeld/dragRotation/pointer/reducedMotion are all only ever
    // needed right here, inside this per-frame callback — reading them via
    // useApexStore.getState() instead of the hook means this component
    // never re-renders just because the pointer moved or a drag ticked.
    const {
      hoveredId,
      isHeld,
      dragRotation,
      pointer,
      reducedMotion,
      decayDragVelocity,
    } = useApexStore.getState();
    const isHovered = hoveredId === vehicle.id;

    // Reduced-motion: everything still moves, just fast enough to feel
    // like a cut rather than a cinematic glide.
    const delta = reducedMotion ? Math.min(rawDelta * 6, 0.5) : rawDelta;

    if (isActive) decayDragVelocity(rawDelta);

    // Position: active car sits toward the camera; hover nudges it slightly closer.
    const hoverPush = isHovered && !isActive ? 0.35 : 0;
    const targetPos: [number, number, number] = [
      basePosition[0],
      basePosition[1],
      basePosition[2] + hoverPush,
    ];
    g.position.x = MathUtils.damp(g.position.x, targetPos[0], 4, delta);
    g.position.y = MathUtils.damp(g.position.y, targetPos[1], 4, delta);
    g.position.z = MathUtils.damp(g.position.z, targetPos[2], 4, delta);

    // Scale: focused car reads largest, hovered-but-not-focused a touch bigger,
    // everything else recedes.
    const targetScale = isActive ? 1.15 : isHovered ? 1.05 : 0.85;
    const s = MathUtils.damp(g.scale.x, targetScale, 4, delta);
    g.scale.setScalar(s);

    // Rotation: focused car gets a slow cinematic turntable spin plus
    // whatever the user has dragged in manually (with inertial decay after
    // release). Idle cars hold their gallery-arc orientation but tilt very
    // slightly toward the cursor when hovered, for a physical hover response.
    if (isActive) {
      cinematicSpin.current += isHeld || reducedMotion ? 0 : delta * 0.15;
      g.rotation.y = MathUtils.damp(
        g.rotation.y,
        baseRotationY + cinematicSpin.current + dragRotation,
        isHeld ? 12 : 3,
        delta
      );
      g.rotation.x = MathUtils.damp(g.rotation.x, 0, 4, delta);
    } else {
      g.rotation.y = MathUtils.damp(g.rotation.y, baseRotationY, 4, delta);
      const tilt = isHovered ? -pointer.y * 0.05 : 0;
      g.rotation.x = MathUtils.damp(g.rotation.x, tilt, 4, delta);
    }

    // Brighten the focused/hovered car, dim everything else so the fleet
    // reads as "emerging from the darkness" rather than evenly lit — via
    // color/reflection/emissive, never opacity. Works identically whether
    // materialsRef holds the placeholder's hand-built materials or a real
    // GLB's own PBR materials. See lib/materialDimming.ts.
    for (const mat of materialsRef.current) {
      applyMaterialPresence(mat, isActive, isHovered, 4, delta);
    }
  });

  return (
    <group
      ref={groupRef}
      position={basePosition}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onPointerDown={onPointerDown}
    >
      <CarModel
        vehicle={vehicle}
        onReady={handleReady}
        allowRealModel={allowRealModel}
      />
    </group>
  );
}
