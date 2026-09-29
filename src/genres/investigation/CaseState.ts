import type { CaseData, Condition } from './types';

/** 事件の進み具合（持っている証拠・記録・手がかり）。表示や演出は持たない。 */
export class CaseState {
  readonly evidence: string[] = [];
  readonly clues: string[] = [];
  readonly flags = new Set<string>();
  readonly seen = new Set<string>();

  constructor(readonly data: CaseData) {}

  give(id: string): boolean {
    if (this.data.evidence.some((e) => e.id === id)) {
      if (this.evidence.includes(id)) return false;
      this.evidence.push(id);
      return true;
    }
    if (this.data.clues.some((c) => c.id === id)) {
      if (this.clues.includes(id)) return false;
      this.clues.push(id);
      return true;
    }
    throw new Error(`証拠・手がかりがありません: ${id}`);
  }

  check(c: Condition): boolean {
    return (
      (c.evidence ?? []).every((e) => this.evidence.includes(e) || this.clues.includes(e)) &&
      (c.flags ?? []).every((f) => this.flags.has(f)) &&
      (c.notFlags ?? []).every((f) => !this.flags.has(f))
    );
  }

  goal(): string | null {
    return this.data.goals.find((g) => this.check(g.when))?.text ?? null;
  }
}

/** ロジック：2つの手がかりを選んだ結果 */
export function evaluateLogic(data: CaseData, a: string, b: string) {
  return data.logic.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)) ?? null;
}

export type PresentResult = 'correct' | 'wrong';

/** 対決の状態。証言の切り替え・証拠をぶつけた結果・信頼（ライフ）を管理する */
export class Confrontation {
  index = 0;
  talismans: number;
  readonly pressed = new Set<number>();

  constructor(readonly def: CaseData['confrontation']) {
    this.talismans = def.talismans;
  }

  get statement() {
    return this.def.statements[this.index];
  }

  next(): void {
    this.index = (this.index + 1) % this.def.statements.length;
  }

  prev(): void {
    this.index = (this.index - 1 + this.def.statements.length) % this.def.statements.length;
  }

  present(evidenceId: string): PresentResult {
    if (this.statement.contradiction?.includes(evidenceId)) return 'correct';
    this.talismans = Math.max(0, this.talismans - 1);
    return 'wrong';
  }

  get lost(): boolean {
    return this.talismans <= 0;
  }

  reset(): void {
    this.index = 0;
    this.talismans = this.def.talismans;
    this.pressed.clear();
  }
}
