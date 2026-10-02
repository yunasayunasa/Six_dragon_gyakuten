# 素材

ゲームで使う素材は `public/assets/` にあり、`tools/prepare_assets.py` で作ります（元ファイルは変更しません）。

| 出力 | 元素材（コウセイ/総合アセット） | 処理 |
|---|---|---|
| `cast/<ポーズ>/base.webp` ほか目口パーツ | `ADV_目口パーツ_20ポーズ_修正版` | 透明余白を切り詰め、72%に縮小、紙の白フチを焼き込み。`manifest.json` に立ち位置（中央・足元）とパーツ位置を記録 |
| `props/*.webp` | `Billboard_Assets_55` / `Cross_Plane_Priority12` / `HD2D_Decals_Priority18` | 切り詰め・縮小・白フチ |
| `stage/cloudsea.webp` | `Billboard_Assets_55/54_window_outside_cloudsea.png` | 空の帯を切り出し（色は実行時にLookで夕景・対決色へ変える） |
| `stage/wood.webp` | GitHub `main` の `assets/ground/wood.png` | 縮小、彩度を下げて明るく |
| `audio/bgm_harbor.mp3` | `音声/stage_bgm1.mp3` | 112kbpsへ再圧縮 |

```sh
python tools/prepare_assets.py <素材を展開したフォルダ> public/assets <wood.pngのあるフォルダ>
```

追加の立ち絵（攻撃3コマ・被弾・ガレヲンの微笑み／投げキッスなど、`ADV_attack_damage_galleon_additions.zip`）は、
Python が無い環境でも動く Node 版で変換しています（処理内容は上と同じ。`manifest.json` に追記）。

```sh
npm i --no-save sharp
node tools/prepare_poses.mjs <追加素材を展開したフォルダ> public/assets
```

- 攻撃・被弾の絵はすべて画面右向き。足元は `motion_layout.json` の `ground_y` にそろえる
- ガレヲンはいつも目を閉じたキャラなので、目のパーツ（まばたき）は無い

## 第一話の専用素材（2026-10-02、Codex の画像生成で制作）

素材リスト（Google スプレッドシート「第一話 素材リスト」）の絵は、Codex（gpt-6-astra の画像生成）で作り、`tools/prepare_props.mjs` で変換しています。
元の PNG と依頼文は `コウセイ\asset-work\case01-materials\`（`PROMPT.md` / `out/` / `out/REPORT.md`）にあります（リポジトリ外）。

| 出力 | 使いどころ | 変換 |
|---|---|---|
| `props/evidence_*.webp`（map・wrapper・footprints・ribbon・honey_puddle） | 証拠品の絵 | 長辺512（見取り図は640）・白フチ |
| `props/lighthouse_pillar.webp` | 灯台柱（`billboard: 'y'`。台座の上面が灯晶の高さ 2.16 に来る大きさ 2.3） | 長辺1024・白フチ |
| `props/notice_board.webp` ＋ `evidence_map.webp` | 無地の掲示板に見取り図を重ねて貼る | 白フチ |
| `props/fediel_table.webp` / `rope_ribbon.webp` / `fishing_gear.webp` | フェディエルの台・リボンの引っかかった係留ロープ・釣り道具 | 白フチ（ロープは `--despeckle`） |
| `props/footprints_trail.webp` | 床に寝かせる濡れた足跡（2枚つなぎ） | `--no-edge` |
| `stage/cloudsea_sunset.webp` / `stage/pier_planks.webp` | 背景の夕焼けの雲海・床板 | `--plain`（床板は彩度0.55・明るさ1.18） |
| `ui/title_logo.webp` / `ui/cover_case01.webp` | ホーム画面のロゴ・第一話の扉絵 | ロゴは白フチ、扉絵は `--plain` |
| `public/icon-512.png` / `icon-180.png` | ホーム画面に追加したときのアイコン | `--plain` |

```sh
node tools/prepare_props.mjs <元PNG> public/assets/props/<名前>.webp --max 768
```

前の `stage/cloudsea.webp`・`stage/wood.webp` と流用していた小物の絵は、第二話以降で使えるよう残しています。

効果音は素材ファイルを使わず、WebAudioで合成しています（`src/engine/audio/Sound.ts`）。
立ち絵はAI生成の差分のため、手指や装飾の細部はポーズ間で完全には一致しません。

## 声（フルボイス）

セリフの声は Gemini TTS で作っています（`tools/voices.mjs`。APIキーは `.env` の `GEMINI_API_KEY`）。

```sh
npm i --no-save @breezystack/lamejs
node tools/voices.mjs list                 # セリフ数と料金の目安
node tools/voices.mjs design [名前...]     # キャラの声を作る（作り直す）
node tools/voices.mjs generate [名前...]   # 作っていない・変わったセリフだけ声を作る
```

- 出力は `public/assets/voice/<話のid>/`（MP3 と、声のあるセリフの一覧 `index.json`）
- 台本のセリフを直したら `generate` を実行する（直した行だけ作り直す。消えた行の声は片付ける）
- 声の説明・行ごとの話し方・読み方の辞書はツールの冒頭（`CAST_VOICES` / `STYLE` / `READINGS`）
