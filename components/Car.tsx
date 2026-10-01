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
  /** False only while this car is fading out after being replaced. */
  isActive: boolean;
}

// One soft radial blob shared by every car: a cheap, stable "grounded on
// the floor" shadow that costs nothing per frame, unlike re-rendering a
// multi-hundred-thousand-triangle car into a shadow map every frame.
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

// The cinematic entrance/exit drift: a newly-active car rises and advances
// into place from slightly low-and-back while it grows and brightens in;
// the outgoing car recedes to the same low-and-back point while it shrinks
// and dims. One offset, reused for both directions, is what keeps entrance
// and exit feel like the same camera move in reverse rather than two
// unrelated animations.
const SETTLE_OFFSET = { y: -0.16, z: 1.15 };

/**
 * One vehicle, alone on the turntable. It does not move on its own: no
 * idle auto-rotate, no automatic zoom. The only things that move it are
 * the person's own drag (rotation, with inertia that coasts to a stop —
 * never restarts on its own), its own cinematic entrance/exit, and
 * switching to a different car (a deliberate crossfade, not an ambient
 * animation).
 */
export default function Car({ vehicle, index, basePosition, isActive }: CarProps) {
  const groupRef = useRef<Group>(null);
  const hitRef = useRef<Mesh>(null);
  const blobRef = useRef<Mesh>(null);
  const { onPointerOver, onPointerOut, onPointerDown } = useCarInteraction(
    vehicle,
    index
  );

  const modelRoot = useRef<Object3D | null>(null);
  // Populated by CarModel once the real GLB is ready. A ref, not state, so
  // 60fps updates below never trigger a re-render.
  const materialsRef = useRef<Material[]>([]);
  const handleReady = useCallback(
    ({ root, materials }: CarReadyInfo) => {
      materialsRef.current = materials;
      modelRoot.current = root;
      setCastShadow(root, true);

      const d = carDimensions.get(vehicle.id);
      if (d) {
        hitRef.current?.scale.set(d.width * 1.05, d.height, d.length * 1.05);
        hitRef.current?.position.set(0, d.height / 2, 0);
        blobRef.current?.scale.set(d.width * 1.7, d.length * 1.25, 1);
      }
    },
    [vehicle.id]
  );

  // Starts tiny and settled back/low (see SETTLE_OFFSET) so the very first
  // frame doesn't pop; the per-frame damping below both grows it in and
  // advances it into its resting position at once, which is the "rises and
  // advances into place" entrance.
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.scale.setScalar(0.001);
    g.position.set(
      basePosition[0],
      basePosition[1] + SETTLE_OFFSET.y,
      basePosition[2] + SETTLE_OFFSET.z
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDelta) => {
    const g = groupRef.current;
    if (!g) return;

    // hoveredId/isHeld/dragRotation/reducedMotion only ever feed this
    // per-frame callback, so they're read with getState() instead of the
    // hook — this component never re-renders just because the pointer
    // moved or a drag ticked.
    const { hoveredId, isHeld, dragRotation, reducedMotion, decayDragVelocity } =
      useApexStore.getState();
    const isHovered = hoveredId === vehicle.id;
    const delta = reducedMotion ? Math.min(rawDelta * 6, 0.5) : rawDelta;

    if (isActive) decayDragVelocity(rawDelta);

    // Resting in place when active; settled low-and-back (SETTLE_OFFSET)
    // when not — the entrance and the exit are literally the same target,
    // approached from opposite directions, which is what makes them read
    // as one continuous cinematic move rather than two different effects.
    const targetY = isActive ? basePosition[1] : basePosition[1] + SETTLE_OFFSET.y;
    const targetZ = isActive ? basePosition[2] : basePosition[2] + SETTLE_OFFSET.z;
    g.position.x = MathUtils.damp(g.position.x, basePosition[0], 4, delta);
    g.position.y = MathUtils.damp(g.position.y, targetY, 4, delta);
    g.position.z = MathUtils.damp(g.position.z, targetZ, 4, delta);

    // The only size states are "on stage" and "fading out after being
    // replaced" — no hover/idle pulsing, since there's nothing else on
    // stage to compare it against any more.
    const targetScale = isActive ? 1 : 0;
    const s = MathUtils.damp(g.scale.x, targetScale, isActive ? 4 : 5, delta);
    g.scale.setScalar(Math.max(s, 0.001));
    const shown = s > 0.01;
    if (g.visible !== shown) g.visible = shown;
    if (!shown) return;

    // Only the active car is hoverable/draggable; an outgoing car that's
    // still fading out shouldn't steal pointer events.
    if (hitRef.current) {
      hitRef.current.raycast = isActive ? Mesh.prototype.raycast : () => {};
    }

    // Rotation is entirely the person's own doing: dragRotation only
    // changes from their drag (with inertia that decays to a stop via
    // decayDragVelocity above — it never restarts on its own). Nothing
    // here adds rotation on its own.
    g.rotation.y = MathUtils.damp(g.rotation.y, dragRotation, isHeld ? 12 : 3, delta);

    // Full presence while active (brighten further on hover); the outgoing
    // car dims as part of the same exit, instead of only shrinking — "car
    // fades/appears through lighting" per the brief, not just a size
    // tween. See lib/materialDimming.ts.
    for (const mat of materialsRef.current) {
      applyMaterialPresence(mat, isActive, isHovered, 4, delta);
    }

    if (blobRef.current) {
      (blobRef.current.material as MeshBasicMaterial).opacity = MathUtils.damp(
        (blobRef.current.material as MeshBasicMaterial).opacity,
        isActive ? 0.75 : 0,
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

      <CarModel vehicle={vehicle} onReady={handleReady} />
    </group>
  );
}
