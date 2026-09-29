import './engine/ui/ui.css';
import { Engine } from './engine';
import { InvestigationGame } from './genres/investigation/InvestigationGame';
import { CASE01 } from './game/case01/case';

async function boot(): Promise<void> {
  const loading = document.getElementById('loading')!;
  const bar = loading.querySelector('i')!;
  bar.style.width = '15%';
  const engine = new Engine(document.getElementById('app')!);
  const game = new InvestigationGame(CASE01);
  // 自動テスト・実機確認用（本番の遊びには影響しない）
  (window as unknown as { __paper: unknown }).__paper = { engine, game };
  engine.start();
  bar.style.width = '40%';
  await engine.setMode(game);
  bar.style.width = '100%';
  await document.fonts?.ready;
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 600);
  // 最初のタップで音を有効にする（スマホの制約）
  const unlock = () => {
    engine.sound.unlock();
    if (engine.sound.muted) {
      engine.sound.setMuted(false);
      engine.hud.syncSoundLabel();
    }
    engine.sound.playBgm(engine.assets.url('audio/bgm_harbor.mp3'));
    removeEventListener('pointerdown', unlock);
    removeEventListener('keydown', unlock);
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  await game.start();
}

boot().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  if (l) l.innerHTML = `<div style="font-family:sans-serif;font-size:14px;padding:20px;max-width:90vw">読み込みに失敗しました<br><pre style="white-space:pre-wrap">${String(e?.stack ?? e)}</pre></div>`;
});
