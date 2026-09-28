export const STAGE_MOTION_PROFILES = {
  rise: { duration: 1.25, delay: 0, easing: 'outBack', bounce: 0.55 },
  fall: { duration: 0.8, delay: 0, easing: 'outCubic' },
  wire_drop: { duration: 2.2, delay: 0, easing: 'smooth', dropHeight: 4.2, overshoot: 0.14, swing: 0.11 },
};
export function ease(name, t, bounce = 0) {
  t = Math.max(0, Math.min(1, t));
  if (name === 'outCubic') return 1 - (1 - t) ** 3;
  if (name === 'outBack') {
    const s = 1.70158 * bounce;
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
  }
  return t * t * (3 - 2 * t);
}
