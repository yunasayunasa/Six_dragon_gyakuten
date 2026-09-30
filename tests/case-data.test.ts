import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Director } from '../src/engine/script/Director';
import { parseScript } from '../src/engine/script/parser';
import { registerStageCommands } from '../src/engine/script/stageCommands';
import { INVESTIGATION_COMMANDS } from '../src/genres/investigation/InvestigationGame';
import { CaseState } from '../src/genres/investigation/CaseState';
import { CASE01 } from '../src/game/case01/case';
import type { Engine } from '../src/engine';

/** 事件データの書き間違い（知らない命令・いない役者・無い表情・無い証拠）と、最後まで遊べるかを実行前に確かめる */
const data = CASE01;
const manifest = JSON.parse(readFileSync('public/assets/cast/manifest.json', 'utf-8')) as Record<string, unknown>;

function allScripts(): Array<[string, string]> {
  const list: Array<[string, string]> = [
    ['intro', data.intro],
    ['logic.miss', data.logic.miss],
    ['logic.done', data.logic.done],
    ['ending', data.ending],
  ];
  data.logic.pairs.forEach((p, i) => list.push([`logic.${i}`, p.script]));
  for (const [id, c] of Object.entries(data.confrontations)) {
    list.push([`${id}.intro`, c.intro], [`${id}.success`, c.success], [`${id}.wrong`, c.wrong], [`${id}.fail`, c.fail]);
    c.statements.forEach((s, i) => list.push([`${id}.press.${i}`, s.press]));
    c.hints?.forEach((h, i) => list.push([`${id}.hint.${i}`, h]));
  }
  for (const h of data.hotspots) {
    list.push([`hs.${h.id}`, h.script]);
    if (h.again) list.push([`hs.${h.id}.again`, h.again]);
    h.variants?.forEach((v, i) => list.push([`hs.${h.id}.v${i}`, v.script]));
  }
  return list;
}

const names = new Map(data.cast.map((c) => [c.name, c]));
const ids = new Map(data.cast.map((c) => [c.id, c]));
const actorOf = (n: string) => names.get(n) ?? ids.get(n);
const namedObjects = ['灯台柱'];
const itemIds = new Set([...data.evidence.map((e) => e.id), ...data.clues.map((c) => c.id)]);

