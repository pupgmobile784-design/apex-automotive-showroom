"use client";

import { ContactShadows, Environment, MeshReflectorMaterial } from "@react-three/drei";

interface SceneLightingProps {
  /** Set by AutomotiveScene's PerformanceMonitor when frame times climb —
   * trims the two most expensive effects (floor reflection, contact shadow)
   * first, since they're the least visually missed under motion. */
  lowQuality?: boolean;
}

export default function SceneLighting({ lowQuality = false }: SceneLightingProps) {
  return (
    <>
      {/* Soft ambient so nothing goes pure black / unreadable */}
      <ambientLight intensity={0.12} />

      {/* Key light: large soft spot from front-above, the classic studio key */}
      <spotLight
        position={[4, 8, 6]}
        angle={0.4}
        penumbra={0.8}
        intensity={2.4}
        color="#ffffff"
        castShadow={!lowQuality}
        shadow-mapSize={lowQuality ? [512, 512] : [1024, 1024]}
      />

      {/* Rim light: restrained accent tint, low behind, carves the silhouette
          without tipping into a neon glow */}
      <spotLight
        position={[-6, 3, -6]}
        angle={0.5}
        penumbra={1}
        intensity={1.1}
        color="#c23a34"
      />

      {/* Fill: cool, low intensity, opposite the key */}
      <pointLight position={[-4, 2, 4]} intensity={0.45} color="#8fb8d9" />

      {/* HDRI-style reflections on the metallic paint without a heavy env map.
          "studio" reads as a softbox rig rather than a skyline, which is
          what keeps chrome/paint reflections premium-dark-studio rather
          than city-demo. Resolution drops under load same as everything
          else PerformanceMonitor already trims. */}
      <Environment
        preset="studio"
        environmentIntensity={lowQuality ? 0.3 : 0.4}
        resolution={lowQuality ? 128 : 256}
      />

      {/* Glossy studio floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial
          mirror={0.3}
          blur={lowQuality ? [200, 60] : [400, 100]}
          resolution={lowQuality ? 512 : 1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#020202"
          metalness={0.6}
        />
      </mesh>

      {/* Soft contact shadow directly under the fleet — reads as "grounded"
          even where the reflective floor's own shadow falls off */}
      {!lowQuality && (
        <ContactShadows
          position={[0, -0.89, 0]}
          opacity={0.6}
          scale={16}
          blur={2.2}
          far={3}
          resolution={512}
          color="#000000"
        />
      )}

      {/* Distance fade so the fleet emerges from black instead of hitting a hard wall */}
      <fog attach="fog" args={["#050505", 8, 26]} />
    </>
  );
}
