"use client";

import { useEffect, useState } from "react";

/**
 * Every car in the fleet is visible in the arc from the first frame, but
 * that doesn't mean all six real GLBs should start fetching/decoding at
 * once — on a mobile connection or a mid-range GPU that's a stall right at
 * the moment that matters most. This gates which car indices are allowed
 * to attempt their real model:
 *  - the active vehicle is always allowed, immediately (including the
 *    instant it changes, so clicking a new car never waits behind a queue)
 *  - the rest of the fleet is let in on a short stagger after first paint
 *
 * A car that isn't "allowed" yet isn't broken or hidden — CarModel simply
 * renders its normal procedural placeholder for it, identical to the
 * loading state a real model already shows via Suspense, so nothing looks
 * different while it waits its turn.
 */
export function useProgressiveModelGate(activeIndex: number, total: number) {
  const [allowed, setAllowed] = useState<Set<number>>(
    () => new Set([activeIndex])
  );

  // Whichever car becomes active always jumps the queue.
  useEffect(() => {
    setAllowed((prev) =>
      prev.has(activeIndex) ? prev : new Set(prev).add(activeIndex)
    );
  }, [activeIndex]);

  // One-time staggered rollout of the rest of the fleet after first paint.
  useEffect(() => {
    // Typed as number explicitly: @types/node's ambient NodeJS.Timeout
    // shadows the DOM lib's number-returning window.setTimeout signature in
    // this project's global scope, so ReturnType<typeof window.setTimeout>
    // would otherwise resolve to the wrong (Node) type here.
    const timers: number[] = [];
    for (let i = 0; i < total; i++) {
      const delay = 200 + i * 180;
      timers.push(
        window.setTimeout(() => {
          setAllowed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
        }, delay) as unknown as number
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // Intentionally runs once — this is a one-time rollout, not something
    // that should re-stagger every time the active index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return allowed;
}
