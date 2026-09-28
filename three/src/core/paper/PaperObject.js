import { Group, Mesh, PlaneGeometry, MeshLambertMaterial, DoubleSide } from 'three';
export class PaperObject extends Group {
  constructor(texture, { height = 2, width, billboard = false, color = 0xffffff } = {}) {
    super();
    width ??= height * texture.image.width / texture.image.height;
    this.mesh = new Mesh(new PlaneGeometry(width, height), new MeshLambertMaterial({ map: texture, alphaTest: 0.45, side: DoubleSide, color }));
    this.mesh.position.y = height / 2;
    this.add(this.mesh);
    this.billboard = billboard;
  }
  faceCamera(camera) {
    if (this.billboard) this.rotation.y = Math.atan2(camera.position.x - this.position.x, camera.position.z - this.position.z);
  }
}
