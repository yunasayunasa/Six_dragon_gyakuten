import { MeshDepthMaterial, RGBADepthPacking, NoBlending } from 'three';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
// Standard Bokeh shader/kernel. Only its depth prepass is adapted: the stock
// override material loses PNG alpha and atlas UVs, producing rectangular depth.
export class PaperBokehPass extends BokehPass {
  constructor(...args) { super(...args); this.depthMaterials = new Map(); }
  depthFor(material) {
    if (!this.depthMaterials.has(material)) {
      this.depthMaterials.set(material, new MeshDepthMaterial({ map: material.map, alphaMap: material.alphaMap, alphaTest: material.alphaTest, side: material.side, depthPacking: RGBADepthPacking, blending: NoBlending }));
    }
    return this.depthMaterials.get(material);
  }
  render(renderer, writeBuffer, readBuffer) {
    const swapped = [], hidden = [];
    const oldOverride = this.scene.overrideMaterial;
    renderer.getClearColor(this._oldClearColor);
    const alpha = renderer.getClearAlpha(), autoClear = renderer.autoClear;
    try {
      this.scene.overrideMaterial = null;
      this.scene.traverse((object) => {
        if (!object.isMesh) return;
        if (object.userData.skipDepth) { hidden.push([object, object.visible]); object.visible = false; return; }
        swapped.push([object, object.material]);
        object.material = Array.isArray(object.material) ? object.material.map((m) => this.depthFor(m)) : this.depthFor(object.material);
      });
      renderer.autoClear = false;
      renderer.setClearColor(0xffffff, 1);
      renderer.setRenderTarget(this._renderTargetDepth);
      renderer.clear();
      renderer.render(this.scene, this.camera);
      this.uniforms.tColor.value = readBuffer.texture;
      this.uniforms.nearClip.value = this.camera.near;
      this.uniforms.farClip.value = this.camera.far;
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      renderer.clear();
      this._fsQuad.render(renderer);
    } finally {
      for (const [object, material] of swapped) object.material = material;
      for (const [object, visible] of hidden) object.visible = visible;
      this.scene.overrideMaterial = oldOverride;
      renderer.setClearColor(this._oldClearColor, alpha);
      renderer.autoClear = autoClear;
    }
  }
  dispose() { for (const material of this.depthMaterials.values()) material.dispose(); this.depthMaterials.clear(); super.dispose(); }
}
