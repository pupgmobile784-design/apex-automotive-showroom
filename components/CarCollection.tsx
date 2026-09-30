"use client";

import { useEffect, useRef, useState } from "react";
import { FLOOR_Y } from "@/lib/normalize";
import { useApexStore } from "@/lib/store";
import Car from "./Car";

const CENTER: [number, number, number] = [0, FLOOR_Y, 0];

/**
 * One car on stage at a time — centered, alone, still. Switching cars
 * (scroll / swipe / arrow keys / the vehicle nav) crossfades: the outgoing
 * car scales and dims out (handled inside Car.tsx) while the new one
 * scales in, instead of the whole scene rearranging around a crowd of
 * cars. The outgoing car is kept mounted just long enough to finish that
 * exit before being dropped.
 */
export default function CarCollection() {
  const vehicles = useApexStore((s) => s.vehicles);
  const activeIndex = useApexStore((s) => s.activeIndex);
  const activeVehicle = vehicles[activeIndex];
  const activeId = activeVehicle?.id;

  const [mountedIds, setMountedIds] = useState<string[]>(
    activeId ? [activeId] : []
  );
  const prevActiveId = useRef<string | undefined>(activeId);

  useEffect(() => {
    if (!activeId || activeId === prevActiveId.current) return;
    const outgoing = prevActiveId.current;
    prevActiveId.current = activeId;

    setMountedIds((prev) => (prev.includes(activeId) ? prev : [...prev, activeId]));

    if (!outgoing) return;
    const timer = window.setTimeout(() => {
      setMountedIds((prev) => prev.filter((id) => id !== outgoing));
    }, 700); // matches the scale/dim damping in Car.tsx finishing its exit
    return () => window.clearTimeout(timer);
  }, [activeId]);

  return (
    <group>
      {mountedIds.map((id) => {
        const vehicle = vehicles.find((v) => v.id === id);
        if (!vehicle) return null;
        return (
          <Car
            key={vehicle.id}
            vehicle={vehicle}
            index={vehicles.indexOf(vehicle)}
            basePosition={CENTER}
            isActive={vehicle.id === activeId}
          />
        );
      })}
    </group>
  );
}
