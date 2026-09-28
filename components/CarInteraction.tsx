"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useApexStore } from "@/lib/store";
import type { Vehicle } from "@/lib/vehicles";

/**
 * Wires a single car's mesh group to the shared interaction model:
 *  - hover: brightens/scales this car, dims the rest (read via isActive+hoveredId in Car.tsx)
 *  - pointer down + hold: focuses this car (goTo) and starts a rotate-drag
 *  - pointer move while held: horizontal drag rotates the car; vertical
 *    drag is intentionally tiny (it nudges the camera in CameraController,
 *    not the car itself, per spec: "vertical drag → subtle vertical camera
 *    adjustment").
 */
export function useCarInteraction(vehicle: Vehicle, index: number) {
  const setHovered = useApexStore((s) => s.setHovered);
  const setHeld = useApexStore((s) => s.setHeld);
  const addDragRotation = useApexStore((s) => s.addDragRotation);
  const setDragVelocity = useApexStore((s) => s.setDragVelocity);
  const setPointer = useApexStore((s) => s.setPointer);
  const goTo = useApexStore((s) => s.goTo);
  const activeIndex = useApexStore((s) => s.activeIndex);

  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastMoveTime = useRef(0);

  const onPointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(vehicle.id);
    },
    [setHovered, vehicle.id]
  );

  const onPointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered((current: string | null) =>
        current === vehicle.id ? null : current
      );
    },
    [setHovered, vehicle.id]
  );

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (index !== activeIndex) {
        goTo(index);
        return; // first click brings it to focus; hold again to rotate
      }
      dragging.current = true;
      lastX.current = e.clientX;
      lastMoveTime.current = performance.now();
      setDragVelocity(0);
      setHeld(true);
    },
    [activeIndex, goTo, index, setDragVelocity, setHeld]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // Global normalized pointer, used for camera parallax regardless of drag state.
      setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      if (!dragging.current) return;
      const now = performance.now();
      const dt = Math.max((now - lastMoveTime.current) / 1000, 1 / 240);
      const deltaX = e.clientX - lastX.current;
      lastX.current = e.clientX;
      lastMoveTime.current = now;

      const rotationDelta = deltaX * 0.008;
      addDragRotation(rotationDelta);
      setDragVelocity(rotationDelta / dt);
    };

    const onUp = () => {
      dragging.current = false;
      setHeld(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [addDragRotation, setDragVelocity, setHeld, setPointer]);

  return { onPointerOver, onPointerOut, onPointerDown };
}
