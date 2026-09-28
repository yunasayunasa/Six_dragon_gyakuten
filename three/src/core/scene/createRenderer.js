import { WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace } from 'three';
export function createRenderer(container) {
  const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.info.autoReset = false;
  container.append(renderer.domElement);
  return renderer;
}
