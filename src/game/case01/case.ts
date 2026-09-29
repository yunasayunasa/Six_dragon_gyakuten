import * as THREE from 'three';
import type { Engine } from '../../engine';
import { glowTexture } from '../../engine/paper/textures';
import type { CaseData } from '../../genres/investigation/types';
import * as S from './scripts';

const RAIL_Z = -3.05;

/** 桟橋の手すり・灯台柱・係留柱など、画像以外の舞台装置 */
async function buildSet(engine: Engine): Promise<void> {
  const st = engine.stage;
  const wood = '#7a4b2e';
  const woodDark = '#5a3421';
  // 奥の手すり（柱＋横木）
  for (let x = -12; x <= 12.01; x += 2.4) st.addBlock([0.18, 1.05, 0.18], [x, 0.52, RAIL_Z], woodDark);
  st.addBlock([24.4, 0.1, 0.12], [0, 1.0, RAIL_Z], wood, { cast: false });
  st.addBlock([24.4, 0.07, 0.08], [0, 0.55, RAIL_Z], wood, { cast: false });
  // 桟橋の縁（床の厚み）
  st.addBlock([44, 0.5, 0.4], [0, -0.25, -4.55], woodDark, { cast: false });
  // 掲示板の柱
  st.addBlock([0.12, 1.2, 0.12], [-3.6, 0.6, -2.45], woodDark);
  // 係留柱
  st.addCylinder(0.15, 0.85, [6.2, 0, -2.35], woodDark);
  // 灯台柱（石）と台座
  st.addCylinder(0.26, 2.05, [0, 0, -1.6], '#b8a58c');
  st.addBlock([0.72, 0.16, 0.72], [0, 0.08, -1.6], '#9a8670');
  st.addBlock([0.62, 0.12, 0.62], [0, 2.1, -1.6], '#9a8670');
  // 灯晶（最初は消えている）
  const lantern = new THREE.Group();
  lantern.name = '灯台柱';
  lantern.position.set(0, 2.16, -1.6);
  lantern.visible = false;
  const crystal = await st.addProp({ image: 'crystal_small_cluster', x: 0, z: 0, height: 0.62, blob: false, billboard: 'y' });
  st.scene.remove(crystal);
  lantern.add(crystal);
  const light = new THREE.PointLight('#ffd49a', 0, 11, 1.6);
  light.position.y = 0.45;
  light.userData.on = 9;
  lantern.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffdca8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.name = 'glow';
  glow.position.y = 0.35;
  glow.scale.setScalar(0.001);
  lantern.add(glow);
  st.scene.add(lantern);
  st.named.set('灯台柱', lantern);
}

