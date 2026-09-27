"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import SceneLighting from "./SceneLighting";
import CameraController from "./CameraController";
import CarCollection from "./CarCollection";

// Coarse-pointer devices (phones/tablets) start at a lower DPR so the very
// first frames are cheap, rather than starting high and immediately
// stepping down once PerformanceMonitor notices — a guess only used for the
// starting point, never a hard cap; PerformanceMonitor still adapts from
// here in either direction based on actual frame times.
function initialDpr() {
  if (typeof window === "undefined") return 1.5;
  return window.matchMedia("(pointer: coarse)").matches ? 1 : 1.5;
}

export default function AutomotiveScene() {
  // Adaptive quality: PerformanceMonitor watches actual frame times and we
  // respond by dropping device-pixel-ratio first, then the two most
  // expensive lighting effects (floor reflection + contact shadow), rather
  // than a fixed "is this a phone" guess.
  const [dpr, setDpr] = useState<number>(initialDpr);
  const [lowQuality, setLowQuality] = useState(false);

  return (
    <div className="absolute inset-0 z-10" style={{ touchAction: "none" }}>
      <Canvas
        shadows={!lowQuality}
        dpr={dpr}
        camera={{ fov: 32, position: [0, 1.4, 9] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#050505"]} />
        <PerformanceMonitor
          factor={1}
          onDecline={() => {
            setDpr((d) => Math.max(1, d - 0.25));
            setLowQuality(true);
          }}
          onIncline={() => setDpr((d) => Math.min(1.75, d + 0.25))}
        >
          <Suspense fallback={null}>
            <SceneLighting lowQuality={lowQuality} />
            <CarCollection />
          </Suspense>
          <CameraController />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
