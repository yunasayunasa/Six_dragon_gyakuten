/**
 * PV を撮る（1920×1080・60fps・H.264＋AAC の mp4）。
 *
 * 準備（どれも --no-save。package.json は変えない）:
 *   npm i --no-save playwright-core ffmpeg-static
 *   node tools/pv_narration.mjs --check      … ナレーション（pv/narration/）
 *
 * 使い方:
 *   node tools/pv_record.mjs [出力.mp4]                    本番（既定: ../PV_逆転六竜_第一話.mp4）
 *   node tools/pv_record.mjs --sheet 0.5 [--from 10 --to 30] 確認用に、0.5秒ごとの静止画を voice-samples/pv/sheet/ に書き出す
 *
 * しくみ: ブラウザ（Edge）の時計を止めて開き、1コマ分（1/60秒）ずつ時計を進めてはゲームを1回描き、画面を写す。
 * 重い場面でもコマ落ちしない。音は撮影中に「いつ何を鳴らしたか」を記録し、最後にまとめて書き出す（src/pv/audio.ts）。
 */
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const sheet = args.includes('--sheet') ? Number(opt('--sheet', '0.5')) : 0;
const from = Number(opt('--from', '0'));
const to = Number(opt('--to', '1e9'));
const out = path.resolve(args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? path.join(ROOT, '..', 'PV_逆転六竜_第一話.mp4'));
const FPS = 60;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const { chromium } = await import('playwright-core');
const ffmpeg = (await import('ffmpeg-static')).default;
const tmp = path.join(ROOT, 'voice-samples', 'pv');
fs.mkdirSync(tmp, { recursive: true });

const server = await createServer({ root: ROOT, server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: EDGE, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const started = Date.now();
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log(`  [ブラウザ] ${m.text().slice(0, 300)}`));
  page.on('pageerror', (e) => console.log(`  [ページのエラー] ${e.message}`));
  await page.clock.install({ time: 0 });
  await page.goto('http://localhost:5199/pv/');
  // 読み込み（画像・声の取得は実時間で進むので、時計を少しずつ進めながら待つ）
  for (let i = 0; ; i++) {
    await page.clock.runFor(50);
    const st = await page.evaluate(() => window.__pv?.state ?? null);
    if (st?.error) throw new Error(st.error);
    if (st?.ready) break;
    if (i > 2400) throw new Error('読み込みが終わりません');
    await new Promise((r) => setTimeout(r, 25));
  }
  const duration = await page.evaluate(() => window.__pv.duration);
  const frames = Math.ceil(duration * FPS);
  console.log(`撮影: ${duration}秒 ${frames}コマ${sheet ? `（確認用: ${sheet}秒ごと ${from}〜${Math.min(to, duration)}秒）` : ''}`);

  let enc = null;
  const videoTmp = path.join(tmp, 'video.mp4');
  if (!sheet) {
    enc = spawn(ffmpeg, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), videoTmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  }
  const sheetDir = path.join(tmp, 'sheet');
  if (sheet) {
    fs.rmSync(sheetDir, { recursive: true, force: true });
    fs.mkdirSync(sheetDir, { recursive: true });
  }
  // ここから時計を止め、1コマ分ずつだけ進める（install だけだと実時間でも少しずつ進む）
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
  await page.evaluate(() => window.__pv.start());
  let prevMs = 0;
  let nextSheet = from;
  for (let i = 0; i < frames; i++) {
    const ms = Math.round(((i + 1) * 1000) / FPS);
    await page.clock.runFor(ms - prevMs);
    prevMs = ms;
    const t = await page.evaluate(() => window.__pv.step());
    if (i % 600 === 0) {
      const st = await page.evaluate(() => window.__pv.state);
      if (st.error) throw new Error(st.error);
      console.log(`  ${t.toFixed(1)}秒 / ${duration}（${((Date.now() - started) / 1000).toFixed(0)}秒経過）`);
    }
    if (sheet) {
      if (t > to) break;
      if (t + 1e-6 >= nextSheet) {
        await page.screenshot({ path: path.join(sheetDir, `t${t.toFixed(2).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 80 });
        nextSheet += sheet;
      }
      continue;
    }
    const jpg = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once('drain', r));
  }
  const st = await page.evaluate(() => window.__pv.state);
  if (st.error) throw new Error(st.error);
  if (sheet) {
    console.log(`確認用の静止画: ${sheetDir}`);
  } else {
    enc.stdin.end();
    await new Promise((r, j) => enc.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`)))));
    console.log('音をまとめています…');
    const wav = await page.evaluate(() => window.__pv.mixdown());
    const wavPath = path.join(tmp, 'audio.wav');
    fs.writeFileSync(wavPath, Buffer.from(wav, 'base64'));
    await new Promise((r, j) => {
      const p = spawn(ffmpeg, ['-v', 'error', '-y', '-i', videoTmp, '-i', wavPath, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
      p.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`))));
    });
    // 共有用の軽い版（30fps・少し強めの圧縮）。Discord などに貼りやすい大きさにする
    const light = out.replace(/.mp4$/, '_軽量版.mp4');
    await new Promise((r, j) => {
      const p = spawn(ffmpeg, ['-v', 'error', '-y', '-i', out, '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', light], { stdio: 'inherit' });
      p.on('close', (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`))));
    });
    const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(0);
    console.log(`できた: ${out}（${mb(out)}MB）／ 軽量版 ${light}（${mb(light)}MB）（${((Date.now() - started) / 60000).toFixed(1)}分）`);
  }
} finally {
  await browser.close();
  await server.close();
}
