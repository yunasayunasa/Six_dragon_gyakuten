import type { ActorDef, Engine, PropDef } from '../../engine';

/** 逆転検事風「捜査→まとめる→尋問」の事件データ。ゲームごとにこれを書けば遊べる。 */
export interface EvidenceDef {
  id: string;
  name: string;
  desc: string;
  /** 一覧に出す画像（public/assets からの相対） */
  image: string;
}

export interface ClueDef {
  id: string;
  name: string;
  desc: string;
}

export interface HotspotDef {
  id: string;
  /** 近づいたときに出る「調べる：○○」の○○ */
  label: string;
  x: number;
  z: number;
  radius: number;
  /** 初回の台本 */
  script: string;
  /** 2回目以降の台本（無ければ初回と同じ） */
  again?: string;
  /** 話しかける相手（いればその役者がこちらを向く） */
  actor?: string;
  /** 条件付きで差し替える台本（上から順に判定） */
  variants?: Array<{ when: Condition; script: string }>;
  /** マークを出す高さ */
  markHeight?: number;
}

/** 「証拠を持っている」「記録がある」などの条件 */
export interface Condition {
  evidence?: string[];
  flags?: string[];
  notFlags?: string[];
}

export interface StatementDef {
  text: string;
  press: string;
  /** この証言にぶつけると正解になる証拠・手がかり */
  contradiction?: string[];
  /** 最初は隠れている証言（他の証言を揺さぶると出てくる） */
  hidden?: boolean;
  /** 揺さぶると現れる証言（statements の番号） */
  reveals?: number;
}

/** 尋問1回分。台本から `@対決 <id>` で始める */
export interface ConfrontationDef {
  witness: string;
  title: string;
  intro: string;
  statements: StatementDef[];
  /** 正しい証拠をぶつけた後の台本（ここで尋問は終わる） */
  success: string;
  wrong: string;
  /** 信頼が尽きたときの台本（その後、信頼を戻して証言を最初から） */
  fail: string;
  /** 間違えたあとのヒント。1回目は hints[0]、2回目は hints[1]…（最後のものをくり返す） */
  hints?: string[];
}

/** まとめる：2つの手がかりをつなぐと新しい推理になる */
export interface LogicPairDef {
  a: string;
  b: string;
  script: string;
  /** 成立したら立つ記録（同じ組は1回だけ） */
  flag: string;
}

export interface LogicDef {
  title: string;
  hint: string;
  pairs: LogicPairDef[];
  /** つながらなかったとき */
  miss: string;
  /** もうまとめ終わった組を選んだとき */
  done: string;
}

export interface SceneDef {
  floor: { image: string; width: number; depth: number; z: number; repeat: [number, number]; color?: string };
  backdrop: { image: string; width: number; height: number; z: number; y: number };
  walk: { minX: number; maxX: number; minZ: number; maxZ: number };
  obstacles: Array<{ x: number; z: number; r: number }>;
  props: PropDef[];
  cameraBounds: { minX: number; maxX: number };
  /** 画像以外の舞台装置（柱・手すり・灯りなど）を組み立てる */
  set?: (engine: Engine) => Promise<void> | void;
}

export interface CaseData {
  id: string;
  chapter: string;
  title: string;
  cast: ActorDef[];
  player: string;
  placement: Array<{ id: string; x: number; z: number; facing: 1 | -1 }>;
  evidence: EvidenceDef[];
  clues: ClueDef[];
  scene: SceneDef;
  intro: string;
  hotspots: HotspotDef[];
  /** 目的表示（条件を満たす最初のものを表示） */
  goals: Array<{ when: Condition; text: string }>;
  /** 尋問で間違えられる回数（事件全体で共通） */
  talismans: number;
  logic: LogicDef;
  /** 尋問（id → 内容） */
  confrontations: Record<string, ConfrontationDef>;
  ending: string;
}
