"use client";

export default function Header() {
  return (
    <header className="pointer-events-none absolute top-0 left-0 right-0 z-30 flex items-start justify-between p-8">
      <div className="apex-display text-2xl tracking-widest2 text-white">
        APEX
      </div>

      <nav aria-label="Primary" className="pointer-events-auto flex gap-8 apex-mono text-white/70">
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
      </nav>
    </header>
  );
}
