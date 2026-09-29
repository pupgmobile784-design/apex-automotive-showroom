"use client";

import { useApexStore } from "@/lib/store";

/**
 * If the active vehicle's GLB genuinely fails to load (bad file, 404,
 * network error), CarModel isolates the failure to just that car — but
 * with no procedural stand-in, the stage would otherwise be empty and
 * silent. This gives that state an honest, on-brand message instead of a
 * blank scene, and a way straight to a car that *is* working.
 */
export default function ModelErrorNotice() {
  const vehicles = useApexStore((s) => s.vehicles);
  const activeIndex = useApexStore((s) => s.activeIndex);
  const failedIds = useApexStore((s) => s.failedIds);
  const booted = useApexStore((s) => s.booted);
  const next = useApexStore((s) => s.next);

  const car = vehicles[activeIndex];
  const failed = booted && car && failedIds.includes(car.id);
  if (!failed) return null;

  return (
    <div className="apex-fade-in pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-4 text-center">
        <p className="apex-mono text-white/50">
          {car.brand} {car.name}&apos;s model couldn&apos;t be loaded on this
          device.
        </p>
        <button
          type="button"
          onClick={() => next()}
          className="apex-mono border border-white/20 px-4 py-2 text-white/80 transition-colors hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
        >
          NEXT VEHICLE
        </button>
      </div>
    </div>
  );
}
