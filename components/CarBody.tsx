"use client";

import { useEffect, useMemo, useRef } from "react";
import { Group, Material } from "three";
import {
  createCarbonMaterial,
  createChromeMaterial,
  createGlassMaterial,
  createHeadlightMaterial,
  createPaintMaterial,
  createRimMaterial,
  createTireMaterial,
} from "@/lib/materials";
import { captureMaterialBaseline } from "@/lib/materialDimming";

interface CarBodyProps {
  color: string;
  /** Fires once with every dynamic material so the parent can drive
   * hover/focus brightness uniformly (see lib/materialDimming.ts), whether
   * this is the placeholder or a real loaded GLB. */
  onReady?: (materials: Material[]) => void;
}

const WHEEL_POSITIONS: [number, number, number][] = [
  [-0.95, 0.02, 1.35],
  [0.95, 0.02, 1.35],
  [-0.95, 0.02, -1.35],
  [0.95, 0.02, -1.35],
];

export default function CarBody({ color, onReady }: CarBodyProps) {
  const groupRef = useRef<Group>(null);

  const paint = useMemo(() => createPaintMaterial(color), [color]);
  const glass = useMemo(() => createGlassMaterial(), []);
  const tire = useMemo(() => createTireMaterial(), []);
  const rim = useMemo(() => createRimMaterial(), []);
  const chrome = useMemo(() => createChromeMaterial(), []);
  const carbon = useMemo(() => createCarbonMaterial(), []);
  const headlight = useMemo(() => createHeadlightMaterial(), []);

  useEffect(() => {
    const materials = [paint, glass, tire, rim, chrome, carbon, headlight];
    materials.forEach(captureMaterialBaseline);
    onReady?.(materials);
    return () => {
      materials.forEach((m) => m.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint, glass, tire, rim, chrome, carbon, headlight]);

  return (
    <group ref={groupRef}>
      {/* main body */}
      <mesh material={paint} position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.42, 4.2]} />
      </mesh>

      {/* cabin / greenhouse */}
      <mesh material={glass} position={[0, 0.66, -0.2]} castShadow>
        <boxGeometry args={[1.5, 0.34, 2]} />
      </mesh>

      {/* nose taper */}
      <mesh material={paint} position={[0, 0.28, 2.05]} castShadow>
        <boxGeometry args={[1.6, 0.3, 0.4]} />
      </mesh>

      {/* chrome front splitter trim */}
      <mesh material={chrome} position={[0, 0.1, 2.24]}>
        <boxGeometry args={[1.7, 0.05, 0.06]} />
      </mesh>

      {/* headlights */}
      <mesh material={headlight} position={[-0.7, 0.35, 2.2]}>
        <boxGeometry args={[0.28, 0.1, 0.08]} />
      </mesh>
      <mesh material={headlight} position={[0.7, 0.35, 2.2]}>
        <boxGeometry args={[0.28, 0.1, 0.08]} />
      </mesh>

      {/* rear spoiler (carbon) */}
      <mesh material={carbon} position={[0, 0.78, -1.9]}>
        <boxGeometry args={[1.6, 0.05, 0.35]} />
      </mesh>
      <mesh material={carbon} position={[-0.7, 0.55, -1.9]}>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
      </mesh>
      <mesh material={carbon} position={[0.7, 0.55, -1.9]}>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
      </mesh>

      {/* wheels: separate rim + tire so metal and rubber read differently */}
      {WHEEL_POSITIONS.map((pos, i) => (
        <group key={i} position={pos} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={tire} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.26, 24]} />
          </mesh>
          <mesh material={rim} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.28, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
