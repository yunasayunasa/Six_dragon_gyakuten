/**
 * PV の撮影用ページ（開発サーバーの /pv/ でだけ開く。公開するゲームには入らない）。
 * tools/pv_record.mjs が時計を止めた状態で開き、step() で1コマずつ進めて写す。
 */
import '../engine/ui/ui.css';
import './pv.css';
import { Engine } from '../engine';
import { InvestigationGame } from '../genres/investigation/InvestigationGame';
import { CASE01 } from '../game/case01/case';
import type { CastManifest } from '../engine/paper/PaperActor';
import { measure, mixdown, recordSound } from './audio';
import { DURATION, MUSIC, runPV, voiceList, type PVContext } from './scenes';
import { clock, filmLayer, initOverlay, syncAnimations, tick } from './timeline';
import type { CardPose } from './mg';

async function boot() {
  const engine = new Engine(document.getElementById('app')!, { namespace: 'pv' });
  recordSound(engine);
  await document.fonts.load('100px "Yuji Syuku"');
  await document.fonts.load('800 50px "Shippori Mincho B1"');
  await document.fonts.load('700 40px "Zen Maru Gothic"');
  await document.fonts.ready;
  const game = new InvestigationGame(CASE01, {});
  await engine.setMode(game);
  await engine.warmUp();
  initOverlay(document.getElementById('pv')!);
  filmLayer();
  engine.onFrame.add((dt) => tick(dt));

  const manifest = await engine.assets.getJSON<CastManifest>('cast/manifest.json');
  const facing = (poseId: string) => CASE01.cast.find((c) => poseId.startsWith(c.id === 'luwoh' ? 'luwoh' : c.id))?.artFacing ?? 1;
  const ctx: PVContext = {
    engine,
    game,
    director: (game as unknown as { director: PVContext['director'] }).director,
    narrUrl: (id) => `/pv/narration/${id}.mp3`,
    voiceUrl: (name, text) => {
      const u = engine.voices.url(name, text);
      if (!u) throw new Error(`声がありません: ${name}「${text}」`);
      return u;
    },
    pose: (id): CardPose => {
      const info = manifest[id];
      const url = (f: string) => engine.assets.url(`cast/${id}/${f}`);
      const part = (k: keyof typeof info.parts) => (info.parts[k] ? { ...info.parts[k]!, url: url(info.parts[k]!.file) } : undefined);
      return {
        base: url('base.webp'),
        width: info.width,
        height: info.height,
        artFacing: facing(id),
        eyes: part('eye_open'),
        mouth: { open: part('mouth_open'), half: part('mouth_half'), closed: part('mouth_closed') },
      };
    },
  };
  MUSIC.url = engine.assets.url('audio/fanfare.mp3');
  await measure(voiceList(ctx));
  // 立ち絵の画像を先に読み込んでおく（出た瞬間に白く抜けないように）
  await Promise.all(
    ['ui/title_logo.webp', 'ui/cover_case01.webp', 'props/evidence_honey_puddle.webp', ...Object.keys(manifest).flatMap((id) => [`cast/${id}/base.webp`])].map(
      (p) =>
        new Promise<void>((ok) => {
          const i = new Image();
          i.onload = i.onerror = () => ok();
          i.src = engine.assets.url(p);
        }),
    ),
  );

  const eng = engine as unknown as { frame(now: number): void; last: number };
  const state = { ready: true, done: false, error: '' };
  (window as unknown as { __pv: unknown }).__pv = {
    state,
    engine,
    game,
    duration: DURATION,
    get t() {
      return clock.t;
    },
    start() {
      eng.last = performance.now();
      runPV(ctx)
        .then(() => (state.done = true))
        .catch((e) => {
          console.error(e);
          state.error = String(e?.stack ?? e);
        });
    },
    /** 1コマ進める（時計はこの前に呼び出し側が進めておく） */
    step() {
      eng.frame(performance.now());
      syncAnimations();
      return clock.t;
    },
    mixdown: () => mixdown(DURATION, MUSIC, engine.assets.url('audio/se_paper_rise.mp3')),
  };
}
boot().catch((e) => {
  console.error(e);
  (window as unknown as { __pv: unknown }).__pv = { state: { ready: false, error: String(e?.stack ?? e) } };
});
