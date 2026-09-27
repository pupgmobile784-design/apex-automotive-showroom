"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useApexStore } from "@/lib/store";

const OVERVIEW_POS = new Vector3(0, 1.4, 9);
const FOCUS_POS = new Vector3(0, 1.1, 5.2);
const LOOK_HELD = new Vector3(0, 0.5, 0);
const LOOK_OVERVIEW = new Vector3(0, 0.2, 0);

export default function CameraController() {
  const { camera } = useThree();

  const currentPos = useRef(OVERVIEW_POS.clone());
  const lookTarget = useRef(new Vector3(0, 0.4, 0));

  // Everything read here only ever feeds this per-frame update, never this
  // component's own render output (it returns null) — so we pull it
  // straight from the store with getState() instead of subscribing via the
  // hook, and never re-render just because the pointer moved.
  useFrame((_, rawDelta) => {
    const { isHeld, pointer, zoomOffset, reducedMotion } =
      useApexStore.getState();
    const delta = reducedMotion ? Math.min(rawDelta * 6, 0.5) : rawDelta;
    const base = isHeld ? FOCUS_POS : OVERVIEW_POS;

    // Subtle parallax: the camera drifts a little with the pointer,
    // never enough to feel like free-look. Reduced motion turns this off
    // entirely since it's a constant, ambient movement.
    const parallaxX = reducedMotion ? 0 : pointer.x * 0.6;
    const parallaxY = reducedMotion ? 0 : pointer.y * 0.25;

    const target = new Vector3(
      base.x + parallaxX,
      base.y + parallaxY,
      base.z - zoomOffset
    );

    const lerpSpeed = 1 - Math.pow(0.001, delta);
    currentPos.current.lerp(target, lerpSpeed);
    camera.position.copy(currentPos.current);

    const lookAt = isHeld ? LOOK_HELD : LOOK_OVERVIEW;
    lookTarget.current.lerp(lookAt, lerpSpeed);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
