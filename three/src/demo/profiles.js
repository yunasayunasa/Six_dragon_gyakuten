export const DOF_PROFILES = {
  Exploration: { aperture: 0.00085, maxBlur: 0.006, response: 4 },
  StageEvent: { aperture: 0.0018, maxBlur: 0.012, response: 3 },
};
// Bokeh quality adjusts blur strength. DPR can be overridden independently.
export const QUALITY_PROFILES = {
  HIGH: { desktop: 2, mobile: 1.5, blurScale: 1 },
  MEDIUM: { desktop: 1.25, mobile: 1, blurScale: 0.9 },
  LOW: { desktop: 0.85, mobile: 0.85, blurScale: 0.8 },
};
export const CAMERA_PROFILE = { fov: 38, near: 0.1, far: 100, offset: [0, 9.5, 17], target: [0, 1, -1], follow: 0.3, lookAhead: 0.25, response: 3, eventPush: 0.04 };
export const STAGE_PROFILE = { focus: 0.85, hold: 1.1, restore: 1.1, triggerRadius: 2.3 };
export const PLAYER_PROFILE = { speed: 3.2, height: 2.5, columns: 5, rows: 5, frames: 25, fps: 14, start: [-3, 0, 2], bounds: [-8, 8, -5.2, 5] };
export const SCENE_PROFILE = { fog: [0xb6c7af, 19, 55], groundSize: 100, stageSign: [2.2, 0.035, -1.9], stageWire: [4, 1.9, -3.4], house: [5.8, 0, -7.5], pond: [-5.2, 0.035, -0.6] };
