"use client";

import { useEffect, useState } from "react";

/** Cars this close to the active one (in list positions) are loaded. */
export const LOAD_RANGE = 2;
/** Cars this far away are released again (hysteresis avoids thrash). */
const RELEASE_RANGE = 4;

/** Shortest signed distance between two indices on a circular list. */
export function shortestOffset(index: number, active: number, total: number) {
  let raw = index - active;
  if (raw > total / 2) raw -= total;
  if (raw < -total / 2) raw += total;
  return raw;
}

/**
 * Which cars are allowed to have their real GLB loaded.
 *
 * Nine multi-megabyte models must not all stream and decode at once. Only
 * the active car and its neighbours (±LOAD_RANGE) are ever loaded, in
 * priority order: the active car immediately, the nearest neighbours a beat
 * later, the next ring after that, so the car you are looking at always gets
 * the bandwidth first. When you scroll on, newly-near cars are queued the
 * same way and cars that have drifted far away are released (their GPU
 * memory is freed by lib/modelCache.ts).
 */
export function useProgressiveModelGate(activeIndex: number, total: number) {
  const [allowed, setAllowed] = useState<Set<number>>(
    () => new Set([activeIndex])
  );

  useEffect(() => {
    const timers: number[] = [];

    setAllowed((prev) => {
      // Release cars that are now far away.
      const next = new Set<number>();
      prev.forEach((i) => {
        if (Math.abs(shortestOffset(i, activeIndex, total)) < RELEASE_RANGE) {
          next.add(i);
        }
      });
      next.add(activeIndex);
      return next.size === prev.size && [...next].every((i) => prev.has(i))
        ? prev
        : next;
    });

    for (let ring = 1; ring <= LOAD_RANGE; ring++) {
      const delay = ring * 450;
      [1, -1].forEach((dir) => {
        const idx = (((activeIndex + dir * ring) % total) + total) % total;
        timers.push(
          window.setTimeout(() => {
            setAllowed((prev) => (prev.has(idx) ? prev : new Set(prev).add(idx)));
          }, delay) as unknown as number
        );
      });
    }

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [activeIndex, total]);

  return allowed;
}
