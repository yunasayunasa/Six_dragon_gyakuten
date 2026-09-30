import * as THREE from 'three';
import { Director, Ease, PaperActor, CameraRig, type CastManifest, type Engine, type Mode } from '../../engine';
import { registerStageCommands, actorShot, twoShot } from '../../engine/script/stageCommands';
import { tagTexture } from '../../engine/paper/textures';
import type { PoseInfo } from '../../engine/paper/PaperActor';
import type { PortraitData } from '../../engine/ui/Portrait';
import type { CardItem } from '../../engine/ui/Hud';
import { CaseState, Confrontation, evaluateLogic } from './CaseState';
import { TestimonyPanel } from './TestimonyPanel';
import type { CaseData, HotspotDef } from './types';

/** このジャンルが台本に追加する命令 */
export const INVESTIGATION_COMMANDS = ['give', 'flag', 'light', 'confront', 'solve'] as const;

type Phase = 'loading' | 'script' | 'explore' | 'done';

const WALK_SPEED = 2.9;
const PLAYER_RADIUS = 0.3;

/**
 * 逆転検事風ジャンルの実行部。
 * 捜査（歩いて調べる）・まとめる（手がかりをつなぐ／いつでも開ける）・尋問（証言に証拠をぶつける／何度でも）を行き来する。
 * 事件の中身は CaseData（データ）として外から渡す。
 */
export class InvestigationGame implements Mode {
  readonly state: CaseState;
  readonly director: Director;
  phase: Phase = 'loading';
  player!: PaperActor;
  private engine!: Engine;
  private markers = new Map<string, THREE.Sprite>();
  private near: HotspotDef | null = null;
  private autoCamera = true;
  private stepClock = 0;
  private testimony!: TestimonyPanel;
  /** 会話の立ち絵に出ている役者（ポーズが変わったら立ち絵も差し替える） */
  private portraitActors: { left: PaperActor | null; right: PaperActor | null } = { left: null, right: null };
  /** 対決中の状態（自動確認用に公開） */
  confrontation: Confrontation | null = null;
  /** 頭上の印：まだ見ていない内容がある（！・話）／今の段階では調べ済み（赤い✓） */
  private tagTex = { look: tagTexture('！'), talk: tagTexture('話', '#3a2c6b'), done: tagTexture('✓', '#b8322a') };
  /** テストや自動確認から進行を観察するためのログ */
  readonly log: string[] = [];

  constructor(readonly data: CaseData) {
    this.state = new CaseState(data);
    this.director = new Director({ say: (s, e, t) => this.say(s, e, t) });
  }

  // ---------- 準備 ----------
  async enter(engine: Engine): Promise<void> {
    this.engine = engine;
    this.registerCommands();
    await this.build();
    this.testimony = new TestimonyPanel(engine.hud.root);
    engine.hud.bookButton.classList.remove('hidden');
    engine.hud.bookButton.addEventListener('click', () => {
      if (this.phase === 'explore') void this.openBook();
    });
  }

  private async build(): Promise<void> {
    const { engine, data } = this;
    const st = engine.stage;
    const sc = data.scene;
    const manifest = await engine.assets.getJSON<CastManifest>('cast/manifest.json');
    await Promise.all([
      st.setBackdrop(sc.backdrop.image, sc.backdrop),
      st.addFloor(sc.floor.image, sc.floor),
      ...sc.props.map((p) => st.addProp(p)),
    ]);
    await sc.set?.(engine);
    const actors = await Promise.all(data.cast.map((def) => PaperActor.load(def, manifest, engine.assets)));
    for (const a of actors) {
      const pl = data.placement.find((p) => p.id === a.def.id);
      st.addActor(a, pl?.x ?? 0, pl?.z ?? 0, pl?.facing ?? 1);
    }
    this.player = st.actor(data.player);
    for (const a of actors) a.onPose = (who) => this.syncPortrait(who);
    engine.player = this.player;
    engine.rig.bounds = sc.cameraBounds;
    for (const h of data.hotspots) {
      const mat = new THREE.SpriteMaterial({ map: h.actor ? this.tagTex.talk : this.tagTex.look, depthWrite: false, transparent: true, fog: false });
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(0.42);
      const actor = h.actor ? st.actor(h.actor) : null;
      s.position.set(h.x, h.markHeight ?? (actor ? actor.def.height + 0.35 : 1.3), h.z);
      s.renderOrder = 5;
      st.scene.add(s);
      this.markers.set(h.id, s);
    }
    st.addMotes(new THREE.Box3(new THREE.Vector3(-14, 0.2, -3), new THREE.Vector3(14, 4.5, 4)));
    engine.onFrame.add((dt) => this.animateMarkers(dt));
  }

