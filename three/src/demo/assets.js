import player from '../../../assets/character/walk_edge.png?url';
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
import { TextureLoader, SRGBColorSpace, RepeatWrapping } from 'three';
export async function loadAssets() {
  const loader = new TextureLoader();
  const textures = Object.fromEntries(await Promise.all(Object.entries({ player, tree, grass, bush, flowers, sign, lamp, ground, dirt, shadow, door, mountains }).map(async ([key, url]) => {
    const texture = await loader.loadAsync(url);
    texture.colorSpace = SRGBColorSpace;
    if (key === 'ground' || key === 'dirt') texture.wrapS = texture.wrapT = RepeatWrapping;
    return [key, texture];
  })));
  return textures;
}
