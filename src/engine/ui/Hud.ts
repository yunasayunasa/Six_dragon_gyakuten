import type { Input } from '../core/Input';
import type { Sound } from '../audio/Sound';
import { toGame } from '../core/screen';
import { PortraitSlot, type PortraitData, type PortraitSide } from './Portrait';
import { el, escapeHtml } from './dom';
import { Panels } from './Panels';
import { ReadMarks } from '../core/ReadMarks';
import type { Settings } from '../core/Settings';

export { escapeHtml };

export interface CardItem {
  id: string;
  name: string;
  desc: string;
  image: string;
  /** 一覧で見出しを付けて分けるときの分類名 */
  group?: string;
}

export interface ClueItem {
  id: string;
  name: string;
  desc: string;
}

/** 遊び方の説明の1ページ */
export interface GuideStep {
  text: string;
  /** 指し示す画面の部品（defineTarget で登録した名前）。無ければ画面全体を暗くするだけ */
  target?: string;
}

/** 要素の位置をゲーム画面の座標で返す（画面を回しているときも正しく）。見えていなければ null */
function gameRect(e: Element): { x: number; y: number; w: number; h: number } | null {
  const r = e.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const a = toGame(r.left, r.top);
  const b = toGame(r.right, r.bottom);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/**
 * 画面上のUI一式（DOM）。ゲームの状態は持たず、表示と入力待ちだけを担当する。
 * どのジャンルでも使う部品：会話、叫び、字幕、選択肢、アイテム一覧、入手演出、暗転、タッチ操作。
 */
export class Hud {
  readonly root: HTMLElement;
  private dlg: HTMLElement;
  private dlgName: HTMLElement;
  private dlgText: HTMLElement;
  private fader: HTMLElement;
  private promptEl: HTMLElement;
  readonly topbar: HTMLElement;
  private goalEl: HTMLElement;
  private talismanEl: HTMLElement;
  private touch: HTMLElement;
  private confirmWaiters: Array<() => void> = [];
  private typing: { full: string; shown: number; acc: number; done: () => void } | null = null;
  /** 文字送りの速さ（文字/秒） */
  cps = 42;
  onSpeakTick: (() => void) | null = null;
  bookButton: HTMLElement;
  /** メニュー（セーブ・ロード・設定など。中身はジャンルが決める） */
  menuButton: HTMLElement;
  soundButton: HTMLElement;
  private portraits: Record<PortraitSide, PortraitSlot>;
  private speaking: PortraitSide | null = null;
  /** 説明で指し示せる画面の部品（名前 → 要素） */
  private targets = new Map<string, () => Element | null>();
  /** 会話の記録（ログで読み返す） */
  readonly backlog: Array<{ name: string | null; color?: string; text: string }> = [];
  private skipButton: HTMLElement;
  private skip = false;
  /** 開いているパネルの数。開いている間は会話を進めない */
  modal = 0;
  /** パネルを閉じる処理（キーボードの取消で一番上のパネルを閉じる） */
  readonly cancelStack: Array<() => void> = [];
  /** ログ・設定・メニュー・セーブ一覧・ホーム画面 */
  readonly panels: Panels;

  constructor(readonly input: Input, readonly sound: Sound, readonly settings: Settings, private readMarks: ReadMarks) {
    this.root = document.getElementById('hud')!;
    this.panels = new Panels(this);
    this.topbar = el('div', 'topbar', this.root);
    this.talismanEl = el('div', 'talismans hidden', this.topbar);
    this.goalEl = el('div', 'chip goal washi hidden', this.topbar);
    el('div', 'spacer', this.topbar);
    this.bookButton = el('div', 'chip washi hidden', this.topbar, '証拠品');
    this.menuButton = el('div', 'chip washi hidden', this.topbar, 'メニュー');
    this.soundButton = el('div', 'chip washi', this.topbar, '音：切');
    this.soundButton.addEventListener('click', () => {
      sound.unlock();
      sound.setMuted(!sound.muted);
      this.soundButton.textContent = sound.muted ? '音：切' : '音：入';
    });
    sound.muted = true;

    this.touch = el('div', 'touch hidden', this.root);
    this.buildTouch();

    this.promptEl = el('div', 'prompt washi hidden', this.root);
    this.promptEl.addEventListener('click', () => input.press('confirm'));

    this.dlg = el('div', 'dlg washi hidden', this.root);
    this.dlgName = el('div', 'name', this.dlg);
    this.dlgText = el('div', 'text', this.dlg);
    el('div', 'next', this.dlg);
    // 会話枠の右上：ログと早送り（押しても会話は進めない）
    const tools = el('div', 'tools', this.dlg);
    const logButton = el('div', 'tool', tools, 'ログ');
    this.skipButton = el('div', 'tool', tools, '早送り');
    for (const b of [logButton, this.skipButton]) b.addEventListener('pointerdown', (e) => e.stopPropagation());
    logButton.addEventListener('click', () => void this.panels.log());
    this.skipButton.addEventListener('click', () => {
      this.sound.play('select');
      this.skipping = !this.skip;
    });
    // 立ち絵は会話枠の後ろに置く
    this.portraits = { left: new PortraitSlot(this.root, this.dlg, 'left'), right: new PortraitSlot(this.root, this.dlg, 'right') };
    this.dlg.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      this.input.press('confirm');
    });
    // 会話中は舞台（会話枠の外）をタップしても送れるようにする
    document.getElementById('app')?.addEventListener('pointerdown', () => {
      if (this.dlg.classList.contains('hidden')) return;
      this.sound.unlock();
      this.input.press('confirm');
    });
    this.fader = el('div', 'fader', this.root);

    this.defineTarget('目的', () => this.goalEl);
    this.defineTarget('信', () => this.talismanEl);
    this.defineTarget('証拠品', () => this.bookButton);
    this.defineTarget('音', () => this.soundButton);
    this.defineTarget('メモの一覧', () => this.root.querySelector('.logic .clues'));
    this.defineTarget('つなげる', () => this.root.querySelector('.logic .row .btn.shu'));
    this.defineTarget('あとで', () => this.root.querySelector('.logic .row .btn:not(.shu)'));
  }

  /** 早送り中か。読んでいない会話に来たら（設定で許していなければ）自動で止まる */
  get skipping(): boolean {
    return this.skip;
  }

  set skipping(on: boolean) {
    this.skip = on;
    this.skipButton.classList.toggle('on', on);
  }

  /**
   * 決定を待つ。早送り中なら ms 待って自動で進む（待っている間に早送りを入れても進む）。
   * パネルを開いている間は進まない。
   */
  private waitConfirmOrSkip(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let waited = 0;
      const timer = setInterval(() => {
        waited = this.skip && this.modal === 0 ? waited + 30 : 0;
        if (waited >= ms) done();
      }, 30);
      const done = () => {
        clearInterval(timer);
        this.confirmWaiters = this.confirmWaiters.filter((w) => w !== done);
        resolve();
      };
      this.confirmWaiters.push(done);
    });
  }

  /** 説明（guide）で指し示せる部品を登録する。ジャンル固有の部品もここに足す */
  defineTarget(name: string, get: () => Element | null): void {
    this.targets.set(name, get);
  }

  private buildTouch(): void {
    const zone = el('div', 'stick-zone', this.touch);
    const base = el('div', 'stick-base hidden', zone);
    const knob = el('div', 'stick-knob', base);
    let id: number | null = null;
    let ox = 0;
    let oy = 0;
    const R = () => base.offsetWidth / 2;
    zone.addEventListener('pointerdown', (e) => {
      this.sound.unlock();
      id = e.pointerId;
      zone.setPointerCapture(id);
      // 画面を回しているときもあるので、ゲーム画面の座標で扱う
      const p = toGame(e.clientX, e.clientY);
      ox = p.x;
      oy = p.y;
      base.style.left = `${p.x - zone.offsetLeft}px`;
      base.style.top = `${p.y - zone.offsetTop}px`;
      base.classList.remove('hidden');
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const rad = R();
      const p = toGame(e.clientX, e.clientY);
      let dx = p.x - ox;
      let dy = p.y - oy;
      const len = Math.hypot(dx, dy);
      if (len > rad) {
        dx = (dx / len) * rad;
        dy = (dy / len) * rad;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const dead = 0.18;
      const nx = dx / rad;
      const ny = dy / rad;
      const m = Math.hypot(nx, ny);
      this.input.setStick(m < dead ? 0 : nx, m < dead ? 0 : ny);
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = 'translate(-50%, -50%)';
      base.classList.add('hidden');
      this.input.setStick(0, 0);
    };
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
    zone.addEventListener('contextmenu', (e) => e.preventDefault());

    const btns = el('div', 'btns', this.touch);
    // 証拠品一覧は上の「証拠品」から開けるので、こちらは「まとめる」
    const logic = el('div', 'btn-round small', btns, 'まとめる');
    logic.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.input.press('logic');
    });
    const act = el('div', 'btn-round shu', btns, '調べる');
    act.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      this.input.press('confirm');
    });
    this.defineTarget('移動', () => zone);
    this.defineTarget('まとめる', () => logic);
    this.defineTarget('調べる', () => act);
  }

  syncSoundLabel(): void {
    this.soundButton.textContent = this.sound.muted ? '音：切' : '音：入';
  }

  showTouch(on: boolean): void {
    this.touch.classList.toggle('hidden', !on);
    if (!on) this.input.setStick(0, 0);
  }

  setGoal(text: string | null): void {
    this.goalEl.classList.toggle('hidden', !text);
    if (text) this.goalEl.textContent = `目的：${text}`;
  }

  setTalismans(total: number, left: number): void {
    this.talismanEl.classList.toggle('hidden', total <= 0);
    this.talismanEl.innerHTML = '';
    for (let i = 0; i < total; i++) el('div', `talisman${i >= left ? ' lost' : ''}`, this.talismanEl, '信');
  }

  setPrompt(text: string | null): void {
    this.promptEl.classList.toggle('hidden', !text);
    if (text) this.promptEl.innerHTML = `<b>調</b>${escapeHtml(text)}`;
  }

  /** 決定入力を待つ（画面タップ・キー） */
  waitConfirm(): Promise<void> {
    return new Promise((r) => this.confirmWaiters.push(r));
  }

  /** 会話を1つ表示し、読み終えて決定されるまで待つ */
  async say(name: string | null, color: string | undefined, text: string, onTalk?: (talking: boolean) => void): Promise<void> {
    const key = ReadMarks.key(name, text);
    // 早送りは、読んでいない会話に来たら止まる（設定で「すべて」にしていなければ）
    if (this.skip && !this.readMarks.has(key) && !this.settings.values.skipUnread) this.skipping = false;
    this.backlog.push({ name, color, text });
    if (this.backlog.length > 300) this.backlog.shift();
    this.dlg.classList.remove('hidden', 'done');
    this.dlg.classList.toggle('narration', !name);
    this.dlgName.textContent = name ?? '';
    this.dlgName.style.background = color ?? '';
    this.dlgText.textContent = '';
    this.input.clearPressed();
    const slot = this.speaking ? this.portraits[this.speaking] : null;
    onTalk?.(true);
    if (slot) slot.talking = true;
    await new Promise<void>((done) => {
      this.typing = { full: text, shown: 0, acc: 0, done };
    });
    onTalk?.(false);
    if (slot) slot.talking = false;
    this.readMarks.add(key);
    this.dlg.classList.add('done');
    await this.waitConfirmOrSkip(90);
    if (!this.skip) this.sound.play('select');
  }

  hideDialogue(): void {
    this.dlg.classList.add('hidden');
    this.portraits.left.hide();
    this.portraits.right.hide();
    this.speaking = null;
  }

  /**
   * 次のセリフの話し手の立ち絵を出す。話し手は明るく、聞き手は暗くする。
   * data が null（ナレーション）のときは、出ている立ち絵を両方とも暗くする。
   */
  /** 出ている立ち絵の絵だけを差し替える（話し手は変えない） */
  refreshPortrait(side: PortraitSide, data: PortraitData): void {
    if (this.portraits[side].visible) this.portraits[side].show(data, false);
  }

  setSpeaker(side: PortraitSide | null, data: PortraitData | null): void {
    if (side && data) this.portraits[side].show(data);
    this.speaking = side && data ? side : null;
    for (const s of ['left', 'right'] as const) this.portraits[s].setActive(s === this.speaking);
  }

  async shout(word: string, color?: string): Promise<void> {
    const s = el('div', 'shout', this.root);
    const sp = el('div', 'splash', s);
    if (color) sp.style.background = color;
    el('div', 'word', s, escapeHtml(word));
    this.sound.play('shout');
    await new Promise((r) => setTimeout(r, this.skip ? 450 : 1100));
    s.remove();
  }

  /** 画面上に短い知らせを出す（待たない） */
  toast(text: string): void {
    const t = el('div', 'toast washi', this.root, escapeHtml(text));
    setTimeout(() => t.remove(), 1800);
  }

  async card(title: string, sub = '', hint = ''): Promise<void> {
    const c = el('div', 'card', this.root);
    const inner = el('div', 'inner washi', c);
    if (sub) el('div', 'sub', inner, escapeHtml(sub));
    el('div', 'title', inner, escapeHtml(title));
    if (hint) el('div', 'hint', inner, escapeHtml(hint));
    c.addEventListener('pointerdown', () => {
      this.sound.unlock();
      this.input.press('confirm');
    });
    this.input.clearPressed();
    await this.waitConfirmOrSkip(350);
    this.sound.play('confirm');
    c.remove();
  }

  fade(to: 0 | 1, seconds = 0.5): Promise<void> {
    this.fader.style.transition = `opacity ${seconds}s`;
    this.fader.style.opacity = String(to);
    return new Promise((r) => setTimeout(r, seconds * 1000));
  }

  /** 選択肢を出す。question があれば、画面を暗くして問いかけと一緒に出す（後ろは触れない） */
  async choose(options: string[], question?: string): Promise<number> {
    // 選ぶ場面では早送りを止める
    this.skipping = false;
    const layer = question ? el('div', 'ask', this.root) : null;
    const box = el('div', 'choices', layer ?? this.root);
    if (question) el('div', 'question washi', box, escapeHtml(question));
    return new Promise((resolve) => {
      options.forEach((o, i) => {
        const b = el('div', 'btn', box, escapeHtml(o));
        b.addEventListener('click', () => {
          this.sound.play('confirm');
          (layer ?? box).remove();
          resolve(i);
        });
      });
    });
  }

  /** 遊び方の説明。画面の部品を照らしながら1ページずつ見せ、タップで進める */
  async guide(steps: GuideStep[]): Promise<void> {
    const g = el('div', 'guide', this.root);
    const spot = el('div', 'spot', g);
    const box = el('div', 'box washi', g);
    el('div', 'name', box, '遊び方');
    const text = el('div', 'text', box);
    const count = el('div', 'count', box);
    el('div', 'next', box);
    g.addEventListener('pointerdown', () => {
      this.sound.unlock();
      this.input.press('confirm');
    });
    for (const [i, step] of steps.entries()) {
      const target = step.target ? this.targets.get(step.target)?.() : null;
      const r = target ? gameRect(target) : null;
      const pad = 8;
      // 指す物が無いときは、光の穴を画面の真ん中で閉じて全体を暗くする
      const s = r ? { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 } : { x: this.root.clientWidth / 2, y: this.root.clientHeight / 2, w: 0, h: 0 };
      Object.assign(spot.style, { left: `${s.x}px`, top: `${s.y}px`, width: `${s.w}px`, height: `${s.h}px` });
      spot.classList.toggle('none', !r);
      text.textContent = step.text;
      count.textContent = `${i + 1} / ${steps.length}`;
      box.classList.toggle('mid', !r);
      box.style.top = '';
      if (r) {
        // 説明の枠は、指す物の上か下の広く空いている側に、なるべく重ならないように置く（上には見出しの札の分をあける）
        const H = this.root.clientHeight;
        const bh = box.offsetHeight;
        const gap = 10;
        const tag = 30;
        const top = s.y >= H - (s.y + s.h) ? Math.max(tag, s.y - gap - bh) : Math.min(H - bh - gap, s.y + s.h + gap + tag);
        box.style.top = `${top}px`;
      }
      this.input.clearPressed();
      await this.waitConfirm();
      this.sound.play('select');
    }
    g.remove();
  }

  async itemGet(item: CardItem, label = '証拠品を手に入れた'): Promise<void> {
    const w = el('div', 'itemget', this.root);
    const p = el('div', 'panel washi', w);
    const img = el('img', '', p);
    img.src = item.image;
    img.alt = '';
    const t = el('div', '', p);
    el('div', 'label', t, escapeHtml(label));
    el('div', 'nm', t, escapeHtml(item.name));
    el('div', 'ds', t, escapeHtml(item.desc));
    this.sound.play('item');
    w.addEventListener('pointerdown', () => this.input.press('confirm'));
    this.input.clearPressed();
    await this.waitConfirmOrSkip(400);
    this.sound.play('select');
    w.remove();
  }

  /**
   * アイテム一覧を開く。mode='present' なら選んだIDを返す（やめたら null）。
   */
  openBook(items: CardItem[], mode: 'view' | 'present', title = '証拠品ファイル', note = ''): Promise<string | null> {
    const wrap = el('div', 'book', this.root);
    const panel = el('div', 'panel washi', wrap);
    const h = el('h2', '', panel, `${escapeHtml(title)}<small>${mode === 'present' ? '示す証拠を選んでください' : escapeHtml(note)}</small>`);
    void h;
    const grid = el('div', 'grid', panel);
    const desc = el('div', 'desc', panel);
    const row = el('div', 'row', panel);
    const close = el('div', 'btn', row, mode === 'present' ? 'やめる' : '閉じる');
    const ok = mode === 'present' ? el('div', 'btn shu', row, 'これを示す') : null;
    let sel = 0;
    const cards: HTMLElement[] = [];
    const select = (i: number) => {
      if (!items.length) return;
      sel = (i + items.length) % items.length;
      cards.forEach((c, j) => c.classList.toggle('sel', j === sel));
      desc.textContent = items[sel].desc;
      cards[sel].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    items.forEach((it, i) => {
      if (it.group && it.group !== items[i - 1]?.group) el('div', 'group', grid, escapeHtml(it.group));
      const c = el('div', 'ev', grid);
      const img = el('img', '', c);
      img.src = it.image;
      img.alt = '';
      el('div', 'nm', c, escapeHtml(it.name));
      c.addEventListener('click', () => {
        if (sel === i && ok) ok.click();
        select(i);
        this.sound.play('select');
      });
      cards.push(c);
    });
    if (!items.length) desc.textContent = 'まだ何も持っていない。';
    select(0);
    this.input.clearPressed();
    return new Promise((resolve) => {
      const finish = (v: string | null) => {
        this.bookKeys = null;
        wrap.remove();
        resolve(v);
      };
      close.addEventListener('click', () => {
        this.sound.play('cancel');
        finish(null);
      });
      ok?.addEventListener('click', () => {
        if (!items.length) return;
        this.sound.play('confirm');
        finish(items[sel].id);
      });
      this.bookKeys = (a) => {
        if (a === 'left') select(sel - 1);
        if (a === 'right') select(sel + 1);
        if (a === 'cancel' || a === 'menu') close.click();
        if (a === 'confirm') (ok ?? close).click();
      };
    });
  }
  private bookKeys: ((a: 'left' | 'right' | 'cancel' | 'menu' | 'confirm') => void) | null = null;

  /** 手がかりを2つ選ばせる。やめたら null */
  logic(clues: ClueItem[], title: string, hint: string): Promise<[string, string] | null> {
    const wrap = el('div', 'logic', this.root);
    const panel = el('div', 'panel washi', wrap);
    el('h2', '', panel, escapeHtml(title));
    el('div', 'hint', panel, escapeHtml(hint));
    const list = el('div', 'clues', panel);
    const row = el('div', 'row', panel);
    row.style.cssText = 'display:flex;gap:calc(var(--vw) * 2);justify-content:flex-end';
    const cancel = el('div', 'btn', row, 'あとで');
    const ok = el('div', 'btn shu', row, 'つなげる');
    ok.setAttribute('disabled', '');
    const chosen: string[] = [];
    const nodes = new Map<string, HTMLElement>();
    clues.forEach((c) => {
      const n = el('div', 'clue', list, `<b>${escapeHtml(c.name)}</b>${escapeHtml(c.desc)}`);
      n.addEventListener('click', () => {
        const i = chosen.indexOf(c.id);
        if (i >= 0) chosen.splice(i, 1);
        else {
          chosen.push(c.id);
          if (chosen.length > 2) chosen.shift();
        }
        nodes.forEach((node, id) => node.classList.toggle('sel', chosen.includes(id)));
        ok.toggleAttribute('disabled', chosen.length !== 2);
        this.sound.play('select');
      });
      nodes.set(c.id, n);
    });
    this.sound.play('reveal');
    return new Promise((resolve) => {
      cancel.addEventListener('click', () => {
        this.sound.play('cancel');
        wrap.remove();
        resolve(null);
      });
      ok.addEventListener('click', () => {
        if (chosen.length !== 2) return;
        wrap.remove();
        resolve([chosen[0], chosen[1]]);
      });
    });
  }

  /** 毎フレーム呼ぶ。文字送りと決定入力を処理する。 */
  update(dt: number): void {
    this.portraits.left.update(dt);
    this.portraits.right.update(dt);
    // パネルを開いている間は会話を進めない（取消キーで一番上のパネルを閉じる）
    if (this.modal > 0) {
      if (this.input.consume('cancel')) this.cancelStack.at(-1)?.();
      return;
    }
    if (this.bookKeys) {
      for (const a of ['left', 'right', 'cancel', 'menu', 'confirm'] as const) if (this.input.consume(a)) this.bookKeys?.(a);
      return;
    }
    if (this.typing) {
      const t = this.typing;
      if (this.skip || this.input.consume('confirm')) t.shown = t.full.length;
      else {
        t.acc += dt * this.cps;
        const add = Math.floor(t.acc);
        if (add > 0) {
          t.acc -= add;
          const before = t.shown;
          t.shown = Math.min(t.full.length, t.shown + add);
          if (Math.floor(before / 2) !== Math.floor(t.shown / 2)) this.sound.play('blip');
        }
      }
      this.dlgText.textContent = t.full.slice(0, t.shown);
      if (t.shown >= t.full.length) {
        this.typing = null;
        t.done();
      }
      return;
    }
    if (this.confirmWaiters.length && this.input.consume('confirm')) {
      const ws = this.confirmWaiters;
      this.confirmWaiters = [];
      ws.forEach((w) => w());
    }
  }
}
