"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { useApexStore } from "@/lib/store";
import { carDimensions, TARGET_LENGTH } from "@/lib/normalize";

// Reference proportions used until a car's real dimensions are known (first
// frame or a model that's still loading): a mid-height sports car at the
// fleet's common TARGET_LENGTH.
const DEFAULT_DIMS = { length: TARGET_LENGTH, width: 1.9, height: 1.25 };

const OVERVIEW_BASE = new Vector3(0, 1.4, 9);
const FOCUS_BASE = new Vector3(0, 1.1, 5.2);
const LOOK_HELD_BASE_Y = 0.55;
const LOOK_OVERVIEW_BASE_Y = 0.22;

export default function CameraController() {
  const { camera } = useThree();

  const currentPos = useRef(OVERVIEW_BASE.clone());
  const lookTarget = useRef(new Vector3(0, 0.4, 0));

  // Everything read here only ever feeds this per-frame update, never this
  // component's own render output (it returns null) — so we pull it
  // straight from the store with getState() instead of subscribing via the
  // hook, and never re-render just because the pointer moved.
  useFrame((_, rawDelta) => {
    const { isHeld, pointer, zoomOffset, reducedMotion, vehicles, activeIndex } =
      useApexStore.getState();
    const delta = reducedMotion ? Math.min(rawDelta * 6, 0.5) : rawDelta;

    // Auto-framing: every car is normalized to the same length (see
    // lib/normalize.ts), but height and width still vary with the real
    // model's proportions — a low-slung hypercar vs. a boxier muscle car.
    // Scale the camera's height and pull-back distance with the *active*
    // car's own measured height/width so every vehicle sits in frame the
    // same way, rather than one fixed shot that only suits one silhouette.
    const activeId = vehicles[activeIndex]?.id;
    const dims = (activeId && carDimensions.get(activeId)) || DEFAULT_DIMS;
    const heightFactor = dims.height / DEFAULT_DIMS.height;
    const widthFactor = dims.width / DEFAULT_DIMS.width;
    const sizeFactor = MathUtils.clamp((heightFactor + widthFactor) / 2, 0.75, 1.35);

    const base = isHeld ? FOCUS_BASE : OVERVIEW_BASE;
    const distancePad = isHeld ? 1.6 : 2.4;

    // Subtle parallax: the camera drifts a little with the pointer, never
    // enough to feel like free-look. Reduced motion turns this off entirely
    // since it's a constant, ambient movement.
    const parallaxX = reducedMotion ? 0 : pointer.x * 0.6;
    const parallaxY = reducedMotion ? 0 : pointer.y * 0.25;

    const target = new Vector3(
      base.x + parallaxX,
      base.y * heightFactor + parallaxY,
      base.z + (sizeFactor - 1) * distancePad - zoomOffset
    );

    const lerpSpeed = 1 - Math.pow(0.001, delta);
    currentPos.current.lerp(target, lerpSpeed);
    camera.position.copy(currentPos.current);

    const lookY = (isHeld ? LOOK_HELD_BASE_Y : LOOK_OVERVIEW_BASE_Y) * heightFactor;
    lookTarget.current.lerp(
      new Vector3(0, lookY, 0),
      lerpSpeed
    );
    camera.lookAt(lookTarget.current);
  });

  return null;
}
