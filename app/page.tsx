"use client";

import dynamic from "next/dynamic";
import Header from "@/components/Header";
import CarInfo from "@/components/CarInfo";
import CustomCursor from "@/components/CustomCursor";
import ScrollController from "@/components/ScrollController";
import VehicleNav from "@/components/VehicleNav";
import LoadingScreen from "@/components/LoadingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSyncReducedMotion } from "@/lib/useReducedMotion";

// The scene is loaded client-side only: WebGL has no meaning during SSR,
// and this also keeps three.js out of the server bundle.
const AutomotiveScene = dynamic(
  () => import("@/components/AutomotiveScene"),
  { ssr: false }
);

function SceneUnavailable() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-void-950">
      <p className="apex-mono max-w-xs text-center text-white/40">
        The 3D experience couldn&apos;t start on this device. Specifications
        for the current model are still shown below.
      </p>
    </div>
  );
}

export default function Home() {
  useSyncReducedMotion();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-void-950 text-white">
      <ScrollController />
      <CustomCursor />
      <LoadingScreen />
      <Header />
      <VehicleNav />

      <ErrorBoundary fallback={<SceneUnavailable />}>
        <AutomotiveScene />
      </ErrorBoundary>

      <CarInfo />

      <div className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-center apex-mono text-white/40">
        <span>DRAG TO ROTATE</span>
        <span>SCROLL TO EXPLORE</span>
      </div>
    </main>
  );
}
