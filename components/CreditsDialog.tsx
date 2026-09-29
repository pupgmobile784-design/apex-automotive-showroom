"use client";

import { useEffect } from "react";
import { useApexStore } from "@/lib/store";

/**
 * Every model in APEX comes from the Supercar Vault 3D pack (see
 * /licenses/Supercar-Vault-3D-README.md, shipped unmodified). This is the
 * attribution the pack's license calls for — visible, but tucked behind a
 * deliberate action rather than sitting on the cinematic UI permanently.
 */
export default function CreditsDialog() {
  const open = useApexStore((s) => s.creditsOpen);
  const setOpen = useApexStore((s) => s.setCreditsOpen);
  const vehicles = useApexStore((s) => s.vehicles);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="apex-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="3D model credits"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-void-950 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apex-display mb-1 text-xl text-white">CREDITS</div>
        <p className="apex-mono mb-6 text-white/40">
          Every model below is sourced from the Supercar Vault 3D pack.
          These are not APEX&apos;s own assets.
        </p>

        <ul className="flex flex-col gap-4">
          {vehicles.map((v) => (
            <li key={v.id} className="border-t border-white/10 pt-3">
              <div className="apex-mono text-white">
                {v.brand} {v.name}
              </div>
              <div className="apex-mono text-white/40">{v.credit.title}</div>
              <div className="apex-mono text-white/30">{v.credit.source}</div>
              {v.credit.author && (
                <div className="apex-mono text-white/30">
                  Credited to: {v.credit.author}
                </div>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="apex-mono mt-8 border border-white/20 px-4 py-2 text-white/70 transition-colors hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
