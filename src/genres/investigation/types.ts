import type { ActorDef, Engine, PropDef } from '../../engine';

/** 逆転検事風「捜査→ロジック→対決」の事件データ。ゲームごとにこれを書けば遊べる。 */
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
  /** この証言にぶつけると正解になる証拠 */
  contradiction?: string[];
}

export interface ConfrontationDef {
  witness: string;
  title: string;
  intro: string;
  statements: StatementDef[];
  success: string;
  wrong: string;
  fail: string;
  talismans: number;
}

export interface LogicDef {
  title: string;
  hint: string;
  clues: string[];
  pairs: Array<{ a: string; b: string; script: string; flag: string }>;
  miss: string;
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
  /** 証拠がそろったら流れる台本（その後ロジックへ） */
  readyForLogic: { when: Condition; script: string };
  logic: LogicDef;
  confrontation: ConfrontationDef;
  ending: string;
}
