"use client";

import { useEffect, useRef, useState } from "react";
import { useApexStore } from "@/lib/store";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<"" | "EXPLORE" | "ROTATE">("");
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const hoveredId = useApexStore((s) => s.hoveredId);
  const isHeld = useApexStore((s) => s.isHeld);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    setIsCoarsePointer(query.matches);
    const onChange = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isHeld) setLabel("ROTATE");
    else if (hoveredId) setLabel("EXPLORE");
    else setLabel("");
  }, [hoveredId, isHeld]);

  useEffect(() => {
    if (isCoarsePointer) return;
    const move = (e: MouseEvent) => {
      if (!dotRef.current) return;
      dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [isCoarsePointer]);

  if (isCoarsePointer) return null;

  return (
    <div
      ref={dotRef}
      className="pointer-events-none fixed left-0 top-0 z-50 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-[width,height] duration-200 ease-out md:flex"
      style={{
        width: label ? 64 : 8,
        height: label ? 64 : 8,
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-full border transition-colors duration-200"
        style={{
          borderColor: label ? "rgba(225,6,0,0.6)" : "transparent",
          backgroundColor: label ? "rgba(5,5,5,0.6)" : "#f2f2f2",
        }}
      >
        {label && (
          <span className="apex-mono select-none text-[9px] text-white/80">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
