"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { useApexStore } from "@/lib/store";
import { carDimensions, TARGET_LENGTH } from "@/lib/normalize";

// Reference proportions used until a car's real dimensions are known (first
// frame or a model that's still loading): a mid-height sports car at the
// fleet's common TARGET_LENGTH.
const DEFAULT_DIMS = { length: TARGET_LENGTH, width: 1.9, height: 1.25 };

// One steady framing. It only ever changes for two reasons, both explicit
// user actions: switching to a car with different proportions (auto-fit,
// below), or pinch/scroll zoom (zoomOffset, from ScrollController). It does
// NOT change just because the pointer moved or the person grabbed the car
// to rotate it — a held/rotating car stays exactly where it was.
const BASE_POSITION = new Vector3(0, 1.3, 7.4);
const LOOK_BASE_Y = 0.32;

export default function CameraController() {
  const { camera } = useThree();

  const currentPos = useRef(BASE_POSITION.clone());
  const lookTarget = useRef(new Vector3(0, 0.4, 0));

  // Everything read here only ever feeds this per-frame update, never this
  // component's own render output (it returns null) — so we pull it
  // straight from the store with getState() instead of subscribing via the
  // hook, and never re-render just because the pointer moved.
  useFrame((state, rawDelta) => {
    const { zoomOffset, reducedMotion, vehicles, activeIndex } =
      useApexStore.getState();
    const delta = reducedMotion ? Math.min(rawDelta * 6, 0.5) : rawDelta;

    // Auto-framing: every car is normalized to the same length (see
    // lib/normalize.ts), but height and width still vary with the real
    // model's proportions — a low-slung hypercar vs. a boxier muscle car.
    // Scale the camera's height and pull-back distance with the *active*
    // car's own measured height/width so every vehicle sits in frame the
    // same way, rather than one fixed shot that only suits one silhouette.
    // This only moves the camera when the active car itself changes — a
    // deliberate switch, not ambient motion.
    const activeId = vehicles[activeIndex]?.id;
    const dims = (activeId && carDimensions.get(activeId)) || DEFAULT_DIMS;
    const heightFactor = dims.height / DEFAULT_DIMS.height;
    const widthFactor = dims.width / DEFAULT_DIMS.width;
    const sizeFactor = MathUtils.clamp((heightFactor + widthFactor) / 2, 0.75, 1.35);
    const desiredZ = BASE_POSITION.z + (sizeFactor - 1) * 2;

    // Portrait/narrow viewports (phones) need extra pull-back on top of
    // all of the above: FOV here is a fixed *vertical* angle, so on a
    // narrow aspect ratio the *horizontal* field of view shrinks with it —
    // without this, a car framed correctly on a wide desktop window is
    // cropped on the left/right edges on a phone even though there's dead
    // space above and below it. Solved properly, not by a fudge factor:
    // work out the minimum distance that actually fits the active car's
    // real measured width inside the current horizontal FOV, and never let
    // the camera sit closer than that.
    const size = state.size;
    const aspect = size.width / size.height;
    const cam = camera as PerspectiveCamera;
    const verticalHalfAngle = MathUtils.degToRad(cam.fov) / 2;
    const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * aspect);
    const carHalfWidth = (dims.width / 2) * 1.4; // 1.4: breathing room + the car isn't always shown edge-on
    const minDistanceForWidth = carHalfWidth / Math.tan(horizontalHalfAngle);
    const fittedZ = Math.max(desiredZ, minDistanceForWidth);

    const target = new Vector3(
      BASE_POSITION.x,
      BASE_POSITION.y * heightFactor,
      fittedZ - zoomOffset // the only zoom: the person's own pinch/scroll
    );

    const lerpSpeed = 1 - Math.pow(0.001, delta);
    currentPos.current.lerp(target, lerpSpeed);
    camera.position.copy(currentPos.current);

    const lookY = LOOK_BASE_Y * heightFactor;
    lookTarget.current.lerp(new Vector3(0, lookY, 0), lerpSpeed);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
