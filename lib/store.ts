import { create } from "zustand";
import { VEHICLES } from "./vehicles";

interface ApexState {
  vehicles: typeof VEHICLES;
  activeIndex: number; // which car is currently in focus / showcased
  hoveredId: string | null; // car under the cursor (not yet held)
  isHeld: boolean; // mouse button down on the focused car
  dragRotation: number; // accumulated manual rotation offset (radians)
  dragVelocity: number; // radians/sec, decays after release for inertial spin
  zoomOffset: number; // pinch-to-zoom offset on touch devices, meters
  pointer: { x: number; y: number }; // normalized -1..1, drives camera parallax
  transitioning: boolean;
  reducedMotion: boolean; // mirrors prefers-reduced-motion

  // Real GLB loading state (written by CarModel, read by the loading screen
  // and the info panel). Progress is bytes-received / bytes-expected.
  loadProgress: Record<string, number>; // vehicle id -> 0..1
  readyIds: string[]; // GLBs that finished loading
  failedIds: string[]; // GLBs that failed to load
  booted: boolean; // first car is on screen — the loading screen never returns
  creditsOpen: boolean;

  setHovered: (
    id: string | null | ((current: string | null) => string | null)
  ) => void;
  setHeld: (held: boolean) => void;
  addDragRotation: (delta: number) => void;
  setDragVelocity: (v: number) => void;
  decayDragVelocity: (delta: number) => void;
  setZoomOffset: (updater: (current: number) => number) => void;
  setPointer: (x: number, y: number) => void;
  setReducedMotion: (v: boolean) => void;
  setLoadProgress: (id: string, fraction: number) => void;
  markReady: (id: string) => void;
  markFailed: (id: string) => void;
  setCreditsOpen: (open: boolean) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
}

export const useApexStore = create<ApexState>((set, get) => ({
  vehicles: VEHICLES,
  activeIndex: 0,
  hoveredId: null,
  isHeld: false,
  dragRotation: 0,
  dragVelocity: 0,
  zoomOffset: 0,
  pointer: { x: 0, y: 0 },
  transitioning: false,
  reducedMotion: false,
  loadProgress: {},
  readyIds: [],
  failedIds: [],
  booted: false,
  creditsOpen: false,

  setHovered: (id) =>
    set((s) => ({
      hoveredId: typeof id === "function" ? id(s.hoveredId) : id,
    })),
  setHeld: (held) => set({ isHeld: held }),
  addDragRotation: (delta) =>
    set((s) => ({ dragRotation: s.dragRotation + delta })),
  setDragVelocity: (v) => set({ dragVelocity: v }),
  decayDragVelocity: (delta) => {
    const { dragVelocity, isHeld } = get();
    if (isHeld || Math.abs(dragVelocity) < 0.001) {
      if (!isHeld && dragVelocity !== 0) set({ dragVelocity: 0 });
      return;
    }
    // Exponential decay — a light flick keeps spinning briefly, like a
    // flywheel, instead of stopping the instant the mouse is released.
    const decayed = dragVelocity * Math.pow(0.05, delta);
    set((s) => ({
      dragRotation: s.dragRotation + decayed * delta,
      dragVelocity: decayed,
    }));
  },
  setZoomOffset: (updater) =>
    set((s) => ({ zoomOffset: updater(s.zoomOffset) })),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setLoadProgress: (id, fraction) =>
    set((s) =>
      s.loadProgress[id] === fraction
        ? s
        : { loadProgress: { ...s.loadProgress, [id]: fraction } }
    ),
  markReady: (id) =>
    set((s) => {
      if (s.readyIds.includes(id)) return s;
      const readyIds = [...s.readyIds, id];
      const active = s.vehicles[s.activeIndex]?.id;
      return {
        readyIds,
        loadProgress: { ...s.loadProgress, [id]: 1 },
        booted: s.booted || id === active,
      };
    }),
  markFailed: (id) =>
    set((s) => {
      if (s.failedIds.includes(id)) return s;
      const active = s.vehicles[s.activeIndex]?.id;
      return {
        failedIds: [...s.failedIds, id],
        booted: s.booted || id === active,
      };
    }),
  setCreditsOpen: (open) => set({ creditsOpen: open }),

  goTo: (index) => {
    const { vehicles, transitioning } = get();
    if (transitioning) return;
    const total = vehicles.length;
    const clamped = ((index % total) + total) % total;
    set({
      transitioning: true,
      dragRotation: 0,
      dragVelocity: 0,
      activeIndex: clamped,
    });
    window.setTimeout(
      () => set({ transitioning: false }),
      get().reducedMotion ? 200 : 900
    );
  },
  next: () => get().goTo(get().activeIndex + 1),
  prev: () => get().goTo(get().activeIndex - 1),
}));
