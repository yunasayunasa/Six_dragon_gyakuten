/**
 * フルボイスの声を作る開発用ツール（Gemini TTS）。
 *
 * 準備:
 *   リポジトリ直下の .env に GEMINI_API_KEY=... を書く（.env は Git に入らない）
 *   npm i --no-save @breezystack/lamejs   … MP3 に変換するため
 *
 * 使い方:
 *   node tools/voices.mjs list                  声を付けるセリフの数と、料金の目安
 *   node tools/voices.mjs design [名前...]      キャラの声を作る（作り直す）。試聴用の音声を voice-samples/ に書き出す
 *   node tools/voices.mjs generate [名前...]    セリフの声を作る。作っていない・文章や声が変わったセリフだけ作り直す
 *   node tools/voices.mjs generate --first      各キャラの最初のセリフだけ作る（声の確かめ用）
 *
 * 声のIDとセリフごとの印は tools/voices.json に残る（コミットする）。
 * 音声は public/assets/voice/<話のid>/<印>.mp3、どのセリフに声があるかは同じフォルダの index.json。
 * 印は既読と同じ ReadMarks.key(話し手の名前, 文章)。台本を直すと印が変わるので、generate で作り直される。
 */
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'gemini-3.8-flash-tts';
const API = 'https://generativelanguage.googleapis.com/v1beta';
const STATE_FILE = path.join(ROOT, 'tools/voices.json');
const SAMPLE_DIR = path.join(ROOT, 'voice-samples');

/** キャラの声（変わらない特徴だけ。場面ごとの調子は STYLE で付ける）。ユーザーのイメージ（2026-10-02）から */
const CAST_VOICES = {
  ウィルナス: {
    gender: 'male',
    description: '30代くらいの成人男性。雄々しく猛々しい、張りのある太く力強い声。それでいて凛々しく、品のある響きもある。豪放磊落な武人。',
    style: '堂々と、張りのある声で',
  },
  // 子供の声は Google の安全ポリシーで作れない（2026-10-02 確認）ため、用意された若々しい声に話し方の指示を付ける
  ワムデュス: {
    prebuilt: 'Leda',
    style: '子供っぽく、舌っ足らずで可愛らしく、のんびりマイペースに',
  },
  フェディエル: {
    gender: 'female',
    description: '大人の女性、お姉さん。落ち着いた低めの、深みのあるミステリアスな声。大人の余裕と、凛とした気品と強さがある。古風で少し高貴な話し方。',
    style: '大人の余裕たっぷりに、少しからかうように',
  },
  ガレヲン: {
    gender: 'female',
    description: '大人の女性。お淑やかで穏やか、全てを包み込む母のような、温かく柔らかい声。ゆったりと丁寧に話す。',
    style: '穏やかに、ゆったりと',
  },
  ルオー: {
    gender: 'male',
    description: '20代の青年。真面目で堅物な、落ち着いた明瞭な声。理知的で、少し尊大な響きがある。',
    style: '落ち着いて、きっぱりと',
  },
};

/** 表情 → その行の話し方 */
const STYLE = {
  驚き: '驚いて、声を上げて',
  説明: '落ち着いて、分かりやすく説明するように',
  考え: '考え込みながら、ゆっくりと',
  得意: '得意げに',
  よそ見: '目をそらして、少しとぼけた調子で',
  困惑: '困って、戸惑いながら',
  挑発: '挑発するように、余裕たっぷりに',
  構え: '身構えて、鋭く',
  笑い: '楽しそうに笑いながら',
  指差し: '相手を指差して、力強く言い切るように',
  怒り: '怒って、語気を強めて',
  笑み: '微笑みながら、柔らかく',
  微笑み: '微笑みながら、柔らかく',
  投げキッス: '甘い調子で、茶目っ気たっぷりに',
};
const STATEMENT_STYLE = '証言するように、はっきりと';
const SHOUT_STYLE = '腹の底から、力強く叫ぶ';

