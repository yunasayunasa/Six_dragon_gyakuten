import { Group, Mesh, PlaneGeometry, CircleGeometry, MeshLambertMaterial, ShaderMaterial, Vector3 } from 'three';
import { POND_PROFILE as P } from './waterProfiles.js';
export function createPond(position) {
  const root = new Group(); root.position.fromArray(position);
  const bed = new Mesh(new CircleGeometry(1, 32), new MeshLambertMaterial({ color: 0x315d59 }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = -0.013; bed.scale.set(P.width / 2, P.depth / 2, 1);
  const water = new Mesh(new PlaneGeometry(P.width, P.depth), new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: P.opacity }, uScroll: { value: P.scroll }, uWave: { value: P.wave }, uTint: { value: new Vector3(...P.tint) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uOpacity; uniform float uScroll; uniform float uWave; uniform vec3 uTint;
      void main(){vec2 uv=vUv+vec2(uTime*uScroll,0.0); float wave=sin(uv.x*32.0+sin(uv.y*21.0+uTime*1.4))*uWave;
      float glint=pow(max(0.0,sin(uv.x*45.0+uv.y*17.0+uTime*1.8)),28.0)*0.055;
      vec3 color=uTint+vec3(wave+glint,wave+glint,wave+glint*0.8);
      float edge=1.0-smoothstep(0.81,0.99,length(vUv*2.0-1.0));
      gl_FragColor=vec4(color,uOpacity*edge); }`,
    transparent: true, depthWrite: false,
  }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.016;
  // Bokeh reads the opaque bed 0.029 m below the water. A generic depth
  // material for this translucent shader would write an opaque rectangle.
  water.userData.skipDepth = true;
  root.add(bed, water);
  return { group: root, bed, surface: water, update: (time) => { water.material.uniforms.uTime.value = time; } };
}
