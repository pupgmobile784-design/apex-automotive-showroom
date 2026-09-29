"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Group,
  Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from "three";
import { useApexStore } from "@/lib/store";
import type { Vehicle } from "@/lib/vehicles";
import { applyMaterialPresence } from "@/lib/materialDimming";
import { carDimensions } from "@/lib/normalize";
import { useCarInteraction } from "./CarInteraction";
import CarModel, { type CarReadyInfo } from "./CarModel";

interface CarProps {
  vehicle: Vehicle;
  index: number;
  basePosition: [number, number, number];
  baseRotationY: number;
  isActive: boolean;
  /** Within ±LOAD_RANGE of the active car — visible and interactive. */
  onStage: boolean;
  /** Allowed to stream its GLB now (see lib/useProgressiveLoad.ts). */
  loadModel: boolean;
}

// One soft radial blob shared by every car: a cheap, stable "grounded on
// the floor" shadow that costs nothing per frame, unlike re-rendering nine
// multi-hundred-thousand-triangle cars into a shadow map.
let blobTexture: CanvasTexture | null = null;
function getBlobTexture() {
  if (blobTexture) return blobTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.95)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  blobTexture = new CanvasTexture(canvas);
  return blobTexture;
}

function setCastShadow(root: Object3D, cast: boolean) {
  root.traverse((obj) => {
    if ((obj as Mesh).isMesh) obj.castShadow = cast;
  });
}

export default function Car({
  vehicle,
  index,
  basePosition,
  baseRotationY,
  isActive,
  onStage,
  loadModel,
}: CarProps) {
  const groupRef = useRef<Group>(null);
  const hitRef = useRef<Mesh>(null);
  const blobRef = useRef<Mesh>(null);
  const { onPointerOver, onPointerOut, onPointerDown } = useCarInteraction(
    vehicle,
    index
  );

  const cinematicSpin = useRef(0);
  const modelRoot = useRef<Object3D | null>(null);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  // Populated by CarModel once the real GLB is ready. Refs, not state, so
  // 60fps updates below never trigger a re-render.
  const materialsRef = useRef<Material[]>([]);
  const handleReady = useCallback(
    ({ root, materials }: CarReadyInfo) => {
      materialsRef.current = materials;
      modelRoot.current = root;
      setCastShadow(root, isActiveRef.current);

      // Size the invisible hover proxy and the ground shadow to this car.
      const d = carDimensions.get(vehicle.id);
      if (d) {
        hitRef.current?.scale.set(d.width * 1.05, d.height, d.length * 1.05);
        hitRef.current?.position.set(0, d.height / 2, 0);
        blobRef.current?.scale.set(d.width * 1.7, d.length * 1.25, 1);
      }
    },
    [vehicle.id]
  );

  // Only the focused car casts a real shadow.
  useEffect(() => {
    if (modelRoot.current) setCastShadow(modelRoot.current, isActive);
  }, [isActive]);

  // Start in the right pose so nothing pops on the first frame.
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.scale.setScalar(onStage ? (isActive ? 1.15 : 0.85) : 0);
    g.visible = onStage;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDelta) => {
    const g = groupRef.current;
    if (!g) return;

    // All of this is only needed inside this per-frame callback, so it is
    // read with getState() instead of the hook — this component never
    // re-renders because the pointer moved or a drag ticked.
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

    const hoverPush = isHovered && !isActive ? 0.35 : 0;
    g.position.x = MathUtils.damp(g.position.x, basePosition[0], 4, delta);
    g.position.y = MathUtils.damp(g.position.y, basePosition[1], 4, delta);
    g.position.z = MathUtils.damp(
      g.position.z,
      basePosition[2] + hoverPush,
      4,
      delta
    );

    // Focused car reads largest, hovered a touch bigger, the rest recede;
    // cars leaving the stage shrink away and stop being drawn.
    const targetScale = !onStage ? 0 : isActive ? 1.15 : isHovered ? 1.05 : 0.85;
    const s = MathUtils.damp(g.scale.x, targetScale, 4, delta);
    g.scale.setScalar(s);
    const shown = s > 0.02;
    if (g.visible !== shown) g.visible = shown;
    if (!shown) return;

    // Only cars actually on stage are hoverable.
    if (hitRef.current) hitRef.current.raycast = onStage ? Mesh.prototype.raycast : () => {};

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

    // Brighten the focused/hovered car, dim the rest — via colour,
    // reflection and emissive only, never opacity. See lib/materialDimming.ts.
    for (const mat of materialsRef.current) {
      applyMaterialPresence(mat, isActive, isHovered, 4, delta);
    }

    if (blobRef.current) {
      (blobRef.current.material as MeshBasicMaterial).opacity = MathUtils.damp(
        (blobRef.current.material as MeshBasicMaterial).opacity,
        isActive ? 0.85 : 0.5,
        4,
        delta
      );
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
      {/* Invisible box: what the pointer actually hits (see prepareMaterials). */}
      <mesh ref={hitRef} scale={0.0001}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Ground shadow */}
      <mesh
        ref={blobRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        scale={0.0001}
        renderOrder={1}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={getBlobTexture()}
          transparent
          opacity={0.6}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {loadModel && <CarModel vehicle={vehicle} onReady={handleReady} />}
    </group>
  );
}
