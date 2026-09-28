import { Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry, MeshLambertMaterial, MeshBasicMaterial, Group, DoubleSide } from 'three';
import { PaperObject } from '../core/paper/PaperObject.js';
import { CrossPlaneObject } from '../core/paper/CrossPlaneObject.js';
import { StageProp } from '../presentation/stage/StageProp.js';
import { createPond } from '../presentation/water/createPond.js';
import { SCENE_PROFILE as P } from './demoProfiles.js';
export function createForest(scene, t) {
  const billboards = [];
  t.ground.repeat.set(22, 22);
  const ground = new Mesh(new PlaneGeometry(P.groundSize, P.groundSize), new MeshLambertMaterial({ map: t.ground, color: 0xb9c589 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const pathMap = t.dirt.clone(); pathMap.repeat.set(2, 8);
  const path = new Mesh(new PlaneGeometry(3.2, 22), new MeshLambertMaterial({ map: pathMap, color: 0xcbb38c, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  path.rotation.set(-Math.PI / 2, 0, -0.32); path.position.set(0.8, 0.012, -2);
  scene.add(path);
  const paper = (key, x, z, height, billboard = false, color = 0xffffff) => {
    const object = new PaperObject(t[key], { height, billboard, color });
    object.position.set(x, 0, z); scene.add(object);
    if (billboard) billboards.push(object);
    return object;
  };
  const far = paper('mountains', 0, -30, 16, false, 0xe0e4cf); far.position.y = -1; far.mesh.material.fog = false;
  // Fixed placements make desktop/mobile A/B repeatable (no random layouts).
  for (const [x, z, h] of [[-14,-15,11],[-8,-17,12],[-2,-18,10],[5,-19,12],[13,-16,11],[-11,-9,8],[-5,-11,8],[0,-12,7],[12,-10,8]]) paper('tree', x, z, h, false, 0xc9dbba);
  for (const [x, z, h] of [[-7,-3,6],[-9,1,7],[9,-2,6],[11,3,7],[-4,-6,5]]) {
    const tree = new CrossPlaneObject(t.tree, { height: h }); tree.position.set(x, 0, z); scene.add(tree);
  }
  for (const [x, z, h] of [[-5,2,1],[-6,4,1.1],[-3,-3,0.85],[3,3,0.8],[6,2,1],[7,-3,0.9],[-7,-1,1.2],[2,-6,0.9],[-2,5,0.7],[5,5,1],[-1,-5,0.65],[8,4,1]]) paper('grass', x, z, h, true);
  for (const [x, z] of [[-6,-4],[8,-5],[-4,4],[7,4]]) paper('bush', x, z, 1.5, true);
  for (const [x, z] of [[-4,1],[4,4],[-2,-4]]) paper('flowers', x, z, 0.7, true);
  // Near planes: out of the walking corridor, clearly closer than the player.
  paper('tree', -10, 9, 10); paper('tree', 11, 8, 10);
  const house = new Group(); house.position.fromArray(P.house);
  const walls = new Mesh(new BoxGeometry(4, 3, 3), new MeshLambertMaterial({ color: 0xc4a678 })); walls.position.y = 1.5; house.add(walls);
  const roof = new Mesh(new CylinderGeometry(0, 3.6, 2.2, 4), new MeshLambertMaterial({ color: 0x64524a })); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.86; roof.position.y = 4; house.add(roof);
  for (const x of [-1.87, 1.87]) { const beam = new Mesh(new BoxGeometry(0.16, 3.2, 3.15), new MeshLambertMaterial({ color: 0x625543 })); beam.position.set(x, 1.6, 0); house.add(beam); }
  const doorPaper = new PaperObject(t.door, { height: 2.4, width: 1.35 });
  doorPaper.position.set(-0.6, 0.02, 1.515);
  const door = new StageProp(doorPaper, { foldAngle: Math.PI / 2 }); house.add(door);
  const window = new Mesh(new PlaneGeometry(0.8, 0.9), new MeshBasicMaterial({ color: 0xf6cf7f, side: DoubleSide })); window.position.set(1, 1.9, 1.52); house.add(window);
  scene.add(house);
  const sign = new StageProp(new PaperObject(t.sign, { height: 2.6 }));
  sign.position.fromArray(P.stageSign); sign.landing.copy(sign.position); sign.rotation.x = sign.foldAngle; scene.add(sign);
  const wire = new StageProp(new PaperObject(t.lamp, { height: 1.9 }), { pivot: [0, 1.9, 0] });
  wire.position.fromArray(P.stageWire); wire.landing.copy(wire.position); wire.visible = false; scene.add(wire);
  const pond = createPond(P.pond); scene.add(pond.group);
  return { sign, wire, door, pond, billboards };
}
