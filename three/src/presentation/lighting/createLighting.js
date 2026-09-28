import { HemisphereLight, DirectionalLight, Fog, Color } from 'three';
import { LIGHTING_PROFILE } from './defaultProfiles.js';
export function createLighting(scene, profile = LIGHTING_PROFILE) {
  const P = { ...LIGHTING_PROFILE, ...profile };
  scene.background = new Color(P.background);
  scene.fog = new Fog(...P.fog);
  scene.add(new HemisphereLight(...P.hemisphere));
  const sun = new DirectionalLight(...P.sun);
  sun.position.fromArray(P.sunPosition);
  scene.add(sun);
}
