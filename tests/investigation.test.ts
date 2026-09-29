import { describe, expect, it } from 'vitest';
import { CaseState, Confrontation, evaluateLogic } from '../src/genres/investigation/CaseState';
import { CASE01 } from '../src/game/case01/case';

describe('事件の進行状態', () => {
  it('証拠と手がかりを区別して受け取り、二重には増えない', () => {
    const s = new CaseState(CASE01);
    expect(s.give('footprints')).toBe(true);
    expect(s.give('footprints')).toBe(false);
    expect(s.give('nap')).toBe(true);
    expect(s.evidence).toEqual(['footprints']);
    expect(s.clues).toEqual(['nap']);
    expect(() => s.give('unknown')).toThrow();
  });
  it('目的表示が進行に合わせて変わる', () => {
    const s = new CaseState(CASE01);
    expect(s.goal()).toBe('桟橋を調べて手がかりを集める');
    s.give('footprints');
    s.give('ribbon');
    expect(s.goal()).toContain('ロジック');
    s.flags.add('logic_done');
    expect(s.goal()).toContain('ワムデュス');
  });
  it('ロジックは順番に関係なく正解の組を判定する', () => {
    expect(evaluateLogic(CASE01, 'ribbon', 'footprints')?.flag).toBe('logic_done');
    expect(evaluateLogic(CASE01, 'nap', 'bell')).toBeNull();
  });
});

describe('対決', () => {
  it('矛盾する証言に正しい証拠なら正解、違えば信頼が減る', () => {
    const c = new Confrontation(CASE01.confrontation);
    expect(c.present('ribbon')).toBe('wrong');
    expect(c.talismans).toBe(4);
    c.next();
    c.next();
    expect(c.present('ribbon')).toBe('correct');
    expect(c.talismans).toBe(4);
  });
  it('証言は前後に循環し、信頼が尽きたら最初から', () => {
    const c = new Confrontation(CASE01.confrontation);
    c.prev();
    expect(c.index).toBe(2);
    for (let i = 0; i < 5; i++) {
      c.index = 0;
      c.present('footprints');
    }
    expect(c.lost).toBe(true);
    c.reset();
    expect(c.talismans).toBe(5);
    expect(c.index).toBe(0);
  });
});