describe('第一話のデータ検査', () => {
  const d = new Director({ say: async () => {} });
  registerStageCommands(d, { engine: {} as Engine, actor: () => null, resetCamera: () => {} });
  INVESTIGATION_COMMANDS.forEach((c) => d.register(c, () => {}));

  it('すべての立ち絵・動きのコマがマニフェストにある', () => {
    for (const c of data.cast) {
      const poses = [...Object.values(c.expressions), ...(c.motions?.attack ?? []), ...(c.motions?.damage ? [c.motions.damage] : [])];
      for (const pose of poses) expect(manifest[pose], pose).toBeTruthy();
    }
  });

  for (const [key, src] of allScripts()) {
    it(`台本「${key}」の命令・役者・表情・証拠が正しい`, () => {
      expect(d.unknownCommands(src)).toEqual([]);
      for (const c of parseScript(src)) {
        if (c.op === 'say') {
          if (c.speaker) {
            const a = actorOf(c.speaker);
            expect(a, `${key} ${c.line}行目 話者 ${c.speaker}`).toBeTruthy();
            if (c.expr) expect(Object.keys(a!.expressions), `${key} ${c.line}行目 表情 ${c.expr}`).toContain(c.expr);
          }
          continue;
        }
        if (['face', 'hop', 'pop', 'hide', 'move', 'attack', 'damage'].includes(c.name)) {
          const a = actorOf(c.args[0]);
          expect(a, `${key} ${c.line}行目 役者 ${c.args[0]}`).toBeTruthy();
          if (c.name === 'face' && c.args[1]) expect(Object.keys(a!.expressions)).toContain(c.args[1]);
        }
        if (c.name === 'cam' && c.args[0] && !['戻す', '引き', '固定', '自動'].includes(c.args[0])) {
          // @カメラ 周回 対象 秒 は2番目が対象
          const target = c.args[0] === '周回' ? c.args[1] : c.args[0];
          expect(actorOf(target) || namedObjects.includes(target), `${key} カメラ対象 ${target}`).toBeTruthy();
        }
        if (c.name === 'give') c.args.forEach((id) => expect(itemIds.has(id), `${key} 証拠 ${id}`).toBe(true));
        if (c.name === 'confront') expect(data.confrontations[c.args[0]], `${key} 尋問 ${c.args[0]}`).toBeTruthy();
        if (c.name === 'look') expect(['sunset', 'confront', 'dusk']).toContain(c.args[0]);
      }
    });
  }

  it('調べる場所の相手・尋問の証人・矛盾の証拠・揺さぶりの行き先が存在する', () => {
    for (const h of data.hotspots) if (h.actor) expect(ids.has(h.actor)).toBe(true);
    for (const [id, c] of Object.entries(data.confrontations)) {
      expect(ids.has(c.witness), id).toBe(true);
      const contradictions = c.statements.flatMap((s) => s.contradiction ?? []);
      expect(contradictions.length, id).toBeGreaterThan(0);
      contradictions.forEach((e) => expect(itemIds.has(e), `${id} 矛盾 ${e}`).toBe(true));
      c.statements.forEach((s, i) => {
        if (s.reveals !== undefined) expect(c.statements[s.reveals]?.hidden, `${id} 揺さぶり ${i}`).toBe(true);
        // 隠れた証言は、どこかを揺さぶれば出てくること
        if (s.hidden) expect(c.statements.some((o) => o.reveals === i), `${id} 隠れた証言 ${i}`).toBe(true);
      });
    }
    for (const p of data.logic.pairs) expect(itemIds.has(p.a) && itemIds.has(p.b), `${p.a}+${p.b}`).toBe(true);
  });

  it('最初から最後まで遊べる（調べる・話す・まとめる・尋問をくり返して事件解決まで届く）', () => {
    const s = new CaseState(data);
    let solved = false;
    const done = new Set<string>();
    /** 台本の効果（証拠・記録・尋問・解決）だけを実行する */
    const run = (src: string): void => {
      for (const c of parseScript(src)) {
        if (c.op !== 'cmd') continue;
        if (c.name === 'give') c.args.forEach((id) => s.give(id));
        if (c.name === 'flag') c.args.forEach((f) => s.flags.add(f));
        if (c.name === 'confront') run(data.confrontations[c.args[0]].success);
        if (c.name === 'solve') solved = true;
      }
    };
    run(data.intro);
    for (let step = 0; step < 100 && !solved; step++) {
      let progressed = false;
      const before = () => `${s.evidence.length}/${s.clues.length}/${s.flags.size}/${solved}`;
      for (const h of data.hotspots) {
        const b = before();
        const variant = h.variants?.find((v) => s.check(v.when));
        run(variant ? variant.script : s.seen.has(h.id) && h.again ? h.again : h.script);
        s.seen.add(h.id);
        if (before() !== b) progressed = true;
      }
      for (const p of data.logic.pairs) {
        if (done.has(p.flag) || !s.check({ evidence: [p.a, p.b] })) continue;
        done.add(p.flag);
        s.flags.add(p.flag);
        run(p.script);
        progressed = true;
      }
      if (!progressed) break;
    }
    expect(solved, `進めなくなった：持ち物 ${[...s.evidence, ...s.clues].join(',')} 記録 ${[...s.flags].join(',')}`).toBe(true);
    // 尋問で必要な証拠が、その尋問を始める前に手に入っているか（おおまかに：最後には全部持っている）
    for (const c of Object.values(data.confrontations)) {
      const answers = c.statements.flatMap((x) => x.contradiction ?? []);
      expect(answers.some((a) => s.check({ evidence: [a] })), c.title).toBe(true);
    }
  });
});
