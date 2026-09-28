import { PLAYER_PROFILE as DEFAULT_PLAYER } from '../core/character/defaultProfiles.js';
export const PLAYER_PROFILE = { ...DEFAULT_PLAYER, columns: 5, rows: 5, frames: 25, aspect: 128 / 208, start: [-3, 0, 2], bounds: [-8, 8, -5.2, 5] };
export const STAGE_PROFILE = { focus: 0.85, hold: 1.1, restore: 1.1, triggerRadius: 2.3 };
export const SCENE_PROFILE = { fog: [0xb6c7af, 19, 55], groundSize: 100, stageSign: [2.2, 0.035, -1.9], stageWire: [4, 1.9, -3.4], house: [5.8, 0, -7.5], pond: [-5.2, 0.035, -0.6] };
