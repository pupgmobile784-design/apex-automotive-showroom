"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useApexStore } from "@/lib/store";

/**
 * Covers the scene only until the first car is ready — "booted" flips true
 * once, the first time any vehicle's GLB finishes (or fails), and never
 * returns, so later car switches never bring this screen back (those get
 * their own cinematic crossfade in Car.tsx instead).
 *
 * Deliberately shows no technical loading language (no "x / y", no
 * "LOADING <model>", no raw percentage) — the brief is explicit that this
 * should read as an intentional editorial beat, not a progress dialog. The
 * fill bar still tracks the real byte progress of the car actually being
 * waited on (lib/store.ts's loadProgress), it just isn't labelled with a
 * number: an honest progress indicator, read as a premium detail rather
 * than a stat.
 */
export default function LoadingScreen() {
  const booted = useApexStore((s) => s.booted);
  const progress = useApexStore(
    (s) => s.loadProgress[s.vehicles[s.activeIndex]?.id ?? ""] ?? 0
  );
  const active = !booted;

  const wordmarkRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);

  // One-time entrance for the intro itself (not tied to load progress) —
  // a quick, restrained fade/rise so even a near-instant boot still reads
  // as a deliberate reveal rather than a flash of UI.
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(
      wordmarkRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.6 }
    )
      .fromTo(lineRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.25")
      .fromTo(
        taglineRef.current,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.5 },
        "-=0.2"
      );
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      aria-hidden={!active}
      className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center gap-7 bg-void-950 transition-opacity duration-700 ease-out"
      style={{ opacity: active ? 1 : 0 }}
    >
      <div
        ref={wordmarkRef}
        className="apex-display text-3xl tracking-widest2 text-white"
      >
        APEX
      </div>

      <div ref={lineRef} className="h-px w-40 overflow-hidden bg-white/10">
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(8, Math.round(progress * 100))}%` }}
        />
      </div>

      <div ref={taglineRef} className="apex-mono text-white/35">
        ENTER THE COLLECTION
      </div>
    </div>
  );
}
