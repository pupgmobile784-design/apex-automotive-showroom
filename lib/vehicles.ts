/**
 * Fleet data — the single source of truth for every car in APEX.
 *
 * Every entry maps to a real GLB in /public/models. Nothing here is a
 * placeholder: the 3D scene renders exactly these files.
 *
 * ── Per-model correction (all optional) ─────────────────────────────────
 * lib/normalize.ts already auto-aligns (length → Z axis), auto-scales (every
 * car to the same length), auto-centers and drops every model onto the
 * floor, whatever units/origin it was exported with. These three fields
 * exist only to correct a specific export's quirks, without touching any
 * component:
 *
 *   rotationOffset   radians around Y, applied BEFORE measuring. The whole
 *                    fleet is authored front-facing +Z, so it is 0 for all
 *                    nine shipped models. Use Math.PI for a model that
 *                    loads backwards.
 *   scaleMultiplier  multiplies the auto-computed fit-to-fleet scale
 *                    (1.06 = 6 % bigger next to its neighbours).
 *   positionOffset   [x, y, z] nudge after centering + flooring, in scene
 *                    units (use a small negative y if wheels float).
 *
 * ── Adding a car ────────────────────────────────────────────────────────
 * 1. Put the .glb in /public/models (lowercase, hyphenated filename).
 * 2. Append an entry below. That's it — the arc, camera framing, loader,
 *    counter and navigation all read this array.
 *
 * Specs come from the Supercar Vault 3D pack's own data. Where the pack
 * only carried a copy-pasted placeholder (Caspita, Mach 1, AMG GT3), the
 * figures are intentionally left out rather than invented — fill them in
 * when you have a source and they will appear automatically.
 */

export interface Vehicle {
  id: string;
  name: string; // model name shown as the large heading
  brand: string;
  tagline?: string;
  model: string; // public path to the GLB, e.g. "/models/ferrari-f50.glb"

  power?: string; // "513 HP"
  torque?: string; // "470 NM"
  acceleration?: string; // "3.7 SEC"
  topSpeed?: string; // "325 KM/H"

  rotationOffset?: number;
  scaleMultiplier?: number;
  positionOffset?: [number, number, number];

  /** Attribution — shown in the Credits dialog. */
  credit: {
    title: string; // model title as named in the source pack
    source: string; // where the pack says it came from
    author?: string; // only when the pack's own filename names one
    file: string; // original filename inside Supercar-Vault-3D-main/models
  };
}

const SOURCE = "Sketchfab (via the Supercar Vault 3D pack)";

export const VEHICLES: Vehicle[] = [
  {
    id: "pagani-imola",
    name: "IMOLA",
    brand: "PAGANI",
    tagline: "Where racing DNA meets the open road.",
    model: "/models/pagani-imola.glb",
    power: "827 HP",
    acceleration: "2.7 SEC",
    topSpeed: "300 KM/H",
    credit: { title: "2021 Pagani Imola", source: SOURCE, file: "2021_pagani_imola.glb" },
  },
  {
    id: "mclaren-f1-gtr-longtail",
    name: "F1 GTR LONGTAIL",
    brand: "MCLAREN",
    tagline: "The Le Mans legend, born on the limit.",
    model: "/models/mclaren-f1-gtr-longtail.glb",
    power: "668 HP",
    acceleration: "3.2 SEC",
    topSpeed: "391 KM/H",
    credit: {
      title: "McLaren F1 GTR Longtail",
      source: `${SOURCE}; filename credits www.vecarz.com`,
      file: "mclaren_f1_gtr_longtail__www.vecarz.com.glb",
    },
  },
  {
    id: "koenigsegg-one1",
    name: "ONE:1",
    brand: "KOENIGSEGG",
    tagline: "One megawatt. One megagram. One-to-one.",
    model: "/models/koenigsegg-one1.glb",
    power: "1,360 HP",
    acceleration: "2.8 SEC",
    topSpeed: "440 KM/H",
    credit: { title: "2014 Koenigsegg One:1", source: SOURCE, file: "2014_koenigsegg_one-1.glb" },
  },
  {
    id: "mclaren-p1-gtr",
    name: "P1 GTR",
    brand: "MCLAREN",
    tagline: "Track-only perfection, no compromise.",
    model: "/models/mclaren-p1-gtr.glb",
    power: "1,000 HP",
    acceleration: "2.4 SEC",
    topSpeed: "350 KM/H",
    credit: { title: "McLaren P1 GTR (free)", source: SOURCE, file: "free_mclaren_p1_gtr.glb" },
  },
  {
    id: "porsche-911-gt3-rs",
    name: "911 GT3 RS",
    brand: "PORSCHE",
    tagline: "Motorsport engineering, undiluted.",
    model: "/models/porsche-911-gt3-rs.glb",
    power: "525 HP",
    acceleration: "3.2 SEC",
    topSpeed: "296 KM/H",
    credit: {
      title: "2023 Porsche 911 GT3 RS 2.7 Carrera Tribute (992)",
      source: SOURCE,
      file: "2023_porsche_911_gt3_rs_2.7_carrera_tribute_992.glb",
    },
  },
  {
    id: "mercedes-amg-gt3",
    name: "AMG GT3",
    brand: "MERCEDES-AMG",
    tagline: "Mercedes-AMG GT3, 2016.",
    model: "/models/mercedes-amg-gt3.glb",
    credit: {
      title: "Mercedes-AMG GT3",
      source: `${SOURCE}; filename credits www.vecarz.com`,
      file: "mercedes-amg_gt3__www.vecarz.com.glb",
    },
  },
  {
    id: "ferrari-f50",
    name: "F50",
    brand: "FERRARI",
    tagline: "A Formula 1 car built for the road.",
    model: "/models/ferrari-f50.glb",
    power: "513 HP",
    acceleration: "3.7 SEC",
    topSpeed: "325 KM/H",
    credit: { title: "1995 Ferrari F50", source: SOURCE, file: "1995_ferrari_f50.glb" },
  },
  {
    id: "jiotto-caspita",
    name: "CASPITA F1",
    brand: "JIOTTO",
    tagline: "The legend that changed the game.",
    model: "/models/jiotto-caspita.glb",
    credit: {
      title: "Jiotto Caspita F1 Road Car (1989)",
      source: SOURCE,
      author: "alex.ka. (as named in the source filename)",
      file: "jiotto_caspita_f1_road_car_1989_by_alex.ka..glb",
    },
  },
  {
    id: "ford-mustang-mach-1",
    name: "MUSTANG MACH 1",
    brand: "FORD",
    tagline: "428 Cobra Jet, 1969.",
    model: "/models/ford-mustang-mach-1.glb",
    credit: {
      title: "1969 Ford Mustang Mach 1 428 Cobra Jet",
      source: SOURCE,
      file: "1969_ford_mustang_mach-1_428_cobra_jet.glb",
    },
  },
];