  private registerCommands(): void {
    const d = this.director;
    registerStageCommands(d, {
      engine: this.engine,
      actor: (name) => this.findActor(name),
      resetCamera: () => this.followCamera(),
      setAutoCamera: (on) => (this.autoCamera = on),
    });
    // 証拠・手がかりを渡す
    d.register('give', async (args) => {
      for (const id of args) {
        if (!this.state.give(id)) continue;
        this.log.push(`give:${id}`);
        const ev = this.data.evidence.find((e) => e.id === id);
        if (ev) {
          this.engine.hud.hideDialogue();
          this.engine.stage.burst.fire(this.player.headPosition());
          await this.engine.hud.itemGet({ ...ev, image: this.engine.assets.url(ev.image) });
        } else {
          const c = this.data.clues.find((x) => x.id === id)!;
          this.engine.sound.play('select');
          this.engine.hud.hideDialogue();
          await this.engine.hud.itemGet({ id, name: c.name, desc: c.desc, image: this.engine.assets.url('props/sign_hanging_small.webp') }, '手がかりを書き留めた');
        }
      }
      this.refreshGoal();
    });
    d.register('flag', (args) => {
      args.forEach((f) => this.state.flags.add(f));
      this.refreshGoal();
    });
    // 灯り（舞台の名前付き光源）をつける/消す
    d.register('light', async (args) => {
      const obj = this.engine.stage.named.get(args[0]);
      const on = args[1] !== '消す' && args[1] !== 'off';
      const light = obj?.getObjectByProperty('isPointLight', true) as THREE.PointLight | undefined;
      if (!obj || !light) return;
      const glow = obj.getObjectByName('glow');
      const target = on ? Number(light.userData.on ?? 6) : 0;
      const from = light.intensity;
      obj.visible = true;
      // 立体の結晶などは、点灯の瞬間に強く光る
      if (on) obj.traverse((o) => (o as { ignite?: () => void }).ignite?.());
      await this.engine.tweens.run(1.2, (k) => {
        light.intensity = from + (target - from) * k;
        if (glow) glow.scale.setScalar((on ? k : 1 - k) * Number(glow.userData.size ?? 2.2) + 0.001);
      }, Ease.outCubic, light);
    });
    d.register('confront', (args) => this.runConfrontation(args[0]));
    d.register('solve', () => this.solve());
    for (const c of INVESTIGATION_COMMANDS) if (!d.has(c)) throw new Error(`命令の登録漏れ: ${c}`);
  }

  private findActor(name: string): PaperActor | null {
    const st = this.engine.stage;
    if (st.actors.has(name)) return st.actors.get(name)!;
    for (const a of st.actors.values()) if (a.def.name === name) return a;
    return null;
  }

