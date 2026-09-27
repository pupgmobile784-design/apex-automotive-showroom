"use client";

import { useApexStore } from "@/lib/store";

/**
 * The primary way to switch cars is 3D interaction (hover/click/scroll),
 * which has no DOM semantics a screen reader or keyboard-only user can
 * reach. This gives the same "select a vehicle" action a real, focusable,
 * labeled control — visually hidden until it receives focus, so it never
 * competes with the cinematic UI for a mouse user.
 */
export default function VehicleNav() {
  const vehicles = useApexStore((s) => s.vehicles);
  const activeIndex = useApexStore((s) => s.activeIndex);
  const goTo = useApexStore((s) => s.goTo);

  return (
    <nav aria-label="Vehicle collection" className="absolute left-4 top-24 z-30">
      <ul className="flex flex-col gap-1">
        {vehicles.map((vehicle, i) => (
          <li key={vehicle.id}>
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === activeIndex}
              className="sr-only apex-mono rounded border border-white/20 bg-void-900 px-3 py-2 text-white focus:not-sr-only focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {vehicle.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
