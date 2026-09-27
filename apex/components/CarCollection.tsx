"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useApexStore } from "@/lib/store";
import { useProgressiveModelGate } from "@/lib/useProgressiveLoad";
import Car from "./Car";

const ARC_RADIUS = 6.5;
const ANGLE_STEP = 0.55; // radians between neighboring cars in the arc

// Shortest signed distance between two indices on a circular list, e.g.
// with 6 cars, offset(5, 0) === -1, not +5 — so the fleet always swings
// the short way around when you scroll past the wrap point.
function shortestOffset(index: number, active: number, total: number) {
  let raw = index - active;
  if (raw > total / 2) raw -= total;
  if (raw < -total / 2) raw += total;
  return raw;
}

export default function CarCollection() {
  const vehicles = useApexStore((s) => s.vehicles);
  const activeIndex = useApexStore((s) => s.activeIndex);
  const allowedModels = useProgressiveModelGate(activeIndex, vehicles.length);

  // Warm the cache for the active car's immediate neighbors so next()/prev()
  // never pops to the placeholder — by the time either becomes active, its
  // GLB fetch (if any real file is present) is already resolved.
  useEffect(() => {
    const total = vehicles.length;
    if (total === 0) return;
    const nextIndex = (activeIndex + 1) % total;
    const prevIndex = (activeIndex - 1 + total) % total;
    [activeIndex, nextIndex, prevIndex].forEach((i) => {
      // Fire-and-forget: swallow rejections so a fleet with no real GLBs
      // yet (or one bad file) never surfaces as an unhandled-promise
      // console warning. CarModel's own Suspense + ErrorBoundary is what
      // actually handles the fallback when the car renders.
      try {
        Promise.resolve(useGLTF.preload(vehicles[i].model)).catch(() => {});
      } catch {
        // ignore — preload is purely an optimization
      }
    });
  }, [activeIndex, vehicles]);

  return (
    <group>
      {vehicles.map((vehicle, i) => {
        const offset = shortestOffset(i, activeIndex, vehicles.length);
        const isActive = offset === 0;
        const angle = offset * ANGLE_STEP;

        const basePosition: [number, number, number] = isActive
          ? [0, 0, 1.2]
          : [
              Math.sin(angle) * ARC_RADIUS,
              0,
              -Math.cos(angle) * ARC_RADIUS +
                1.2 -
                ARC_RADIUS -
                Math.abs(offset) * 0.6,
            ];

        return (
          <Car
            key={vehicle.id}
            vehicle={vehicle}
            index={i}
            basePosition={basePosition}
            baseRotationY={isActive ? 0 : -angle}
            isActive={isActive}
            allowRealModel={allowedModels.has(i)}
          />
        );
      })}
    </group>
  );
}
