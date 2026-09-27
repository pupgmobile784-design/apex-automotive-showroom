"use client";

import { useProgress } from "@react-three/drei";

export default function LoadingScreen() {
  const { active, progress, loaded, total } = useProgress();
  const pct = Math.min(Math.round(progress), 100);

  return (
    <div
      aria-hidden={!active}
      className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-void-950 transition-opacity duration-700"
      style={{ opacity: active ? 1 : 0 }}
    >
      <div className="apex-display text-3xl tracking-widest2 text-white">
        APEX
      </div>

      <div className="apex-mono text-white/40">
        LOADING VEHICLE — {String(Math.min(loaded, total || 1)).padStart(2, "0")}
        {" / "}
        {String(total || 6).padStart(2, "0")}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px w-48 overflow-hidden bg-white/10">
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="apex-mono w-9 text-right text-white/40">{pct}%</span>
      </div>
    </div>
  );
}
