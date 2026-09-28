import player from '../../../assets/character/walk_edge.png?url';
import acceptancePlayer from './assets/acceptance-player.jpg?url';
import tree from '../../../assets/props/tree_edge.png?url';
import grass from '../../../assets/props/grass_edge.png?url';
import bush from '../../../assets/props/bush_edge.png?url';
import flowers from '../../../assets/props/flowers_edge.png?url';
import sign from '../../../assets/props/sign_edge.png?url';
import lamp from '../../../assets/props/lamp.png?url';
import ground from '../../../assets/ground/grass.png?url';
import dirt from '../../../assets/ground/dirt.png?url';
import shadow from '../../../assets/fx/contact_shadow.png?url';
import door from '../../../assets/architecture/door.svg?url';
import mountains from '../../../assets/background/mountains.svg?url';
import { TextureLoader, CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';

// The supplied 8-direction reference is a JPG. Remove only white background
// connected to each atlas cell's edge; pale details inside the character stay.
function keyedAtlas(texture, columns = 8, rows = 8) {
  const image = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = pixels;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const white = (index) => data[index * 4] >= 242 && data[index * 4 + 1] >= 242 && data[index * 4 + 2] >= 242;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x0 = Math.round(column * width / columns), x1 = Math.round((column + 1) * width / columns);
    const y0 = Math.round(row * height / rows), y1 = Math.round((row + 1) * height / rows);
    let head = 0, tail = 0;
    const add = (x, y) => {
      const index = y * width + x;
      if (visited[index] || !white(index)) return;
      visited[index] = 1; queue[tail++] = index;
    };
    for (let x = x0; x < x1; x++) { add(x, y0); add(x, y1 - 1); }
    for (let y = y0 + 1; y < y1 - 1; y++) { add(x0, y); add(x1 - 1, y); }
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      data[index * 4 + 3] = 0;
      if (x > x0) add(x - 1, y);
      if (x + 1 < x1) add(x + 1, y);
      if (y > y0) add(x, y - 1);
      if (y + 1 < y1) add(x, y + 1);
    }
  }
  context.putImageData(pixels, 0, 0);
  const result = new CanvasTexture(canvas);
  result.colorSpace = SRGBColorSpace;
  texture.dispose();
  return result;
}

export async function loadAssets({ acceptance = false } = {}) {
  const loader = new TextureLoader();
  const textures = Object.fromEntries(await Promise.all(Object.entries({ player: acceptance ? acceptancePlayer : player, tree, grass, bush, flowers, sign, lamp, ground, dirt, shadow, door, mountains }).map(async ([key, url]) => {
    const texture = await loader.loadAsync(url);
    texture.colorSpace = SRGBColorSpace;
    if (key === 'ground' || key === 'dirt') texture.wrapS = texture.wrapT = RepeatWrapping;
    return [key, acceptance && key === 'player' ? keyedAtlas(texture) : texture];
  })));
  return textures;
}
