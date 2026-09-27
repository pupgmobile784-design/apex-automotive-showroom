"use client";

import { useEffect } from "react";
import { useApexStore } from "./store";

export function useSyncReducedMotion() {
  const setReducedMotion = useApexStore((s) => s.setReducedMotion);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [setReducedMotion]);
}