  // ---------- 会話 ----------
  private async say(speaker: string | null, expr: string | null, text: string): Promise<void> {
    const actor = speaker ? this.findActor(speaker) : null;
    if (actor && expr) actor.setExpression(expr, false, this.engine.tweens);
    if (actor && this.autoCamera) {
      // 話し手と主人公が離れていなければ2人を収める
      if (actor !== this.player && actor.position.distanceTo(this.player.position) < 3.6) twoShot(this.engine.rig, this.player, actor);
      else actorShot(this.engine.rig, actor);
    }
    // 会話の立ち絵：主人公は左、相手は右
    if (actor) {
      const side = actor === this.player ? 'left' : 'right';
      this.portraitActors[side] = actor;
      this.engine.hud.setSpeaker(side, this.portraitOf(actor));
    } else this.engine.hud.setSpeaker(null, null);
    this.log.push(`say:${speaker ?? ''}:${text.slice(0, 12)}`);
    await this.engine.hud.say(actor?.def.name ?? speaker, actor?.def.color, text, (t) => {
      if (actor) actor.talking = t;
    });
  }

  /** 攻撃・被弾・表情の変化を、出ている会話の立ち絵にも反映する */
  private syncPortrait(actor: PaperActor): void {
    for (const side of ['left', 'right'] as const) {
      if (this.portraitActors[side] === actor) this.engine.hud.refreshPortrait(side, this.portraitOf(actor));
    }
  }

