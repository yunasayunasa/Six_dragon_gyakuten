import { Vector3 } from 'three';
export function axialDistance(camera, target) {
  return Math.max(camera.near, -new Vector3().copy(target).applyMatrix4(camera.matrixWorldInverse).z);
}
export const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
export const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
