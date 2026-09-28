import { HemisphereLight, DirectionalLight, Fog, Color } from 'three';
import { SCENE_PROFILE } from '../../demo/profiles.js';
export function createLighting(scene) {
  scene.background = new Color(0xb6c7af);
  scene.fog = new Fog(...SCENE_PROFILE.fog);
  scene.add(new HemisphereLight(0xf8f0d6, 0x607c63, 2.1));
  const sun = new DirectionalLight(0xffdfad, 2.4);
  sun.position.set(-7, 12, 8);
  scene.add(sun);
}
