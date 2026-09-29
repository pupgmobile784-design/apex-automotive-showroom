import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { GLTF } from "three-stdlib";

// Same decoder location drei's useGLTF uses. The shipped models are plain
// (uncompressed) GLBs so this is never fetched for them, but a Draco- or
// Meshopt-compressed export dropped into /public/models works unchanged.
const DRACO_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

let dracoLoader: DRACOLoader | null = null;

function extendLoader(loader: GLTFLoader) {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_PATH);
  }
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
}

/**
 * Suspense GLB loader. Equivalent to drei's useGLTF, but exposes the loader's
 * real byte-level progress event, which drei's useGLTF (and useProgress —
 * it only counts finished files) cannot report. That is what lets the loading
 * screen show an honest percentage while a 12 MB model streams in.
 */
export function useCarGLTF(url: string, onProgress?: (e: ProgressEvent) => void) {
  return useLoader(
    GLTFLoader,
    url,
    extendLoader,
    onProgress
  ) as unknown as GLTF;
}

export function clearCarGLTF(url: string) {
  useLoader.clear(GLTFLoader, url);
}
