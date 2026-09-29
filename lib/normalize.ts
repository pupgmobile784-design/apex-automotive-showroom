import { Box3, Object3D, Vector3 } from "three";
import type { Vehicle } from "./vehicles";

/** Every car is scaled so its length matches this, in scene units. */
export const TARGET_LENGTH = 4.2;

/** World-space Y of the showroom floor. Cars stand on it. */
export const FLOOR_Y = -0.9;

export interface CarDimensions {
  length: number;
  width: number;
  height: number;
  /** Radius of the bounding sphere around the car's centre. */
  radius: number;
}

/**
 * Framing data for every car that has loaded, keyed by vehicle id. Written
 * once per load by normalizeCar(), read every frame by CameraController.
 * Deliberately a plain Map (not React/zustand state): it's consumed inside
 * useFrame and must never trigger a re-render.
 */
export const carDimensions = new Map<string, CarDimensions>();

/**
 * Turn an arbitrary GLB scene into a car that is ready to show:
 *  1. length axis → Z (a model exported nose-along-X is turned 90°),
 *  2. vehicle.rotationOffset applied (before measuring, so every
 *     measurement below is taken in the orientation that is displayed),
 *  3. uniformly scaled to TARGET_LENGTH × vehicle.scaleMultiplier — never
 *     stretched, proportions are untouched,
 *  4. centred on X/Z and dropped so its lowest point (the tyres) is y = 0,
 *  5. vehicle.positionOffset applied last.
 *
 * Works for any source scale (the shipped pack ranges from 0.05 to 46 units
 * long) and any origin. The returned object is a clone that shares
 * geometry/materials with the cached GLTF (cheap), wrapped in a parent so
 * the corrections live on a single transform and the clone stays pristine.
 */
export function normalizeCar(source: Object3D, vehicle: Vehicle): Object3D {
  const inner = source.clone(true);
  const wrapper = new Object3D();
  wrapper.add(inner);

  // 1 + 2: orientation
  wrapper.rotation.y = 0;
  wrapper.updateMatrixWorld(true);
  const raw = new Box3().setFromObject(wrapper);
  const rawSize = raw.getSize(new Vector3());
  const autoYaw = rawSize.x > rawSize.z * 1.05 ? Math.PI / 2 : 0;
  wrapper.rotation.y = autoYaw + (vehicle.rotationOffset ?? 0);
  wrapper.updateMatrixWorld(true);

  // 3: uniform scale
  const oriented = new Box3().setFromObject(wrapper);
  const size = oriented.getSize(new Vector3());
  const length = Math.max(size.x, size.z) || 1;
  const scale = (TARGET_LENGTH / length) * (vehicle.scaleMultiplier ?? 1);
  wrapper.scale.setScalar(scale);
  wrapper.updateMatrixWorld(true);

  // 4: centre + floor
  const fitted = new Box3().setFromObject(wrapper);
  const center = fitted.getCenter(new Vector3());
  wrapper.position.set(-center.x, -fitted.min.y, -center.z);

  // 5: manual nudge
  const [ox, oy, oz] = vehicle.positionOffset ?? [0, 0, 0];
  wrapper.position.x += ox;
  wrapper.position.y += oy;
  wrapper.position.z += oz;
  wrapper.updateMatrixWorld(true);

  const finalSize = fitted.getSize(new Vector3());
  carDimensions.set(vehicle.id, {
    length: Math.max(finalSize.x, finalSize.z),
    width: Math.min(finalSize.x, finalSize.z),
    height: finalSize.y,
    radius: finalSize.length() / 2,
  });

  // Outer group so callers can position the car without disturbing the
  // wrapper's own corrective transform.
  const root = new Object3D();
  root.add(wrapper);
  return root;
}
