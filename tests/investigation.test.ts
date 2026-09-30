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
    expect(s.goal()).toBe('桟橋を調べて、皆の話を聞く');
    s.give('nap');
    expect(s.goal()).toContain('ワムデュス');
    s.flags.add('c1_done');
    s.give('plate');
    s.give('wrapper');
    expect(s.goal()).toContain('まとめる');
  });
  it('まとめるは順番に関係なく正解の組を判定する', () => {
    expect(evaluateLogic(CASE01, 'wrapper', 'plate')?.flag).toBe('l1');
    expect(evaluateLogic(CASE01, 'skyfish', 'same_culprit')?.flag).toBe('l3');
    expect(evaluateLogic(CASE01, 'nap', 'bell')).toBeNull();
  });
});

describe('尋問', () => {
  const def = CASE01.confrontations.wamdus_crystal;
  it('矛盾する証言に正しい証拠なら正解、違えば信頼が減る', () => {
    const c = new Confrontation(def, 5, 5);
    expect(c.present('ribbon')).toBe('wrong');
    expect(c.talismans).toBe(4);
    c.next();
    c.next();
    expect(c.present('ribbon')).toBe('correct');
    expect(c.talismans).toBe(4);
  });
  it('信頼は前の尋問の残りから始まり、尽きたら最大まで戻して最初から', () => {
    const c = new Confrontation(def, 2, 5);
    c.prev();
    expect(c.index).toBe(2);
    c.index = 0;
    c.present('footprints');
    c.present('footprints');
    expect(c.lost).toBe(true);
    c.reset();
    expect(c.talismans).toBe(5);
    expect(c.index).toBe(0);
  });
  it('揺さぶると隠れた証言が出てくる', () => {
    const c = new Confrontation(CASE01.confrontations.wamdus_snack, 5, 5);
    expect(c.visible).toEqual([0, 1, 2]);
    c.index = 1;
    expect(c.press()).toBeNull();
    c.index = 0;
    expect(c.press()).toBe(3);
    expect(c.visible).toEqual([0, 1, 2, 3]);
    expect(c.press()).toBeNull();
    c.index = c.visible.indexOf(3);
    expect(c.present('scent')).toBe('correct');
    c.reset();
    expect(c.visible).toEqual([0, 1, 2]);
  });
});
