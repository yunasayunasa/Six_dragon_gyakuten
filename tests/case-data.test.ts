import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Director } from '../src/engine/script/Director';
import { parseScript } from '../src/engine/script/parser';
import { registerStageCommands } from '../src/engine/script/stageCommands';
import { INVESTIGATION_COMMANDS } from '../src/genres/investigation/InvestigationGame';
import { CASE01 } from '../src/game/case01/case';
import type { Engine } from '../src/engine';

/** 事件データの書き間違い（知らない命令・いない役者・無い表情・無い証拠）を実行前に見つける */
const data = CASE01;
const manifest = JSON.parse(readFileSync('public/assets/cast/manifest.json', 'utf-8')) as Record<string, unknown>;

function allScripts(): Array<[string, string]> {
  const list: Array<[string, string]> = [
    ['intro', data.intro],
    ['ready', data.readyForLogic.script],
    ['logic.miss', data.logic.miss],
    ['ending', data.ending],
    ['c.intro', data.confrontation.intro],
    ['c.success', data.confrontation.success],
    ['c.wrong', data.confrontation.wrong],
    ['c.fail', data.confrontation.fail],
  ];
  data.logic.pairs.forEach((p, i) => list.push([`logic.${i}`, p.script]));
  data.confrontation.statements.forEach((s, i) => list.push([`press.${i}`, s.press]));
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

  it('すべての立ち絵がマニフェストにある', () => {
    for (const c of data.cast) for (const pose of Object.values(c.expressions)) expect(manifest[pose], pose).toBeTruthy();
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
        if (['face', 'hop', 'pop', 'hide', 'move'].includes(c.name)) {
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
        if (c.name === 'look') expect(['sunset', 'confront', 'dusk']).toContain(c.args[0]);
      }
    });
  }

  it('調べる場所の相手・対決の証人・証拠の矛盾先が存在する', () => {
    for (const h of data.hotspots) if (h.actor) expect(ids.has(h.actor)).toBe(true);
    expect(ids.has(data.confrontation.witness)).toBe(true);
    const contradictions = data.confrontation.statements.flatMap((s) => s.contradiction ?? []);
    expect(contradictions.length).toBeGreaterThan(0);
    contradictions.forEach((e) => expect(data.evidence.some((x) => x.id === e)).toBe(true));
  });

  it('クリアに必要な証拠がすべて手に入る', () => {
    const given = new Set(allScripts().flatMap(([, s]) => parseScript(s).filter((c) => c.op === 'cmd' && c.name === 'give').flatMap((c) => (c as { args: string[] }).args)));
    for (const id of data.readyForLogic.when.evidence ?? []) expect(given.has(id)).toBe(true);
    for (const p of data.logic.pairs) expect(given.has(p.a) && given.has(p.b)).toBe(true);
  });
});