export const CASE01: CaseData = {
  id: 'case01',
  chapter: '第一話　夕凪の空港と消えた灯晶',
  title: '夕凪の空港と消えた灯晶',
  player: 'wilnas',
  cast: [
    {
      id: 'wilnas',
      name: 'ウィルナス',
      color: '#b8322a',
      height: 1.36,
      defaultExpression: '通常',
      expressions: { 通常: 'wilnas_01_normal', 驚き: 'wilnas_02_surprised', 指差し: 'wilnas_03_pointing_left', 困惑: 'wilnas_04_confused', 笑い: 'wilnas_05_hand_on_hip_laugh' },
    },
    {
      id: 'wamdus',
      name: 'ワムデュス',
      color: '#3b4fa0',
      height: 1.3,
      defaultExpression: '通常',
      expressions: { 通常: 'wamdus_01_normal', 驚き: 'wamdus_02_surprised', 怒り: 'wamdus_03_pouting_angry', 得意: 'wamdus_04_proud' },
    },
    {
      id: 'galleon',
      name: 'ガレヲン',
      color: '#7a5230',
      height: 1.42,
      defaultExpression: '通常',
      expressions: { 通常: 'galleon_01_normal', よそ見: 'galleon_03_looking_away' },
    },
    {
      id: 'fediel',
      name: 'フェディエル',
      color: '#2f7f7a',
      height: 1.4,
      defaultExpression: '通常',
      expressions: { 通常: 'fediel_01_normal', 笑み: 'fediel_02_cover_mouth_smile', 挑発: 'fediel_03_taunting', 驚き: 'fediel_04_surprised' },
    },
    {
      id: 'luwoh',
      name: 'ルオー',
      color: '#a07a18',
      height: 1.42,
      defaultExpression: '通常',
      expressions: { 通常: 'luwoh_01_normal', 構え: 'luwoh_02_light_guard_pose', 驚き: 'luwoh_03_surprised', 説明: 'luwoh_04_pointing_explaining', 考え: 'luwoh_05_thinking' },
    },
  ],
  placement: [
    { id: 'wilnas', x: -4.6, z: 0.6, facing: 1 },
    { id: 'galleon', x: -6.7, z: -1.65, facing: 1 },
    { id: 'luwoh', x: -1.7, z: -1.3, facing: -1 },
    { id: 'fediel', x: 3.7, z: -1.9, facing: -1 },
    { id: 'wamdus', x: 9.3, z: -1.7, facing: 1 },
  ],
  evidence: [
    { id: 'footprints', name: '濡れた足跡', desc: '灯台柱の根元の水たまりから、桟橋の先へ点々と続く小さな足跡。\nまだ乾いていない。', image: 'props/puddle.webp' },
    { id: 'ribbon', name: '青いリボンの切れ端', desc: '係留ロープのささくれに引っかかっていた、青い布の切れ端。\n金の縁取りがある。', image: 'props/banner_small_blue.webp' },
  ],
  clues: [
    { id: 'nap', name: 'ガレヲンの休息', desc: 'ガレヲンは昼から積荷のそばで目を閉じ、風の声を聴いていた（本人談）。\n灯台の前ではない。' },
    { id: 'bell', name: '消えた時刻', desc: '灯晶が消えたのは、夕方の鐘が鳴ってすぐ。ルオーは鐘楼にいた。' },
    { id: 'lastship', name: '最終便', desc: '最終便は日没に着く。それまでに灯晶を戻さなければならない。' },
  ],
  scene: {
    floor: { image: 'stage/wood.webp', width: 44, depth: 10, z: 0.45, repeat: [11, 2.5], color: '#e6d6c8' },
    backdrop: { image: 'stage/cloudsea.webp', width: 150, height: 62, z: -46, y: 2 },
    walk: { minX: -10.4, maxX: 10.4, minZ: -2.25, maxZ: 2.5 },
    cameraBounds: { minX: -7.5, maxX: 7.5 },
    obstacles: [
      { x: 0, z: -1.6, r: 0.42 },
      { x: -3.6, z: -2.45, r: 0.2 },
      { x: -7.9, z: -2.2, r: 0.55 },
      { x: 6.6, z: -2.2, r: 0.55 },
      { x: 10.2, z: -2.3, r: 0.4 },
    ],
    set: buildSet,
    props: [
      // 左端の木立（島のはし）
      { image: 'tree_medium_A', x: -10.9, z: -2.5, height: 3.4, cross: true, castShadow: true, sway: 0.015 },
      { image: 'bush_large_A', x: -9.5, z: -2.7, height: 1.2, sway: 0.02 },
      { image: 'grass_tall_A', x: -9.1, z: -0.9, height: 0.7, sway: 0.05, blob: 0.5 },
      { image: 'flower_bush_A', x: -10.3, z: 1.4, height: 0.6, sway: 0.03 },
      { image: 'small_rock_group', x: -8.7, z: 2.3, height: 0.35 },
      // ガレヲンの積荷
      { image: 'small_box_goods', x: -8.0, z: -2.35, height: 0.75, castShadow: true },
      { image: 'sack_small', x: -7.35, z: -2.55, height: 0.6, castShadow: true },
      { image: 'shop_goods_bundle_A', x: -8.35, z: -1.55, height: 0.6, castShadow: true },
      // 旗と灯り
      { image: 'banner_small_red', x: -5.4, z: -2.9, height: 1.35, sway: 0.02 },
      { image: 'banner_small_blue', x: 2.2, z: -2.9, height: 1.35, sway: 0.02 },
      { image: 'lamp_small', x: -4.8, z: RAIL_Z + 0.05, y: 1.05, height: 0.5, blob: false },
      { image: 'lamp_small', x: 4.8, z: RAIL_Z + 0.05, y: 1.05, height: 0.5, blob: false },
      // 掲示板
      { image: 'sign_hanging_small', x: -3.6, z: -2.38, y: 0.72, height: 0.62, blob: false, castShadow: true, id: 'board' },
      // 灯台柱の水たまり・汚れ
      { image: 'puddle', x: 1.2, z: -0.45, height: 1.0, flat: true },
      { image: 'dirt_stain', x: -6.3, z: -0.3, height: 1.3, flat: true },
      // フェディエルの物干し
      { image: 'laundry_line_small', x: 4.7, z: -2.85, height: 1.25, sway: 0.03 },
      // 係留ロープ
      { image: 'rope_bundle_large', x: 6.85, z: -2.15, height: 0.62, castShadow: true },
      // 桟橋の先（釣り道具）
      { image: 'shop_goods_bundle_B', x: 10.3, z: -2.4, height: 0.6, castShadow: true },
      { image: 'grass_small', x: 11.2, z: -1.2, height: 0.5, sway: 0.05 },
      // 手前の前景（ぼけて奥行きを出す）
      { image: 'grass_tall_A', x: -6.2, z: 3.5, height: 1.1, sway: 0.05, occluder: true, blob: false },
      { image: 'small_box_goods', x: 2.8, z: 3.7, height: 0.95, occluder: true, blob: false },
      { image: 'flower_patch_small', x: 8.2, z: 3.35, height: 0.55, sway: 0.04, occluder: true, blob: false },
      { image: 'sack_small', x: -1.8, z: 3.9, height: 0.75, occluder: true, blob: false },
    ],
  },
  intro: S.INTRO,
  hotspots: [
    { id: 'pillar', label: '灯台柱', x: -0.35, z: -1.0, radius: 0.9, script: S.PILLAR, again: S.PILLAR_AGAIN, markHeight: 2.55 },
    { id: 'puddle', label: '水たまり', x: 1.25, z: -0.4, radius: 0.95, script: S.PUDDLE, again: S.PUDDLE_AGAIN, markHeight: 0.8 },
    { id: 'board', label: '掲示板', x: -3.6, z: -1.75, radius: 0.95, script: S.BOARD, again: S.BOARD_AGAIN, markHeight: 1.55 },
    { id: 'rope', label: '係留ロープ', x: 6.85, z: -1.45, radius: 1.0, script: S.ROPE, again: S.ROPE_AGAIN, markHeight: 1.1 },
    { id: 'galleon', label: 'ガレヲンに話しかける', actor: 'galleon', x: -6.7, z: -1.1, radius: 1.05, script: S.GALLEON, again: S.GALLEON_AGAIN },
    { id: 'luwoh', label: 'ルオーに話しかける', actor: 'luwoh', x: -1.7, z: -0.8, radius: 0.95, script: S.LUWOH, again: S.LUWOH_AGAIN },
    { id: 'fediel', label: 'フェディエルに話しかける', actor: 'fediel', x: 3.7, z: -1.35, radius: 1.05, script: S.FEDIEL, again: S.FEDIEL_AGAIN },
    {
      id: 'wamdus',
      label: 'ワムデュスに話しかける',
      actor: 'wamdus',
      x: 9.3,
      z: -1.15,
      radius: 1.1,
      script: S.WAMDUS,
      variants: [{ when: { flags: ['logic_done'] }, script: S.WAMDUS_CONFRONT }],
    },
  ],
  goals: [
    { when: { flags: ['solved'] }, text: '' },
    { when: { flags: ['logic_done'] }, text: '桟橋の先のワムデュスに話を聞く' },
    { when: { evidence: ['footprints', 'ribbon'] }, text: '「ロジック」で手がかりをつなげる' },
    { when: {}, text: '桟橋を調べて手がかりを集める' },
  ],
  readyForLogic: { when: { evidence: ['footprints', 'ribbon'] }, script: S.READY_FOR_LOGIC },
  logic: {
    title: 'ロジック',
    hint: '関係のありそうな手がかりを2つ選んで、つなげよう。',
    clues: ['footprints', 'ribbon', 'nap', 'bell', 'lastship'],
    pairs: [{ a: 'footprints', b: 'ribbon', script: S.LOGIC_HIT, flag: 'logic_done' }],
    miss: S.LOGIC_MISS,
  },
  confrontation: {
    witness: 'wamdus',
    title: 'あのとき見たこと',
    intro: S.CONFRONT_INTRO,
    talismans: 5,
    statements: [
      { text: 'ワムは夕方からずーっと、\n桟橋のはしっこで釣りをしてたので。', press: S.PRESS_1 },
      { text: '灯りが消えたとき、ガレヲンが\n灯台の前で寝てるのを見たので。', press: S.PRESS_2 },
      { text: 'それにワムは、灯台柱には\n一歩も近づいてないので。', press: S.PRESS_3, contradiction: ['ribbon', 'footprints'] },
    ],
    success: S.CONFRONT_SUCCESS,
    wrong: S.CONFRONT_WRONG,
    fail: S.CONFRONT_FAIL,
  },
  ending: S.ENDING,
};
