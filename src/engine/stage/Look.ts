import * as THREE from 'three';

/**
 * 「見た目プリセット」。空・光・霧・色調を1セットにしたもの。
 * 同じ舞台でも Look を切り替えるだけで、夕景・対決・夜などの雰囲気に変えられる。
 * 新しいジャンル（墨絵など）はここに Look を足していく。
 */
export interface Look {
  skyTop: string;
  skyHorizon: string;
  /** 背景画像に掛ける色 */
  backdropTint: string;
  sunGlow: string;
  sunColor: string;
  sunIntensity: number;
  /** 太陽の方向（光が来る向き） */
  sunDir: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  tint: string;
  shadowTint: string;
  saturation: number;
  contrast: number;
  exposure: number;
  vignette: number;
  drama: number;
  farBlur: number;
  nearBlur: number;
  /** 光のにじみ 0..1 */
  bloom: number;
  /** 太陽側からの光漏れ 0..1（色は sunGlow） */
  leak: number;
}

export const LOOKS: Record<string, Look> = {
  /** 夕暮れの空港。暖色の光と紫の影 */
  sunset: {
    skyTop: '#4b4f8f',
    skyHorizon: '#ffb27a',
    backdropTint: '#ffd9bd',
    sunGlow: '#ffc27a',
    sunColor: '#ffe3c6',
    sunIntensity: 2.6,
    sunDir: [-0.55, 0.62, 0.56],
    hemiSky: '#c9c0ff',
    hemiGround: '#7a5a48',
    hemiIntensity: 1.25,
    fogColor: '#f0b99e',
    fogNear: 22,
    fogFar: 95,
    tint: '#fff7ef',
    shadowTint: '#5b3b8c',
    saturation: 1.05,
    contrast: 1.04,
    exposure: 1.04,
    vignette: 0.3,
    drama: 0,
    farBlur: 0.6,
    nearBlur: 0.75,
    bloom: 0.55,
    leak: 0.32,
  },
  /** 対決。周りが暗く落ち、証人にスポットが当たる */
  confront: {
    skyTop: '#16163a',
    skyHorizon: '#5a3a7e',
    backdropTint: '#8f86c4',
    sunGlow: '#c0708c',
    sunColor: '#ffd8c4',
    sunIntensity: 1.9,
    sunDir: [0.3, 0.7, 0.6],
    hemiSky: '#7d78c8',
    hemiGround: '#3a2a3a',
    hemiIntensity: 0.9,
    fogColor: '#3c2f5c',
    fogNear: 12,
    fogFar: 55,
    tint: '#f1ecff',
    shadowTint: '#2b1d63',
    saturation: 1.02,
    contrast: 1.1,
    exposure: 1.0,
    vignette: 0.45,
    drama: 0.55,
    farBlur: 1,
    nearBlur: 0.8,
    bloom: 0.35,
    leak: 0.08,
  },
  /** 解決後。灯りがともった宵の口 */
  dusk: {
    skyTop: '#2b3470',
    skyHorizon: '#f08f7a',
    backdropTint: '#d9a8b8',
    sunGlow: '#ffc38a',
    sunColor: '#ffc9a5',
    sunIntensity: 1.6,
    sunDir: [-0.5, 0.55, 0.62],
    hemiSky: '#8c86ff',
    hemiGround: '#4a2c32',
    hemiIntensity: 0.95,
    fogColor: '#a8779a',
    fogNear: 16,
    fogFar: 70,
    tint: '#fff0ea',
    shadowTint: '#3e3294',
    saturation: 1.1,
    contrast: 1.05,
    exposure: 1.02,
    vignette: 0.35,
    drama: 0,
    farBlur: 0.85,
    nearBlur: 0.7,
    bloom: 0.75,
    leak: 0.2,
  },
};

/** Look同士を補間するための数値化 */
export interface LookState {
  colors: Record<string, THREE.Color>;
  nums: Record<string, number>;
  sunDir: THREE.Vector3;
}

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'backdropTint', 'sunGlow', 'sunColor', 'hemiSky', 'hemiGround', 'fogColor', 'tint', 'shadowTint'] as const;
const NUM_KEYS = ['sunIntensity', 'hemiIntensity', 'fogNear', 'fogFar', 'saturation', 'contrast', 'exposure', 'vignette', 'drama', 'farBlur', 'nearBlur', 'bloom', 'leak'] as const;

export function lookState(look: Look): LookState {
  const colors: Record<string, THREE.Color> = {};
  for (const k of COLOR_KEYS) colors[k] = new THREE.Color(look[k]);
  const nums: Record<string, number> = {};
  for (const k of NUM_KEYS) nums[k] = look[k];
  return { colors, nums, sunDir: new THREE.Vector3(...look.sunDir).normalize() };
}

export function lerpLook(out: LookState, a: LookState, b: LookState, t: number): void {
  for (const k of COLOR_KEYS) out.colors[k].copy(a.colors[k]).lerp(b.colors[k], t);
  for (const k of NUM_KEYS) out.nums[k] = a.nums[k] + (b.nums[k] - a.nums[k]) * t;
  out.sunDir.copy(a.sunDir).lerp(b.sunDir, t).normalize();
}

export function cloneState(s: LookState): LookState {
  const colors: Record<string, THREE.Color> = {};
  for (const [k, v] of Object.entries(s.colors)) colors[k] = v.clone();
  return { colors, nums: { ...s.nums }, sunDir: s.sunDir.clone() };
}
