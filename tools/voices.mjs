/**
 * フルボイスの声を作る開発用ツール（Gemini TTS。CAST_VOICES で provider: 'elevenlabs' のキャラは ElevenLabs）。
 *
 * 準備:
 *   リポジトリ直下の .env に GEMINI_API_KEY=... と ELEVENLABS_API_KEY=... を書く（.env は Git に入らない）
 *   npm i --no-save @breezystack/lamejs   … MP3 に変換するため
 *
 * 使い方:
 *   node tools/voices.mjs list                  声を付けるセリフの数と、料金の目安
 *   node tools/voices.mjs design [名前...]      キャラの声を作る（作り直す）。試聴用の音声を voice-samples/ に書き出す
 *   node tools/voices.mjs design 名前 --pick N  ElevenLabs のキャラ：候補 N を保存してゲームで使う声にする
 *   node tools/voices.mjs generate [名前...]    セリフの声を作る。作っていない・文章や声が変わったセリフだけ作り直す
 *   node tools/voices.mjs generate --first      各キャラの最初のセリフだけ作る（声の確かめ用）
 *
 * 声のIDとセリフごとの印は tools/voices.json に残る（コミットする）。
 * 音声は public/assets/voice/<話のid>/<印>.mp3、どのセリフに声があるかは同じフォルダの index.json。
 * 印は既読と同じ ReadMarks.key(話し手の名前, 文章)。台本を直すと印が変わるので、generate で作り直される。
 */
import { createServer } from 'vite';
import fs from 'node:fs';
import { pitchShift } from './voice_audio.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'gemini-3.8-flash-tts';
const API = 'https://generativelanguage.googleapis.com/v1beta';
// ElevenLabs（CAST_VOICES の provider: 'elevenlabs' のキャラ）。.env に ELEVENLABS_API_KEY
const EL_API = 'https://api.elevenlabs.io';
const EL_MODEL = 'eleven_v4';
const EL_DESIGN_MODEL = 'eleven_ttv_v3';
const STATE_FILE = path.join(ROOT, 'tools/voices.json');
const SAMPLE_DIR = path.join(ROOT, 'voice-samples');

/**
 * キャラの声（変わらない特徴だけ。場面ごとの調子は STYLE で付ける）。ユーザーのイメージ（2026-10-02）から。
 * 2026-10-03 ユーザーの指示で全員 ElevenLabs に移した（説明文・話し方は英語のほうが効く）。
 * provider を外すと Gemini（gender・日本語の description/style、prebuilt、pitch＝後から上げる半音）に戻せる
 */
const CAST_VOICES = {
  ウィルナス: {
    provider: 'elevenlabs',
    // 雄々しく猛々しいが凛々しい。Gemini の1回目はかすれて怯えたように聞こえた（ユーザー所見）
    description:
      'A Japanese man in his thirties, native Japanese speaker. Bold, fierce and heroic yet dignified and noble voice. ' +
      'Deep, powerful and resonant with a strong core, full of confidence and command. A brave warrior who fears nothing. Clear, not raspy.',
    style: 'confident, bold, heroic',
  },
  // 子供の声は Google でも ElevenLabs でも安全ポリシーで作れない（2026-10-03 確認）。
  // ユーザーの了承のもと、アニメで子供役を演じる大人の声のように「幼く可愛い声の大人の女性」として作る（年齢を偽る言い換えはしない）
  ワムデュス: {
    provider: 'elevenlabs',
    description:
      'A Japanese woman in her early twenties, native Japanese speaker, with a very high-pitched, soft, sweet and cute youthful voice, ' +
      'in the style of an anime voice actress. Slightly lisping, clumsy pronunciation. Relaxed, sleepy, carefree, laid-back pace.',
    style: 'cute, sleepy, laid-back',
  },
  // 妖艶さと凛々しさのお姉さん。「からかうように」だと囁き声になった（ユーザー所見）ので、はっきりした声にする
  フェディエル: {
    provider: 'elevenlabs',
    description:
      'A Japanese woman in her late twenties, native Japanese speaker, a mature big-sister type. Calm, low, deep and mysterious voice ' +
      'with composure, elegance, dignity and strength. Speaks in an old-fashioned, slightly aristocratic manner. Clear and projected, not breathy or whispery.',
    style: 'dignified, confident, composed',
  },
  ガレヲン: {
    provider: 'elevenlabs',
    description:
      'A Japanese woman in her thirties, native Japanese speaker. Graceful, modest and calm, with a warm, soft, motherly voice that embraces everything. ' +
      'Speaks slowly, gently and politely.',
    style: 'gentle, calm, warm',
  },
  ルオー: {
    provider: 'elevenlabs',
    description:
      'A Japanese young man in his twenties, native Japanese speaker. Serious, stiff and rigid personality with a calm, clear and articulate voice. ' +
      'Intellectual, with a slightly arrogant, self-assured tone.',
    style: 'calm, firm, self-assured',
  },
};

