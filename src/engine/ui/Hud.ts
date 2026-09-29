import type { Input } from '../core/Input';
import type { Sound } from '../audio/Sound';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: HTMLElement, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  parent?.appendChild(e);
  return e;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export interface CardItem {
  id: string;
  name: string;
  desc: string;
  image: string;
}

export interface ClueItem {
  id: string;
  name: string;
  desc: string;
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
  soundButton: HTMLElement;

  constructor(private input: Input, private sound: Sound) {
    this.root = document.getElementById('hud')!;
    this.topbar = el('div', 'topbar', this.root);
    this.talismanEl = el('div', 'talismans hidden', this.topbar);
    this.goalEl = el('div', 'chip goal washi hidden', this.topbar);
    el('div', 'spacer', this.topbar);
    this.bookButton = el('div', 'chip washi hidden', this.topbar, '証拠品');
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
    this.dlg.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      this.input.press('confirm');
    });
    this.fader = el('div', 'fader', this.root);
  }

  private buildTouch(): void {
    const zone = el('div', 'stick-zone', this.touch);
    const base = el('div', 'stick-base hidden', zone);
    const knob = el('div', 'stick-knob', base);
    let id: number | null = null;
    let ox = 0;
    let oy = 0;
    const R = () => base.getBoundingClientRect().width / 2;
    zone.addEventListener('pointerdown', (e) => {
      this.sound.unlock();
      id = e.pointerId;
      zone.setPointerCapture(id);
      const r = zone.getBoundingClientRect();
      ox = e.clientX;
      oy = e.clientY;
      base.style.left = `${e.clientX - r.left}px`;
      base.style.top = `${e.clientY - r.top}px`;
      base.classList.remove('hidden');
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const rad = R();
      let dx = e.clientX - ox;
      let dy = e.clientY - oy;
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
    const ev = el('div', 'btn-round small', btns, '証拠');
    ev.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.input.press('menu');
    });
    const act = el('div', 'btn-round shu', btns, '調べる');
    act.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.sound.unlock();
      this.input.press('confirm');
    });
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
    this.dlg.classList.remove('hidden', 'done');
    this.dlg.classList.toggle('narration', !name);
    this.dlgName.textContent = name ?? '';
    this.dlgName.style.background = color ?? '';
    this.dlgText.textContent = '';
    this.input.clearPressed();
    onTalk?.(true);
    await new Promise<void>((done) => {
      this.typing = { full: text, shown: 0, acc: 0, done };
    });
    onTalk?.(false);
    this.dlg.classList.add('done');
    await this.waitConfirm();
    this.sound.play('select');
  }

  hideDialogue(): void {
    this.dlg.classList.add('hidden');
  }

  async shout(word: string, color?: string): Promise<void> {
    const s = el('div', 'shout', this.root);
    const sp = el('div', 'splash', s);
    if (color) sp.style.background = color;
    el('div', 'word', s, escapeHtml(word));
    this.sound.play('shout');
    await new Promise((r) => setTimeout(r, 1100));
    s.remove();
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
    await this.waitConfirm();
    this.sound.play('confirm');
    c.remove();
  }

  fade(to: 0 | 1, seconds = 0.5): Promise<void> {
    this.fader.style.transition = `opacity ${seconds}s`;
    this.fader.style.opacity = String(to);
    return new Promise((r) => setTimeout(r, seconds * 1000));
  }

  async choose(options: string[]): Promise<number> {
    const box = el('div', 'choices', this.root);
    return new Promise((resolve) => {
      options.forEach((o, i) => {
        const b = el('div', 'btn', box, escapeHtml(o));
        b.addEventListener('click', () => {
          this.sound.play('confirm');
          box.remove();
          resolve(i);
        });
      });
    });
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
    await this.waitConfirm();
    this.sound.play('select');
    w.remove();
  }

  /**
   * アイテム一覧を開く。mode='present' なら選んだIDを返す（やめたら null）。
   */
  openBook(items: CardItem[], mode: 'view' | 'present', title = '証拠品ファイル'): Promise<string | null> {
    const wrap = el('div', 'book', this.root);
    const panel = el('div', 'panel washi', wrap);
    const h = el('h2', '', panel, `${escapeHtml(title)}<small>${mode === 'present' ? '示す証拠を選んでください' : ''}</small>`);
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
    row.style.cssText = 'display:flex;gap:2vw;justify-content:flex-end';
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
    if (this.bookKeys) {
      for (const a of ['left', 'right', 'cancel', 'menu', 'confirm'] as const) if (this.input.consume(a)) this.bookKeys?.(a);
      return;
    }
    if (this.typing) {
      const t = this.typing;
      if (this.input.consume('confirm')) t.shown = t.full.length;
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
