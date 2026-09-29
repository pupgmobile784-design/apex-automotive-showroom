"use client";

import { useApexStore } from "@/lib/store";

export default function Header() {
  const setCreditsOpen = useApexStore((s) => s.setCreditsOpen);
  return (
    <header className="pointer-events-none absolute top-0 left-0 right-0 z-30 flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-0 sm:p-8">
      <div className="apex-display text-2xl tracking-widest2 text-white">
        APEX
      </div>

      <nav
        aria-label="Primary"
        className="pointer-events-auto flex flex-wrap gap-x-5 gap-y-1 apex-mono text-white/70 sm:gap-x-8"
      >
        <button
          type="button"
          className="transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          aria-label="View the collection"
        >
          COLLECTION
        </button>
        <button
          type="button"
          className="transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          aria-label="View available models"
        >
          MODELS
        </button>
        <button
          type="button"
          className="transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          aria-label="About APEX"
        >
          ABOUT
        </button>
        <button
          type="button"
          onClick={() => setCreditsOpen(true)}
          className="transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          aria-label="3D model credits"
        >
          CREDITS
        </button>
      </nav>
    </header>
  );
}