  private portraitOf(actor: PaperActor): PortraitData {
    const { id, info, artFacing } = actor.pose;
    const url = (file: string) => this.engine.assets.url(`cast/${id}/${file}`);
    const part = (k: keyof PoseInfo['parts']) => {
      const p = info.parts[k];
      return p ? { url: url(p.file), x: p.x, y: p.y, w: p.w, h: p.h } : undefined;
    };
    const pick = <T,>(o: Record<string, T | undefined>) =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v)) as Partial<Record<'open' | 'half' | 'closed', T>>;
    return {
      key: id,
      width: info.width,
      height: info.height,
      base: url('base.webp'),
      artFacing,
      eyes: pick({ open: part('eye_open'), half: part('eye_half'), closed: part('eye_closed') }),
      mouth: pick({ open: part('mouth_open'), half: part('mouth_half'), closed: part('mouth_closed') }),
    };
  }

  /** 台本を流す間は操作を止める */
  async runScript(source: string): Promise<void> {
    const prev = this.phase;
    this.phase = 'script';
    this.engine.hud.showTouch(false);
    this.engine.hud.setPrompt(null);
    this.player.setWalking(0);
    try {
      await this.director.play(source);
    } finally {
      this.engine.hud.hideDialogue();
      if (prev !== 'done' && this.phase === 'script') this.phase = prev === 'loading' ? 'explore' : prev;
    }
  }

  // ---------- 流れ ----------
  async start(): Promise<void> {
    this.followCamera();
    this.engine.rig.snap();
    if (this.data.bgm?.field) this.engine.sound.setBgm(this.data.bgm.field);
    await this.runScript(this.data.intro);
    this.beginExplore();
  }

  private beginExplore(): void {
    this.phase = 'explore';
    this.autoCamera = true;
    this.followCamera();
    this.engine.hud.showTouch(true);
    this.refreshGoal();
  }

  private followCamera(): void {
    this.engine.rig.followTarget(this.player, CameraRig.DEFAULT_OFFSET, 1.1, 32);
  }

  private refreshGoal(): void {
    this.engine.hud.setGoal(this.state.goal());
  }

  /** 証拠品（尋問でつきつける物） */
  private ownedEvidence(): CardItem[] {
    return this.state.evidence.map((id) => {
      const e = this.data.evidence.find((x) => x.id === id)!;
      return { ...e, image: this.engine.assets.url(e.image), group: '証拠品' };
    });
  }

  /** 推理メモ（まとめるで使う物） */
  private ownedClues(): CardItem[] {
    return this.state.clues.map((id) => {
      const c = this.data.clues.find((x) => x.id === id)!;
      return { ...c, image: this.engine.assets.url('props/sign_hanging_small.webp'), group: '推理メモ' };
    });
  }

  private async openBook(): Promise<void> {
    this.engine.hud.showTouch(false);
    await this.engine.hud.openBook([...this.ownedEvidence(), ...this.ownedClues()], 'view', '証拠品・推理メモ', '証拠品は尋問で、推理メモはまとめるで使う');
    if (this.phase === 'explore') this.engine.hud.showTouch(true);
  }

  private async interact(h: HotspotDef): Promise<void> {
    const { script: src, key } = this.state.resolveHotspot(h);
    this.state.markPlayed(key);
    this.log.push(`examine:${h.id}`);
    const actor = h.actor ? this.findActor(h.actor) : null;
    if (actor) {
      void actor.face(this.player.position.x >= actor.position.x ? 1 : -1, this.engine.tweens);
      void this.player.face(actor.position.x >= this.player.position.x ? 1 : -1, this.engine.tweens);
    } else {
      void this.player.face(h.x >= this.player.position.x ? 1 : -1, this.engine.tweens);
    }
    this.engine.sound.play('select');
    await this.runScript(src);
    if (this.phase === 'done') return;
    if (this.phase === 'explore' || this.phase === 'script') this.beginExplore();
  }

  /** まとめる：持っている手がかりから2つ選んでつなぐ。探索中ならいつでも開ける */
  async runLogic(): Promise<void> {
    const L = this.data.logic;
    const hud = this.engine.hud;
    this.phase = 'script';
    hud.showTouch(false);
    hud.setPrompt(null);
    this.player.setWalking(0);
    await this.engine.stage.setLook('confront', 0.6);
    const clues = this.ownedClues().map(({ id, name, desc }) => ({ id, name, desc }));
    for (;;) {
      const pick = await hud.logic(clues, L.title, L.hint);
      if (!pick) break;
      const hit = evaluateLogic(this.data, pick[0], pick[1]);
      if (hit && this.state.flags.has(hit.flag)) {
        await this.runScript(L.done);
        this.phase = 'script';
        continue;
      }
      if (hit) {
        this.log.push(`logic:${hit.flag}`);
        this.state.flags.add(hit.flag);
        this.engine.sound.play('reveal');
        await this.engine.stage.setLook('sunset', 0.8);
        await this.runScript(hit.script);
        break;
      }
      this.engine.sound.play('wrong');
      await this.runScript(L.miss);
      this.phase = 'script';
    }
    await this.engine.stage.setLook('sunset', 0.6);
    this.refreshGoal();
    // まとめた台本の中で尋問が始まり、事件が解決していることもある
    if (this.phase === 'script') this.beginExplore();
  }

  /** 尋問。台本の `@対決 <id>` から呼ばれ、正しい証拠をぶつけるまで続く */
  async runConfrontation(id: string): Promise<void> {
    const def = this.data.confrontations[id];
    if (!def) throw new Error(`尋問がありません: ${id}`);
    const hud = this.engine.hud;
    const witness = this.findActor(def.witness)!;
    const c = (this.confrontation = new Confrontation(def, this.state.talismans, this.data.talismans));
    const max = this.data.talismans;
    /** この尋問で間違えた回数（ヒントの強さに使う） */
    let misses = 0;
    this.phase = 'script';
    hud.showTouch(false);
    hud.setGoal(null);
    hud.bookButton.classList.add('hidden');
    this.log.push(`confront:${id}:start`);
    // 向かい合う立ち位置へ
    const side = witness.position.x >= this.player.position.x ? 1 : -1;
    const standX = witness.position.x - side * 2.4;
    await this.director.play(`@移動 ${this.player.def.id} ${standX.toFixed(2)} ${witness.position.z.toFixed(2)}`);
    await Promise.all([this.player.face(side as 1 | -1, this.engine.tweens), witness.face((-side) as 1 | -1, this.engine.tweens)]);
    await this.engine.stage.setLook('confront', 1);
    if (this.data.bgm?.confront) this.engine.sound.setBgm(this.data.bgm.confront);
    hud.setTalismans(max, c.talismans);
    await this.runScript(def.intro);
    await hud.card(def.title, '尋問開始', '◀▶で証言を切り替え、揺さぶるか、矛盾に証拠品をつきつけよう');
    for (;;) {
      // 証言パネルが画面下半分を使うので、証人は上寄りに映す
      this.engine.rig.shot(witness.position.clone().add(new THREE.Vector3(0, -0.15, 0)), new THREE.Vector3(0.3 * witness.facing, 1.15, 5.6), 30);
      witness.talking = true;
      setTimeout(() => (witness.talking = false), 900);
      this.testimony.show(`${witness.def.name}の証言`, c.statement.text, c.index, c.visible.length);
      const a = await this.testimony.wait();
      if (a === 'next' || a === 'prev') {
        this.engine.sound.play('select');
        if (a === 'next') c.next();
        else c.prev();
        continue;
      }
      this.testimony.hide();
      if (a === 'press') {
        const statement = c.statement;
        const revealed = c.press();
        this.log.push(`press:${id}:${c.number}`);
        await this.runScript(`@叫び 待った！\n${statement.press}`);
        if (revealed !== null) {
          // 揺さぶりで新しい証言が出た：その証言へ移る
          this.engine.sound.play('reveal');
          c.index = c.visible.indexOf(revealed);
          await hud.card('証言が増えた', '', 'この証言をよく聞こう');
        }
        continue;
      }
      // 尋問でつきつけられるのは証拠品だけ（推理メモは「まとめる」用）
      const chosen = await hud.openBook(this.ownedEvidence(), 'present', '証拠品');
      if (!chosen) continue;
      const result = c.present(chosen);
      this.state.talismans = c.talismans;
      this.log.push(`present:${id}:${c.number}:${chosen}:${result}`);
      await Promise.all([hud.shout('これを見ろ！'), this.player.attack(this.engine.tweens)]);
      if (result === 'correct') {
        this.engine.rig.shake(0.4, 0.5);
        await witness.damage(this.engine.tweens);
        await this.runScript(def.success);
        break;
      }
      this.engine.sound.play('wrong');
      // 相手に言い返される
      await witness.attack(this.engine.tweens);
      await this.player.damage(this.engine.tweens);
      hud.setTalismans(max, c.talismans);
      await this.runScript(def.wrong);
      misses++;
      if (c.lost) {
        // 信が尽きたらゲームオーバー。この尋問を始めたときの信に戻して、尋問の最初からやり直す（満タンには戻らない）
        await this.runScript(def.fail);
        this.log.push(`gameover:${id}`);
        this.engine.sound.play('wrong');
        await hud.card('ゲームオーバー', '信を失った', `この尋問の最初からやり直す（信 ${c.start}）`);
        c.reset();
        misses = 0;
        this.state.talismans = c.talismans;
        hud.setTalismans(max, c.talismans);
        await this.runScript(def.intro);
        await hud.card(def.title, '尋問開始', '◀▶で証言を切り替え、揺さぶるか、矛盾に証拠品をつきつけよう');
        continue;
      }
      // 間違えるたびに、少しずつはっきりしたヒントを出す
      const hints = def.hints ?? [];
      if (hints.length) await this.runScript(hints[Math.min(misses, hints.length) - 1]);
    }
    this.confrontation = null;
    this.testimony.hide();
    hud.setTalismans(0, 0);
    this.log.push(`confront:${id}:solved`);
    // 成功の台本の中で事件が解決していれば、ここで終わり（台本の実行中に phase が変わる）
    if ((this.phase as Phase) === 'done') return;
    if (this.data.bgm?.field) this.engine.sound.setBgm(this.data.bgm.field);
    await this.engine.stage.setLook('sunset', 0.8);
    hud.bookButton.classList.remove('hidden');
    this.refreshGoal();
  }

  /** 事件解決：結末を流して最初から */
  async solve(): Promise<void> {
    const hud = this.engine.hud;
    this.state.flags.add('solved');
    this.log.push('solved');
    hud.bookButton.classList.add('hidden');
    hud.setGoal(null);
    await this.runScript(this.data.ending);
    this.phase = 'done';
    this.markers.forEach((m) => (m.visible = false));
    await hud.card('事件解決', this.data.chapter, 'タップでもう一度はじめから');
    location.reload();
  }

  // ---------- 毎フレーム ----------
  update(dt: number, engine: Engine): void {
    if (this.phase !== 'explore') {
      this.player?.setWalking(0);
      return;
    }
    const inp = engine.input;
    const p = this.player;
    const mv = inp.move;
    const moving = Math.hypot(mv.x, mv.y) > 0.05;
    if (moving) {
      const nx = p.position.x + mv.x * WALK_SPEED * dt;
      const nz = p.position.z + mv.y * WALK_SPEED * 0.8 * dt;
      const pos = this.resolveCollision(nx, nz);
      p.position.x = pos.x;
      p.position.z = pos.y;
      if (Math.abs(mv.x) > 0.2) void p.face(mv.x > 0 ? 1 : -1, engine.tweens);
      this.stepClock -= dt;
      if (this.stepClock <= 0) {
        this.stepClock = 0.34;
        engine.sound.play('step');
      }
    }
    p.setWalking(moving ? Math.min(1, Math.hypot(mv.x, mv.y) * 1.2) : 0);
    engine.stage.centerShadow(p.position.x);

    // 近くの調べられる所
    let best: HotspotDef | null = null;
    let bestD = Infinity;
    for (const h of this.data.hotspots) {
      const d = Math.hypot(h.x - p.position.x, h.z - p.position.z);
      if (d < h.radius && d < bestD) {
        best = h;
        bestD = d;
      }
    }
    if (best !== this.near) {
      this.near = best;
      engine.hud.setPrompt(best ? best.label : null);
    }
    if (inp.consume('menu')) {
      void this.openBook();
      return;
    }
    if (inp.consume('logic')) {
      void this.runLogic();
      return;
    }
    if (this.near && inp.consume('confirm')) {
      const h = this.near;
      this.near = null;
      void this.interact(h);
    }
  }

  private resolveCollision(x: number, z: number): THREE.Vector2 {
    const w = this.data.scene.walk;
    const v = new THREE.Vector2(THREE.MathUtils.clamp(x, w.minX, w.maxX), THREE.MathUtils.clamp(z, w.minZ, w.maxZ));
    const push = (cx: number, cz: number, r: number) => {
      const dx = v.x - cx;
      const dz = v.y - cz;
      const d = Math.hypot(dx, dz);
      const min = r + PLAYER_RADIUS;
      if (d < min && d > 1e-4) {
        v.x = cx + (dx / d) * min;
        v.y = cz + (dz / d) * min;
      }
    };
    for (const o of this.data.scene.obstacles) push(o.x, o.z, o.r);
    for (const a of this.engine.stage.actors.values()) if (a !== this.player && a.visible) push(a.position.x, a.position.z, 0.32);
    return v;
  }

  private markerTime = 0;
  private animateMarkers(dt: number): void {
    this.markerTime += dt;
    for (const h of this.data.hotspots) {
      const m = this.markers.get(h.id)!;
      // 今の段階で新しく見られる内容があれば「！・話」、見終わっていれば赤い✓
      const done = !this.state.resolveHotspot(h).fresh;
      const mat = m.material as THREE.SpriteMaterial;
      const want = done ? this.tagTex.done : h.actor ? this.tagTex.talk : this.tagTex.look;
      if (mat.map !== want) {
        mat.map = want;
        mat.needsUpdate = true;
      }
      const base = h.markHeight ?? (h.actor ? (this.findActor(h.actor)?.def.height ?? 1) + 0.35 : 1.3);
      // 新しい内容がある印は大きく弾ませ、調べ済みは小さく静かに
      m.position.y = base + (done ? 0 : Math.abs(Math.sin(this.markerTime * 3 + h.x)) * 0.1);
      const isNear = this.near === h && this.phase === 'explore';
      m.scale.setScalar(isNear ? 0.52 : done ? 0.3 : 0.44);
      m.visible = this.phase === 'explore';
    }
  }
}
