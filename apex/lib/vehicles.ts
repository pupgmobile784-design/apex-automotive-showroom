export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string; // path to a GLB/GLTF file, e.g. "/models/911-gt3.glb"
  power: string; // "502 HP"
  torque: string; // "470 Nm"
  acceleration: string; // "3.4 SEC"
  topSpeed: string; // "318 KM/H"
  color: string; // hex used by the procedural placeholder body material

  /**
   * Per-vehicle correction for however the source GLB was modeled/exported.
   * CarModel.tsx already auto-centers, auto-floors, and auto-scales every
   * model to the fleet's target length regardless of its native units or
   * origin — these three are only for fixing orientation/proportion quirks
   * a specific export has (e.g. it faces -Z instead of +Z), without ever
   * touching CarModel.tsx itself. All three are optional; omitting them is
   * identical to { rotationOffset: 0, scaleMultiplier: 1, positionOffset:
   * [0, 0, 0] }.
   *
   * Example, for a model that loads facing backwards:
   *   { id: "porsche-911-gt3", ..., rotationOffset: Math.PI }
   */
  rotationOffset?: number; // radians, applied around Y before auto-fit measures the model
  scaleMultiplier?: number; // multiplies the auto-computed fit-to-fleet scale
  positionOffset?: [number, number, number]; // nudges the model after it's been centered + floored
}

/**
 * Fleet data.
 *
 * `model` points at a GLB path. <CarModel /> (components/CarModel.tsx) tries
 * to load it with useGLTF inside a Suspense + error boundary, and falls back
 * to a high-quality procedural body if the file is missing or fails to
 * parse — see components/CarBody.tsx. Drop a real .glb into /public/models
 * with a matching filename and it is picked up automatically; no other code
 * needs to change. If the model loads facing the wrong way, looks
 * mis-scaled next to the rest of the fleet, or sits slightly off the floor,
 * add rotationOffset / scaleMultiplier / positionOffset above rather than
 * touching CarModel.tsx.
 */
export const VEHICLES: Vehicle[] = [
  {
    id: "porsche-911-gt3",
    name: "PORSCHE 911 GT3",
    brand: "PORSCHE",
    model: "/models/porsche-911-gt3.glb",
    power: "502 HP",
    torque: "470 NM",
    acceleration: "3.4 SEC",
    topSpeed: "318 KM/H",
    color: "#e6e6e6",
  },
  {
    id: "bmw-m4",
    name: "BMW M4",
    brand: "BMW",
    model: "/models/bmw-m4.glb",
    power: "503 HP",
    torque: "650 NM",
    acceleration: "3.5 SEC",
    topSpeed: "290 KM/H",
    color: "#1b3a6b",
  },
  {
    id: "amg-gt",
    name: "MERCEDES-AMG GT",
    brand: "MERCEDES-AMG",
    model: "/models/amg-gt.glb",
    power: "523 HP",
    torque: "684 NM",
    acceleration: "3.6 SEC",
    topSpeed: "312 KM/H",
    color: "#0c0c0c",
  },
  {
    id: "audi-r8",
    name: "AUDI R8",
    brand: "AUDI",
    model: "/models/audi-r8.glb",
    power: "562 HP",
    torque: "550 NM",
    acceleration: "3.2 SEC",
    topSpeed: "331 KM/H",
    color: "#8a8f94",
  },
  {
    id: "lamborghini-huracan",
    name: "LAMBORGHINI HURAC\u00c1N",
    brand: "LAMBORGHINI",
    model: "/models/lamborghini-huracan.glb",
    power: "631 HP",
    torque: "600 NM",
    acceleration: "2.9 SEC",
    topSpeed: "325 KM/H",
    color: "#e10600",
  },
  {
    id: "ferrari-488",
    name: "FERRARI 488",
    brand: "FERRARI",
    model: "/models/ferrari-488.glb",
    power: "661 HP",
    torque: "760 NM",
    acceleration: "3.0 SEC",
    topSpeed: "330 KM/H",
    color: "#a10000",
  },
];
