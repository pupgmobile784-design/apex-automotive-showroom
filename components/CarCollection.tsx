"use client";

import { FLOOR_Y } from "@/lib/normalize";
import { useApexStore } from "@/lib/store";
import {
  LOAD_RANGE,
  shortestOffset,
  useProgressiveModelGate,
} from "@/lib/useProgressiveLoad";
import Car from "./Car";

const ARC_RADIUS = 6.5;
const ANGLE_STEP = 0.6; // radians between neighbouring cars in the arc

export default function CarCollection() {
  const vehicles = useApexStore((s) => s.vehicles);
  const activeIndex = useApexStore((s) => s.activeIndex);
  const loadable = useProgressiveModelGate(activeIndex, vehicles.length);

  return (
    <group>
      {vehicles.map((vehicle, i) => {
        const offset = shortestOffset(i, activeIndex, vehicles.length);
        const isActive = offset === 0;
        // Only the active car and the ones flanking it are on stage; the
        // rest wait out of sight (and out of memory) and glide in as the
        // fleet rotates towards them.
        const onStage = Math.abs(offset) <= LOAD_RANGE;
        const angle = offset * ANGLE_STEP;

        const basePosition: [number, number, number] = isActive
          ? [0, FLOOR_Y, 1.2]
          : [
              Math.sin(angle) * ARC_RADIUS,
              FLOOR_Y,
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
            onStage={onStage}
            loadModel={loadable.has(i)}
          />
        );
      })}
    </group>
  );
}
