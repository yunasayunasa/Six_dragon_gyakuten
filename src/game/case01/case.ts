import * as THREE from 'three';
import type { Engine } from '../../engine';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { glowTexture } from '../../engine/paper/textures';
import { Crystal } from '../../engine/stage/Crystal';
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
  // 灯晶は紙ではなく立体の結晶（紙の舞台の中の「本物」）。反射用の環境マップはこれ専用に1回だけ作る
  const pmrem = new THREE.PMREMGenerator(engine.renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const crystal = new Crystal({ height: 0.62, envMap });
  lantern.add(crystal);
  engine.onFrame.add((dt) => crystal.update(dt));
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

/** 攻撃3コマ・被弾1枚（tools/prepare_poses.mjs で変換した追加素材） */
const motions = (id: string) => ({
  attack: [`${id}_attack_01_windup`, `${id}_attack_02_hit`, `${id}_attack_03_follow_through`],
  damage: `${id}_damage_01_hit`,
});

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
      motions: motions('wilnas'),
    },
    {
      id: 'wamdus',
      name: 'ワムデュス',
      color: '#3b4fa0',
      height: 1.3,
      defaultExpression: '通常',
      expressions: { 通常: 'wamdus_01_normal', 驚き: 'wamdus_02_surprised', 怒り: 'wamdus_03_pouting_angry', 得意: 'wamdus_04_proud' },
      motions: motions('wamdus'),
    },
    {
      id: 'galleon',
      name: 'ガレヲン',
      color: '#7a5230',
      height: 1.42,
      defaultExpression: '通常',
      expressions: {
        通常: 'galleon_01_normal',
        よそ見: 'galleon_03_looking_away',
        微笑み: 'galleon_07_hand_on_cheek_smile',
        投げキッス: 'galleon_04_blow_kiss',
        キッス: 'galleon_05_kiss_hand_to_mouth',
        キッス投げ: 'galleon_06_kiss_mid_throw',
      },
      motions: motions('galleon'),
    },
    {
      id: 'fediel',
      name: 'フェディエル',
      color: '#2f7f7a',
      height: 1.4,
      defaultExpression: '通常',
      expressions: { 通常: 'fediel_01_normal', 笑み: 'fediel_02_cover_mouth_smile', 挑発: 'fediel_03_taunting', 驚き: 'fediel_04_surprised' },
      motions: motions('fediel'),
    },
    {
      id: 'luwoh',
      name: 'ルオー',
      color: '#a07a18',
      height: 1.42,
      artFacing: -1,
      defaultExpression: '通常',
      expressions: { 通常: 'luwoh_01_normal', 構え: 'luwoh_02_light_guard_pose', 驚き: 'luwoh_03_surprised', 説明: 'luwoh_04_pointing_explaining', 考え: 'luwoh_05_thinking' },
      motions: motions('luwoh'),
    },
  ],
  placement: [
    { id: 'wilnas', x: -4.6, z: 0.6, facing: 1 },
    { id: 'galleon', x: -6.7, z: -1.65, facing: 1 },
    { id: 'luwoh', x: -1.7, z: -1.3, facing: -1 },
    { id: 'fediel', x: 3.7, z: -1.9, facing: -1 },
    { id: 'wamdus', x: 9.3, z: -1.7, facing: 1 },
  ],
  // 画像は仮（話が固まったら専用の証拠品画像に差し替える）
  evidence: [
    { id: 'footprints', name: '濡れた足跡', desc: '灯台柱の根元の水たまりから、桟橋の先へ点々と続く小さな足跡。\nまだ乾いていない。', image: 'props/puddle.webp' },
    { id: 'ribbon', name: '青いリボンの切れ端', desc: '係留ロープのささくれに引っかかっていた、青い布の切れ端。\n金の縁取りがある。', image: 'props/banner_small_blue.webp' },
    { id: 'plate', name: '空っぽの皿', desc: 'フェディエルの台の上に残っていた皿。\n雲蜜だんごが載っていた。蜜の跡だけが残り、食べこぼしは無い。', image: 'props/food_bundle_shop.webp' },
    { id: 'wrapper', name: '包み紙の切れ端', desc: 'ガレヲンの積荷のそばに落ちていた、だんごの包み紙の切れ端。\nべたべたした蜜が付いている。', image: 'props/sack_small.webp' },
    { id: 'honey_puddle', name: '甘い水たまり', desc: '灯台柱の根元の水たまり。ほんのり甘い匂いがして、触るとべたつく。\n蜜が溶けている。', image: 'props/puddle.webp' },
  ],
  clues: [
    { id: 'nap', name: 'ガレヲンの居場所', desc: 'ガレヲンは昼から積荷のそばで目を閉じ、風の声を聴いていた（本人談）。\n灯台の前ではない。' },
    { id: 'bell', name: '灯晶が消えた時刻', desc: '灯晶が消えたのは、夕方の鐘が鳴ってすぐ。ルオーは鐘楼にいた。' },
    { id: 'lastship', name: '最終便', desc: '最終便は日没に着く。それまでに灯晶を戻さなければならない。' },
    { id: 'fediel_saw', name: 'フェディエルの目撃', desc: '鐘が鳴ったころ、水の子が桟橋の先から駆けてくるのを、\n物干しのそばからじっくり眺めていた（本人談）。' },
    { id: 'scent', name: '甘い香り', desc: '鐘が鳴ったころ、ガレヲンの前を甘い香りが通り過ぎ、\n桟橋の先へ遠ざかっていった（ガレヲン談）。' },
    { id: 'skyfish', name: '空魚の言い伝え', desc: '夕焼けの空魚は、光と甘い匂いに寄ってくる。\n昔の釣り人は、灯りと蜜で誘ったという（ルオー談）。' },
    { id: 'snack_time', name: 'だんごが消えた時刻', desc: 'フェディエルが目を離したのは鐘が鳴ったころ。\nだんごが消えたのも、灯晶と同じ鐘の時刻。' },
    { id: 'carried', name: '持ち去られただんご', desc: '皿は台の上、包み紙は積荷のそば。\nだんごは包みごと持ち去られた。その場で食べたのではない。' },
    { id: 'same_culprit', name: '同じ犯人', desc: '灯台柱の水たまりの蜜と、包み紙の蜜は同じもの。\n灯晶を持ち去った者は、だんごも持っていた。' },
    { id: 'fishing', name: '空魚釣り', desc: '光（灯晶）と甘い匂い（だんご）。\n犯人の狙いは、空魚を釣ること。' },
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
      { x: 5.5, z: -2.35, r: 0.35 },
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
      // フェディエルの台（だんごの皿が載っていた）
      { image: 'food_bundle_shop', x: 5.5, z: -2.35, height: 0.7, castShadow: true },
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
    {
      id: 'puddle',
      label: '水たまり',
      x: 1.25,
      z: -0.4,
      radius: 0.95,
      script: S.PUDDLE,
      again: S.PUDDLE_AGAIN,
      markHeight: 0.8,
      variants: [
        { when: { evidence: ['honey_puddle'] }, script: S.PUDDLE_HONEY_AGAIN },
        { when: { flags: ['c2_done'], evidence: ['footprints'] }, script: S.PUDDLE_HONEY },
      ],
    },
    { id: 'board', label: '掲示板', x: -3.6, z: -1.75, radius: 0.95, script: S.BOARD, again: S.BOARD_AGAIN, markHeight: 1.55 },
    { id: 'rope', label: '係留ロープ', x: 6.85, z: -1.45, radius: 1.0, script: S.ROPE, again: S.ROPE_AGAIN, markHeight: 1.1 },
    { id: 'table', label: 'フェディエルの台', x: 5.5, z: -1.75, radius: 0.85, script: S.TABLE, again: S.TABLE_AGAIN, markHeight: 1.2 },
    { id: 'cargo', label: 'ガレヲンの積荷', x: -8.2, z: -1.3, radius: 0.8, script: S.CARGO, again: S.CARGO_AGAIN, markHeight: 1.2 },
    {
      id: 'galleon',
      label: 'ガレヲンに話しかける',
      actor: 'galleon',
      x: -6.7,
      z: -1.1,
      radius: 1.05,
      script: S.GALLEON,
      again: S.GALLEON_AGAIN,
      variants: [
        { when: { evidence: ['scent'] }, script: S.GALLEON_2_AGAIN },
        { when: { flags: ['c1_done'] }, script: S.GALLEON_2 },
      ],
    },
    {
      id: 'luwoh',
      label: 'ルオーに話しかける',
      actor: 'luwoh',
      x: -1.7,
      z: -0.8,
      radius: 0.95,
      script: S.LUWOH,
      again: S.LUWOH_AGAIN,
      variants: [
        { when: { evidence: ['skyfish'] }, script: S.LUWOH_2_AGAIN },
        { when: { flags: ['l2'] }, script: S.LUWOH_2 },
      ],
    },
    {
      id: 'fediel',
      label: 'フェディエルに話しかける',
      actor: 'fediel',
      x: 3.7,
      z: -1.35,
      radius: 1.05,
      script: S.FEDIEL,
      again: S.FEDIEL_AGAIN,
      variants: [
        { when: { flags: ['c2_done'] }, script: S.FEDIEL_2_AGAIN },
        { when: { flags: ['l1'], evidence: ['fediel_saw'] }, script: S.FEDIEL_CONFRONT },
      ],
    },
    {
      id: 'wamdus',
      label: 'ワムデュスに話しかける',
      actor: 'wamdus',
      x: 9.3,
      z: -1.15,
      radius: 1.1,
      script: S.WAMDUS,
      variants: [
        { when: { flags: ['l3'] }, script: S.WAMDUS_CONFRONT },
        { when: { flags: ['c1_done'] }, script: S.WAMDUS_AGAIN },
        { when: { evidence: ['nap'] }, script: S.WAMDUS_GALLEON },
      ],
    },
  ],
  goals: [
    { when: { flags: ['solved'] }, text: '' },
    { when: { flags: ['l3'] }, text: '桟橋の先のワムデュスを問いただす' },
    { when: { evidence: ['skyfish'] }, text: '「まとめる」で犯人の狙いを考える' },
    { when: { flags: ['l2'] }, text: 'ルオーに話を聞く' },
    { when: { evidence: ['honey_puddle'] }, text: '「まとめる」で2つの事件をつなげる' },
    { when: { flags: ['c2_done'] }, text: '灯台柱のあたりを調べ直す' },
    { when: { flags: ['l1'] }, text: 'フェディエルを問いただす' },
    { when: { flags: ['c1_done'], evidence: ['plate', 'wrapper'] }, text: '「まとめる」でだんごの行方を考える' },
    { when: { flags: ['c1_done'] }, text: 'だんごの手がかりを探す（フェディエルの台・ガレヲンの積荷）' },
    { when: { evidence: ['nap'] }, text: 'ワムデュスにガレヲンのことを聞き直す' },
    { when: {}, text: '桟橋を調べて、皆の話を聞く' },
  ],
  talismans: 5,
  logic: {
    title: 'まとめる',
    hint: '関係のありそうな証拠品・手がかりを2つ選んで、つなげよう。',
    pairs: [
      { a: 'plate', b: 'wrapper', script: S.LOGIC_1, flag: 'l1' },
      { a: 'honey_puddle', b: 'wrapper', script: S.LOGIC_2, flag: 'l2' },
      { a: 'same_culprit', b: 'skyfish', script: S.LOGIC_3, flag: 'l3' },
    ],
    miss: S.LOGIC_MISS,
    done: S.LOGIC_DONE,
  },
  confrontations: {
    wamdus_galleon: {
      witness: 'wamdus',
      title: 'ガレヲンを見た',
      intro: S.C1_INTRO,
      statements: [
        { text: '灯りが消えたとき、ワムは\n桟橋のはしっこで釣りをしてたので。', press: S.C1_PRESS_1 },
        { text: 'そこから、ガレヲンが\n灯台の前で寝てるのが見えたので。', press: S.C1_PRESS_2, contradiction: ['nap'] },
        { text: '寝てる人のそばで灯りが消えたら、\nその人があやしいので。', press: S.C1_PRESS_3 },
      ],
      success: S.C1_SUCCESS,
      wrong: S.C1_WRONG,
      fail: S.C1_FAIL,
    },
    fediel: {
      witness: 'fediel',
      title: 'だんごの見張り',
      intro: S.C2_INTRO,
      statements: [
        { text: '雲蜜だんごは、\nこの台の上の皿に置いておいたのじゃ。', press: S.C2_PRESS_1 },
        { text: '妾は片時も、\nだんごから目を離さなかったぞえ。', press: S.C2_PRESS_2, contradiction: ['fediel_saw'] },
        { text: 'なのに気づけば皿は空。\nこれは妖術に違いないのう。', press: S.C2_PRESS_3 },
      ],
      success: S.C2_SUCCESS,
      wrong: S.C2_WRONG,
      fail: S.C2_FAIL,
    },
    wamdus_crystal: {
      witness: 'wamdus',
      title: 'あのとき見たこと',
      intro: S.C3_INTRO,
      statements: [
        { text: 'ワムは夕方からずーっと、\n桟橋のはしっこで釣りをしてたので。', press: S.C3_PRESS_1 },
        { text: '灯りが消えて暗くなったから、\nワムは桟橋の先でじっとしてたので。', press: S.C3_PRESS_2 },
        { text: 'それにワムは、灯台柱には\n一歩も近づいてないので。', press: S.C3_PRESS_3, contradiction: ['ribbon', 'footprints'] },
      ],
      success: S.C3_SUCCESS,
      wrong: S.C3_WRONG,
      fail: S.C3_FAIL,
    },
    wamdus_snack: {
      witness: 'wamdus',
      title: 'だんごは知らない',
      intro: S.C4_INTRO,
      statements: [
        { text: 'ワム、甘いものは\nそんなに好きじゃないので。', press: S.C4_PRESS_1, reveals: 3 },
        { text: 'フェディエルのだんごなんて、\n見たこともないので。', press: S.C4_PRESS_2 },
        { text: '空魚は光だけで寄ってくるので。\n餌なんていらないので。', press: S.C4_PRESS_3, contradiction: ['skyfish', 'fishing'] },
        { text: 'だから、ワムから甘い匂いなんて、\nするわけないので。', press: S.C4_PRESS_4, contradiction: ['scent', 'honey_puddle', 'same_culprit'], hidden: true },
      ],
      success: S.C4_SUCCESS,
      wrong: S.C4_WRONG,
      fail: S.C4_FAIL,
    },
  },
  ending: S.ENDING,
};