/** 表情 → その行の話し方 */
const STYLE = {
  驚き: '驚いて、勢いよく声を張って',
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

/** ElevenLabs 用：話し方の指示 → 文頭に付ける音声タグ（英語のほうが効く） */
const STYLE_TAG = {
  [STYLE.驚き]: 'surprised',
  [STYLE.説明]: 'explaining calmly',
  [STYLE.考え]: 'thoughtful, slowly',
  [STYLE.得意]: 'proud, smug',
  [STYLE.よそ見]: 'evasive, playing dumb',
  [STYLE.困惑]: 'confused, hesitant',
  [STYLE.挑発]: 'teasing',
  [STYLE.構え]: 'tense, sharp',
  [STYLE.笑い]: 'laughing',
  [STYLE.指差し]: 'firm, assertive',
  [STYLE.怒り]: 'annoyed, pouting',
  [STYLE.笑み]: 'smiling, gentle',
  [STYLE.投げキッス]: 'sweet, playful',
  [STATEMENT_STYLE]: 'testifying clearly',
  [SHOUT_STYLE]: 'shouting',
};

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
  // 正しくは頭高。「ヲ」のままだと中高に聞こえた（2026-10-03 ユーザーが6案を聞いて「ガレオン」表記を選んだ）
  ['ガレヲン', 'ガレオン'],
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
function apiKey(name = 'GEMINI_API_KEY') {
  const env = fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '';
  const key = process.env[name] ?? env.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`, 'm'))?.[1];
  if (!key) throw new Error(`.env に ${name} がありません`);
  return key.replace(/^["']|["']$/g, '');
}

/** ElevenLabs の API。音声（バイナリ）が返るときは Buffer を返す */
async function elApi(method, url, body) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${EL_API}${url}`, {
      method,
      headers: { 'xi-api-key': apiKey('ELEVENLABS_API_KEY'), 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.ok) return (r.headers.get('content-type') ?? '').includes('json') ? r.json() : Buffer.from(await r.arrayBuffer());
    const err = await r.json().catch(() => ({}));
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${method} ${url} → ${r.status} ${JSON.stringify(err.detail ?? err).slice(0, 300)}`);
  }
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
    // 1日の回数の上限（Tier 1 は1日100回）は、待っても翌日まで戻らないので止める
    if (r.status === 429 && /per day/i.test(err.error?.message ?? '')) {
      throw Object.assign(new Error(`1日の回数の上限に達しました（${err.error.message}）`), { daily: true });
    }
    // 混雑・短い時間の回数制限は待ってやり直す
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

/**
 * ElevenLabs の声作り。説明文から候補を3つ作り voice-samples/<名前>_候補N.mp3 に書き出す（試聴文はそのキャラのセリフ）。
 * 聞いて選んだら design <名前> --pick N で保存し、ゲームで使う声にする
 */
async function designEleven(name, v, state, pick) {
  if (pick) {
    const generated = state.candidates?.[name]?.[pick - 1];
    if (!generated) throw new Error(`${name} の候補${pick}がありません（先に design ${name}）`);
    const old = state.voices[name]?.provider === 'elevenlabs' ? state.voices[name].id : null;
    const res = await elApi('POST', '/v1/text-to-voice', { voice_name: `six-dragon ${name}`, voice_description: v.description, generated_voice_id: generated });
    state.voices[name] = { provider: 'elevenlabs', id: res.voice_id, description: v.description };
    delete state.candidates[name];
    saveState(state);
    if (old && old !== res.voice_id) await elApi('DELETE', `/v1/voices/${old}`).catch((e) => console.warn(`古い声を消せませんでした（${e.message}）`));
    console.log(`${name}: 候補${pick}を保存 → ${res.voice_id}`);
    return;
  }
  // 試聴文は 100〜1000 文字。そのキャラのセリフをつなぐ
  let text = '';
  for (const l of (await collect()).filter((l) => l.speaker === name)) {
    if (text.length >= 150) break;
    text += ttsText(l.text);
  }
  const res = await elApi('POST', '/v1/text-to-voice/design?output_format=mp3_44100_128', { voice_description: v.description, model_id: EL_DESIGN_MODEL, text });
  state.candidates = { ...state.candidates, [name]: res.previews.map((p) => p.generated_voice_id) };
  saveState(state);
  res.previews.forEach((p, i) => fs.writeFileSync(path.join(SAMPLE_DIR, `${name}_候補${i + 1}.mp3`), Buffer.from(p.audio_base_64, 'base64')));
  console.log(`${name}: 候補 ${res.previews.length} つ（試聴: voice-samples/${name}_候補N.mp3、決めたら design ${name} --pick N）`);
}

async function design(args) {
  const state = loadState();
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  const pickAt = args.indexOf('--pick');
  const pick = pickAt >= 0 ? Number(args[pickAt + 1]) : 0;
  const names = pickAt >= 0 ? args.filter((a, i) => i !== pickAt && i !== pickAt + 1) : args;
  for (const name of names.length ? names : Object.keys(CAST_VOICES)) {
    const v = CAST_VOICES[name];
    if (!v) throw new Error(`知らない名前: ${name}`);
    if (v.provider === 'elevenlabs') {
      await designEleven(name, v, state, pick);
      continue;
    }
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
  const providerOf = (n) => CAST_VOICES[n].provider ?? 'gemini';
  const missing = [...new Set(lines.map((l) => l.speaker))].filter((n) => !state.voices[n] || (state.voices[n].provider ?? 'gemini') !== providerOf(n));
  if (missing.length) throw new Error(`声がまだありません: ${missing.join('、')}（先に design）`);

  const sigOf = (l) => {
    const v = CAST_VOICES[l.speaker];
    const model = providerOf(l.speaker) === 'elevenlabs' ? EL_MODEL : MODEL;
    return fnv([model, state.voices[l.speaker].id, v.style, v.pitch ?? 0, l.style ?? '', ttsText(l.text)].join('|'));
  };
  const fileOf = (l) => path.join(ROOT, 'public/assets/voice', l.episode, `${l.key}.mp3`);
  const todo = lines.filter((l) => state.lines[l.key] !== sigOf(l) || !fs.existsSync(fileOf(l)));
  console.log(`作る: ${todo.length} 行 / ${lines.length} 行`);

  let done = 0;
  let failed = 0;
  // ElevenLabs：話し方は文頭の音声タグで付ける。16bit・24kHz の生の音で受け取る
  const speakEleven = async (l) => {
    const tags = [CAST_VOICES[l.speaker].style, STYLE_TAG[l.style]].filter(Boolean).join(', ');
    const buf = await elApi('POST', `/v1/text-to-speech/${state.voices[l.speaker].id}?output_format=pcm_24000`, {
      text: `[${tags}] ${ttsText(l.text)}`,
      model_id: EL_MODEL,
    });
    return { rate: 24000, pcm: new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + (buf.length & ~1))) };
  };
  const speakGemini = async (l) => {
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
    return readWav(Buffer.from(audio.data, 'base64'));
  };
  const work = async (l) => {
    const { rate, pcm } = await (providerOf(l.speaker) === 'elevenlabs' ? speakEleven(l) : speakGemini(l));
    const mp3 = await toMp3(pitchShift(trimSilence(pcm, rate), rate, CAST_VOICES[l.speaker].pitch ?? 0), rate);
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
          // 1日の上限なら残りも作れないので、ここまでで終える（作れた分は残る）
          if (e.daily) {
            failed += queue.length;
            queue.length = 0;
          }
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
