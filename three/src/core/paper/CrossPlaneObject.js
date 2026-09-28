import { Group } from 'three';
import { PaperObject } from './PaperObject.js';
export class CrossPlaneObject extends Group {
  constructor(texture, options) {
    super();
    this.add(new PaperObject(texture, options));
    const cross = new PaperObject(texture, options);
    cross.rotation.y = Math.PI / 2;
    this.add(cross);
  }
}
