"use client";

import { useApexStore } from "@/lib/store";

export default function CarInfo() {
  // Selective subscriptions only — the previous whole-store read here
  // (`useApexStore()`) re-rendered this component on every pointer move,
  // drag tick, and camera-driven store update in the entire app, none of
  // which this component displays.
  const vehicles = useApexStore((s) => s.vehicles);
  const activeIndex = useApexStore((s) => s.activeIndex);
  const car = vehicles[activeIndex];
  const total = vehicles.length;

  return (
    <>
      <div
        key={car.id}
        className="apex-fade-in pointer-events-none absolute bottom-8 left-8 z-20 max-w-xs"
      >
        <div className="apex-mono text-accent">{car.brand}</div>
        <div className="apex-display text-3xl leading-none text-white sm:text-4xl">
          {car.name}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 apex-mono text-white/60">
          <div>
            <div className="text-white/30">POWER</div>
            <div className="text-white">{car.power}</div>
          </div>
          <div>
            <div className="text-white/30">TORQUE</div>
            <div className="text-white">{car.torque}</div>
          </div>
          <div>
            <div className="text-white/30">0–100 KM/H</div>
            <div className="text-white">{car.acceleration}</div>
          </div>
          <div>
            <div className="text-white/30">TOP SPEED</div>
            <div className="text-white">{car.topSpeed}</div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-8 right-8 z-20 flex flex-col items-end gap-2.5">
        <div aria-hidden="true" className="flex items-center gap-1.5">
          {vehicles.map((v, i) => (
            <span
              key={v.id}
              className="h-1 rounded-full bg-accent transition-all duration-300 ease-out"
              style={{
                width: i === activeIndex ? 16 : 6,
                opacity: i === activeIndex ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        <div className="apex-mono text-white/40">
          {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>
    </>
  );
}
