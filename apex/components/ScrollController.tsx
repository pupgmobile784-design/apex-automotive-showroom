"use client";

import { useEffect, useRef } from "react";
import { MathUtils } from "three";
import { useApexStore } from "@/lib/store";

const MAX_ZOOM_OFFSET = 1.6; // meters the pinch gesture is allowed to pull the camera in/out

function pinchDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

// Pure input listener with no visual output. Owns the mapping from
// scroll / swipe / pinch gestures to navigation + zoom, while staying quiet
// whenever the user is actively holding + rotating a car (that's
// CarInteraction's job).
export default function ScrollController() {
  const next = useApexStore((s) => s.next);
  const prev = useApexStore((s) => s.prev);
  const isHeld = useApexStore((s) => s.isHeld);
  const setZoomOffset = useApexStore((s) => s.setZoomOffset);
  const isHeldRef = useRef(isHeld);
  isHeldRef.current = isHeld;

  const accumulated = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef(0);

  useEffect(() => {
    const THRESHOLD = 140;

    const onWheel = (e: WheelEvent) => {
      if (isHeldRef.current) return;
      e.preventDefault();
      accumulated.current += e.deltaY;
      if (accumulated.current > THRESHOLD) {
        next();
        accumulated.current = 0;
      } else if (accumulated.current < -THRESHOLD) {
        prev();
        accumulated.current = 0;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDistance.current = pinchDistance(e.touches);
        pinchStartZoom.current = useApexStore.getState().zoomOffset;
        touchStartY.current = null;
        return;
      }
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistance.current) {
        e.preventDefault();
        const current = pinchDistance(e.touches);
        const ratio = current / pinchStartDistance.current;
        // Pinch out (fingers apart, ratio > 1) moves the camera closer.
        const nextZoom = MathUtils.clamp(
          pinchStartZoom.current + (ratio - 1) * 2,
          -MAX_ZOOM_OFFSET,
          MAX_ZOOM_OFFSET
        );
        setZoomOffset(() => nextZoom);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDistance.current = null;
      if (isHeldRef.current || touchStartY.current === null) return;
      const delta = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(delta) > 60) {
        if (delta > 0) next();
        else prev();
      }
      touchStartY.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isHeldRef.current) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prev();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [next, prev, setZoomOffset]);

  return null;
}
