import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import { Ease } from '../core/tween';
import type { PaperActor } from '../paper/PaperActor';
import { CameraRig } from '../stage/CameraRig';
import type { SE } from '../audio/Sound';
import type { Director } from './Director';

/** 効果音の日本語名 */
const SE_NAMES: Record<string, SE> = {
  決定: 'confirm',
  選択: 'select',
  取消: 'cancel',
  入手: 'item',
  叫び: 'shout',
  失敗: 'wrong',
  紙: 'paper',
  発見: 'reveal',
  足音: 'step',
};

export interface StageCommandContext {
  engine: Engine;
  /** 台本に書かれた名前（表示名またはID）から役者を探す */
  actor(name: string): PaperActor | null;
  /** 探索中に戻すカメラ */
  resetCamera(): void;
  /** 話者へ自動でカメラを寄せるか */
  setAutoCamera?(on: boolean): void;
}

/** 役者を画面に収める構図 */
/** 下に会話ウィンドウが出るので、人物は画面のやや上寄りに収める */
export function actorShot(rig: CameraRig, a: PaperActor, zoom = 1): void {
  const look = a.position.clone().add(new THREE.Vector3(0, a.def.height * 0.36, 0));
  rig.shot(look, new THREE.Vector3(0.35 * a.facing, 0.75, 5.0 / zoom), 30);
}

/** 2人を同時に収める構図 */
export function twoShot(rig: CameraRig, a: PaperActor, b: PaperActor): void {
  const look = a.position.clone().lerp(b.position, 0.5).add(new THREE.Vector3(0, 0.45, 0));
  const dist = Math.max(5.6, a.position.distanceTo(b.position) * 1.35 + 3.4);
  rig.shot(look, new THREE.Vector3(0, 1.0, dist), 30);
}

/**
 * どのジャンルでも使える演出命令を登録する。
 * カメラ・表情・跳ねる・攻撃/被弾・向き・移動・登場/退場・効果音・揺れ・叫び・待つ・見た目・きらめき・暗転・字幕・たたむ/組み立て
 */
export function registerStageCommands(d: Director, ctx: StageCommandContext): void {
  const { engine } = ctx;
  const need = (name: string): PaperActor => {
    const a = ctx.actor(name);
    if (!a) throw new Error(`役者が見つかりません: ${name}`);
    return a;
  };

  d.register('cam', (args) => {
    const [target, second] = args;
    if (!target || target === '戻す' || target === 'reset') {
      ctx.setAutoCamera?.(true);
      return ctx.resetCamera();
    }
    if (target === '固定' || target === 'lock') return ctx.setAutoCamera?.(false);
    if (target === '自動' || target === 'auto') return ctx.setAutoCamera?.(true);
    // @カメラ 周回 灯台柱 6 … 対象を中心に6秒かけて1周する
    if (target === '周回' || target === 'orbit') {
      const a = ctx.actor(second);
      const obj = a ?? engine.stage.named.get(second);
      if (!obj) throw new Error(`カメラの対象が見つかりません: ${second}`);
      const p = a ? a.headPosition() : obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
      return engine.rig.orbit(p, 3.6, 0.55, Number(args[2] ?? 6));
    }
    if (target === '引き' || target === 'wide') {
      const x = engine.rig.look.x;
      engine.rig.shot(new THREE.Vector3(x, 1.3, 0), new THREE.Vector3(0, 2.8, 12), 32);
      return;
    }
    const a = ctx.actor(target);
    if (!a) {
      // 役者でなければ舞台の名前付きの物を映す
      const obj = engine.stage.named.get(target);
      if (!obj) throw new Error(`カメラの対象が見つかりません: ${target}`);
      const p = obj.getWorldPosition(new THREE.Vector3());
      engine.rig.shot(p, new THREE.Vector3(0, 0.6, 6), 30);
      return;
    }
    if (second) twoShot(engine.rig, a, need(second));
    else actorShot(engine.rig, a);
  });
  d.register('face', (args) => {
    const a = need(args[0]);
    a.setExpression(args[1] ?? a.def.defaultExpression, false, engine.tweens);
  });
  d.register('hop', (args) => need(args[0]).hop(engine.tweens));
  // 強く出る（攻撃3コマ）／論破される（被弾）
  d.register('attack', (args) => need(args[0]).attack(engine.tweens));
  d.register('damage', (args) => {
    engine.rig.shake(0.3, 0.35);
    return need(args[0]).damage(engine.tweens);
  });
  d.register('turn', async (args) => {
    const a = need(args[0]);
    const dir = args[1];
    if (dir === '右' || dir === 'right') return a.face(1, engine.tweens);
    if (dir === '左' || dir === 'left') return a.face(-1, engine.tweens);
    const b = ctx.actor(dir);
    if (b) return a.face(b.position.x >= a.position.x ? 1 : -1, engine.tweens);
  });
  d.register('move', async (args) => {
    const a = need(args[0]);
    const x = Number(args[1]);
    const z = args[2] !== undefined ? Number(args[2]) : a.position.z;
    const from = a.position.clone();
    const to = new THREE.Vector3(x, 0, z);
    const dist = from.distanceTo(to);
    if (dist < 0.01) return;
    void a.face(to.x >= from.x ? 1 : -1, engine.tweens);
    a.setWalking(1);
    await engine.tweens.run(dist / 2.6, (k) => a.position.lerpVectors(from, to, k), Ease.linear, a.position);
    a.setWalking(0);
  });
  d.register('pop', async (args) => {
    engine.sound.play('paper');
    await need(args[0]).popIn(engine.tweens);
  });
  d.register('hide', async (args) => {
    engine.sound.play('paper');
    await need(args[0]).popOut(engine.tweens);
  });
  d.register('se', (args) => engine.sound.play(SE_NAMES[args[0]] ?? (args[0] as SE)));
  d.register('shake', (args) => engine.rig.shake(Number(args[0] ?? 0.25), Number(args[1] ?? 0.4)));
  d.register('shout', async (args) => {
    engine.hud.hideDialogue();
    engine.rig.shake(0.35, 0.5);
    await engine.hud.shout(args.join(' '));
  });
  d.register('wait', (args) => engine.tweens.wait(Number(args[0] ?? 0.5)));
  d.register('look', (args) => engine.stage.setLook(args[0], Number(args[1] ?? 1.2)));
  d.register('sparkle', (args) => {
    const a = args[0] ? ctx.actor(args[0]) : null;
    const at = a ? a.headPosition() : engine.rig.look.clone();
    engine.stage.burst.fire(at);
    engine.sound.play('reveal');
  });
  d.register('fade', (args) => engine.hud.fade(args[0] === '明け' || args[0] === 'in' ? 0 : 1, Number(args[1] ?? 0.5)));
  // 区切りは ｜ （例: @字幕 第一話｜題名｜ひとこと）
  d.register('card', (args) => {
    const [title = '', sub = '', hint = ''] = args.join(' ').split(/[|｜]/);
    return engine.hud.card(title, sub, hint);
  });
  // 開幕の組み立て演出（@たたむ で倒し、@組み立て で左から順に起こす）
  d.register('flatten', () => engine.stage.flattenAll());
  d.register('assemble', () => engine.stage.assemble((i) => i % 5 === 0 && engine.sound.play('paper')));
}