/** 読み間違えやすい言葉（声のための読みだけ。画面の文字は変わらない）。要確認のものもある */
const READINGS = [
  ['凪ノ桟橋', 'なぎのさんばし'],
  ['灯台柱', 'とうだいばしら'],
  ['雲蜜', 'くもみつ'],
  ['灯晶', 'とうしょう'],
  ['空魚', 'そらうお'],
  ['此方', 'こなた'],
  ['其方', 'そなた'],
  ['鼎', 'かなえ'],
];

/** 画面の文章 → 読み上げる文章 */
function ttsText(text) {
  let t = text.replace(/\n/g, '');
  // ガレヲンの「熟語（言い足し）」は、熟語のあとに一拍おいて続ける
  t = t.replace(/([^\s（「」]+)（([^）]+)）/g, '$1。$2');
  for (const [w, r] of READINGS) t = t.split(w).join(r);
  return t;
}

// ---------- 共通 ----------
function apiKey() {
  const env = fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '';
  const key = process.env.GEMINI_API_KEY ?? env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m)?.[1];
  if (!key) throw new Error('.env に GEMINI_API_KEY がありません');
  return key.replace(/^["']|["']$/g, '');
}

async function api(method, url, body) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${API}${url}`, {
      method,
      headers: { 'x-goog-api-key': apiKey(), 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.ok) return r.status === 204 ? {} : r.json();
    const err = await r.json().catch(() => ({}));
    // 混雑・回数制限は待ってやり直す
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${method} ${url} → ${r.status} ${err.error?.message ?? ''}`);
  }
}

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function loadState() {
  return fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { model: MODEL, voices: {}, lines: {} };
}
function saveState(s) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(s, null, 2)}\n`);
}

/** WAV（RIFF）から 16bit の音の並びを取り出す */
function readWav(buf) {
  let p = 12;
  let rate = 24000;
  while (p + 8 <= buf.length) {
    const id = buf.toString('latin1', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') rate = buf.readUInt32LE(p + 12);
    if (id === 'data') {
      const end = Math.min(buf.length, p + 8 + size);
      const data = buf.subarray(p + 8, end);
      return { rate, pcm: new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + (data.length & ~1))) };
    }
    p += 8 + size + (size & 1);
  }
  throw new Error('WAV の data が見つかりません');
}

/** 前後の無音を詰める（タップしてすぐ声が出るように）。少しだけ余白を残す */
function trimSilence(pcm, rate) {
  const th = 400;
  let a = 0;
  let b = pcm.length - 1;
  while (a < b && Math.abs(pcm[a]) < th) a++;
  while (b > a && Math.abs(pcm[b]) < th) b--;
  const pad = Math.round(rate * 0.05);
  return pcm.subarray(Math.max(0, a - pad), Math.min(pcm.length, b + pad));
}

async function toMp3(pcm, rate) {
  let lame;
  try {
    lame = await import('@breezystack/lamejs');
  } catch {
    throw new Error('MP3 変換に @breezystack/lamejs が要ります: npm i --no-save @breezystack/lamejs');
  }
  const enc = new lame.Mp3Encoder(1, rate, 56);
  const out = [];
  for (let i = 0; i < pcm.length; i += 1152) out.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)));
  out.push(enc.flush());
  return Buffer.concat(out.map((b) => Buffer.from(b.buffer, b.byteOffset, b.length)));
}

// ---------- セリフを集める ----------
async function collect() {
  const server = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  const { EPISODES } = await server.ssrLoadModule('/src/game/episodes.ts');
  const { parseScript } = await server.ssrLoadModule('/src/engine/script/parser.ts');
  const { ReadMarks } = await server.ssrLoadModule('/src/engine/core/ReadMarks.ts');
  const episodes = [];
  for (const ep of EPISODES) if (ep.load) episodes.push(await ep.load());
  await server.close();

  const out = [];
  for (const d of episodes) {
    const nameOf = (s) => d.cast.find((c) => c.name === s || c.id === s)?.name ?? s;
    const player = nameOf(d.player);
    const lines = new Map();
    const add = (speaker, text, style) => {
      if (!speaker || !CAST_VOICES[speaker]) return;
      const key = ReadMarks.key(speaker, text);
      if (!lines.has(key)) lines.set(key, { episode: d.id, key, speaker, text, style });
    };
    const addScript = (src) => {
      if (!src) return;
      for (const c of parseScript(src)) {
        if (c.op === 'say' && c.speaker) add(nameOf(c.speaker), c.text, STYLE[c.expr] ?? null);
        if (c.op === 'cmd' && c.name === 'shout') add(player, c.args.join(' '), SHOUT_STYLE);
      }
    };
    addScript(d.intro);
    for (const h of d.hotspots) {
      addScript(h.script);
      addScript(h.again);
      for (const v of h.variants ?? []) {
        addScript(v.script);
        addScript(v.again);
      }
    }
    d.logic.pairs.forEach((p) => addScript(p.script));
    addScript(d.logic.miss);
    addScript(d.logic.done);
    for (const c of Object.values(d.confrontations)) {
      addScript(c.intro);
      for (const s of c.statements) {
        add(nameOf(c.witness), s.text, STATEMENT_STYLE);
        addScript(s.press);
      }
      addScript(c.success);
      addScript(c.wrong);
      c.hints?.forEach(addScript);
      addScript(c.fail);
    }
    addScript(d.ending);
    // 尋問の叫び（InvestigationGame と同じ既定値）
    add(player, d.shouts?.press ?? '待った！', SHOUT_STYLE);
    add(player, d.shouts?.present ?? 'これを見ろ！', SHOUT_STYLE);
    out.push(...lines.values());
  }
  return out;
}

// ---------- 命令 ----------
async function list() {
  const lines = await collect();
  const by = {};
  let chars = 0;
  for (const l of lines) {
    by[l.speaker] = (by[l.speaker] ?? 0) + 1;
    chars += ttsText(l.text).length;
  }
  // 日本語はおよそ1秒7文字、音声は1秒25トークン、1Mトークン9ドル（2026年末まで）
  const sec = chars / 7;
  console.log(`セリフ ${lines.length} 行（${chars} 文字、音声およそ ${(sec / 60).toFixed(0)} 分）`, by);
  console.log(`料金の目安: 約 ${((sec * 25 * 9) / 1e6).toFixed(2)} ドル（全部作り直した場合）`);
}

async function design(names) {
  const state = loadState();
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  for (const name of names.length ? names : Object.keys(CAST_VOICES)) {
    const v = CAST_VOICES[name];
    if (!v) throw new Error(`知らない名前: ${name}`);
    if (v.prebuilt) {
      state.voices[name] = { id: v.prebuilt, prebuilt: true };
      saveState(state);
      console.log(`${name}: 用意された声 ${v.prebuilt} を使う`);
      continue;
    }
    const old = state.voices[name]?.id;
    const res = await api('POST', '/voices', {
      store: true,
      voice: { model: MODEL, type: 'prompted', display_name: `six-dragon ${name}`, gender: v.gender, language_code: 'ja-JP', prompted: { input: v.description } },
    });
    state.voices[name] = { id: res.id, description: v.description, gender: v.gender };
    saveState(state);
    if (res.sample_audio?.data) fs.writeFileSync(path.join(SAMPLE_DIR, `${name}.wav`), Buffer.from(res.sample_audio.data, 'base64'));
    if (old && old !== res.id) await api('DELETE', `/voices/${old}`).catch((e) => console.warn(`古い声を消せませんでした（${e.message}）`));
    console.log(`${name}: ${res.id}（試聴: voice-samples/${name}.wav）`);
  }
}

async function generate(names) {
  const state = loadState();
  // --first … 各キャラの最初のセリフ（遊ぶ順で最初に出る1行）だけ作る。声の確かめ用
  const first = names.includes('--first');
  names = names.filter((n) => n !== '--first');
  const all = await collect();
  let lines = all.filter((l) => !names.length || names.includes(l.speaker));
  if (first) {
    lines = lines.filter((l, i) => lines.findIndex((x) => x.speaker === l.speaker) === i);
    for (const l of lines) console.log(`  ${l.speaker}（${l.key}）「${l.text.replace(/\n/g, '')}」`);
  }
  const missing = [...new Set(lines.map((l) => l.speaker))].filter((n) => !state.voices[n]);
  if (missing.length) throw new Error(`声がまだありません: ${missing.join('、')}（先に design）`);

  const sigOf = (l) => fnv([MODEL, state.voices[l.speaker].id, CAST_VOICES[l.speaker].style, l.style ?? '', ttsText(l.text)].join('|'));
  const fileOf = (l) => path.join(ROOT, 'public/assets/voice', l.episode, `${l.key}.mp3`);
  const todo = lines.filter((l) => state.lines[l.key] !== sigOf(l) || !fs.existsSync(fileOf(l)));
  console.log(`作る: ${todo.length} 行 / ${lines.length} 行`);

  let done = 0;
  let failed = 0;
  const work = async (l) => {
    const style = [CAST_VOICES[l.speaker].style, l.style].filter(Boolean).join('。');
    const res = await api('POST', '/interactions', {
      model: MODEL,
      store: false,
      input: [{ type: 'user_input', content: [{ type: 'text', text: ttsText(l.text), annotations: [{ type: 'speech_metadata', style }] }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: state.voices[l.speaker].id }] },
    });
    const audio = res.steps?.flatMap((s) => s.content ?? []).find((c) => c.type === 'audio' && c.data);
    if (!audio) throw new Error('音声が返ってきませんでした');
    const { rate, pcm } = readWav(Buffer.from(audio.data, 'base64'));
    const mp3 = await toMp3(trimSilence(pcm, rate), rate);
    fs.mkdirSync(path.dirname(fileOf(l)), { recursive: true });
    fs.writeFileSync(fileOf(l), mp3);
    state.lines[l.key] = sigOf(l);
  };
  // 3本ずつ並べて作る
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let l; (l = queue.shift()); ) {
        try {
          await work(l);
          done++;
          if (done % 10 === 0) {
            saveState(state);
            console.log(`  ${done} / ${todo.length}`);
          }
        } catch (e) {
          failed++;
          console.error(`失敗: ${l.speaker}「${l.text.slice(0, 20)}」 ${e.message}`);
        }
      }
    }),
  );

  // 台本から消えたセリフの声を片付け、どのセリフに声があるかを書き出す
  const live = new Set(all.map((l) => l.key));
  for (const k of Object.keys(state.lines)) if (!live.has(k)) delete state.lines[k];
  saveState(state);
  for (const ep of new Set(all.map((l) => l.episode))) {
    const dir = path.join(ROOT, 'public/assets/voice', ep);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.mp3') && !live.has(f.slice(0, -4))) fs.rmSync(path.join(dir, f));
    const keys = all.filter((l) => l.episode === ep && fs.existsSync(fileOf(l))).map((l) => l.key).sort();
    fs.writeFileSync(path.join(dir, 'index.json'), `${JSON.stringify({ keys })}\n`);
  }
  console.log(`できた: ${done} 行${failed ? `、失敗: ${failed} 行（もう一度 generate すると失敗分だけ作り直す）` : ''}`);
  if (failed) process.exitCode = 1;
}

const [cmd, ...args] = process.argv.slice(2);
const run = { list, design, generate }[cmd];
if (!run) {
  console.log('使い方: node tools/voices.mjs list | design [名前...] | generate [名前...]');
  process.exit(1);
}
await run(args);
