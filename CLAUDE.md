# PaperStage — 作業の引き継ぎメモ（AIエージェント向け）

このファイルは、別のセッション（Claude Code など）がこの作業を続けるためのメモです。

## ユーザーと進め方
- ユーザーは非プログラマーで、AIに実装を任せ、画面（スマホ実機）で確認する。説明は日本語・平易に。
- 確認はスマホ（iPhone Safari・横画面）でURLを開くのが一番楽。GitHub Pages で公開して確認してもらう。
- 不確かなことは「分からない」「未確認」と正直に言う。根拠なく意見を変えない。
- 作業フォルダ（PC）: デスクトップの「コウセイ」フォルダ。リポジトリは `コウセイ\Six_dragon_gyakuten`。

## 目指す表現（ユーザーの定義）
- **HD2D** = 3D空間に2Dキャラを据え、深い被写界深度・ポストプロセッシング・3Dのパーティクル/エフェクトなどリッチな表現を取り入れた表現技法そのもの。ドット絵は必須ではない。
- このエンジンは「ペーパーマリオのように3D空間に2Dキャラが生きている感じ」＋上記HD2Dのミックス。
- 参考: 『絵巻奇譚』（Claude×Godot製）の動画。白フチの切り抜き、舞台的な奥行き、夕景の暖色、和紙と墨のUI、会話→バトル→探索を同じ舞台で行き来。
- 逆転裁判風・逆転検事風・墨絵アクション・シューティングなど多ジャンルを作る予定。

## 決定事項
- 既存の Six_dragon_gyakuten（main=Godot版、threejs-ab=旧Three版）は**参考にしない**。新規エンジンを空ブランチ `paper-stage` で開発。
- 技術: Three.js 0.186.1 + TypeScript + Vite 8（バージョン固定）。
- 最初のジャンル: 逆転検事風（捜査→ロジック→対決）。
- GitHub Pages は `paper-stage` から公開してよい（旧 threejs-ab のサイトは置き換えでOK）。URL: https://yunasayunasa.github.io/Six_dragon_gyakuten/
- 素材: `コウセイ\総合アセット` と GitHub 上の素材を使ってよい。キャラ・名前・ロゴなど他社作品（逆転裁判のCapcom等）に似せない。
- 台本はテスト用なのでAIに任せてよい。画質・動作目標は「iPhone Safari 横画面 30fps以上、PC 60fps」。

## 現在の状態（2026-09-29 夜・Claude Code で更新）
- エンジン v0.1 と第一話デモ「夕凪の空港と消えた灯晶」が完成。`npm run verify`（型・テスト41件・ビルド）通過。
- **公開済み**: https://yunasayunasa.github.io/Six_dragon_gyakuten/ は `paper-stage` 版。push すると GitHub Actions「PaperStage Pages」で自動公開される
  （github-pages 環境の Deployment branches に `paper-stage` をユーザーが追加済み）。
- ユーザーが iPhone 実機（Safari・横画面）で確認し、出来に満足している。
- ユーザー所見（2026-09-29）を反映済み:
  - キャラの口調を設定に合わせて台本を全面改稿（口調メモは `src/game/case01/scripts.ts` 冒頭）。会話量も増やした。
  - 会話中は会話枠の後ろに立ち絵（`src/engine/ui/Portrait.ts`。主人公は左・相手は右、聞き手は暗く）。
  - 開幕に舞台がパタパタ起き上がる演出（`@たたむ` → `@組み立て`、`Stage.assemble`）。
  - ポスト処理に光のにじみ・光漏れ・端の色ずれを追加（DOFのぼかしを流用、Look の bloom / leak で調整）。
  - 未対応: 話はまだ短い（新しい場面・事件の追加はユーザーと相談）。BGMはユーザーが別途用意。公開先は Discord（仲間内のみ）の予定。
- 実機確認で直した不具合:
  - 透明な暗転幕 `.fader`（と `.shout`）が全タップを奪い、タイトル後の会話が進まなかった。
    原因は `#hud > *` の詳細度が `pointer-events: none` を上書きしていたこと → `:where(#hud) > *` に変更。
    **HUD 直下に全面の要素を足すときは pointer-events に注意**。
  - 会話中は会話枠の外（舞台 `#app`）をタップしても送れるようにした（`Hud.ts`）。
- iPhone Safari は Fullscreen API 非対応のため、`public/manifest.webmanifest`（display: fullscreen / landscape）と iOS 用 meta を追加。
  「共有 → ホーム画面に追加」から起動するとアドレスバーなしの全画面になる。ホーム画面用アイコン画像は未作成。
- タッチ操作の確認は playwright-core（Edge を executablePath に指定、`devices['iPhone 13 landscape']`）で `touchscreen.tap` するのが有効。
  `game.log` と `document.elementFromPoint` で詰まりの原因を調べられる。
- **未確認**: 筆文字フォントの実機表示、BGMの中身、ホーム画面起動時のセーフエリア（ノッチ側の欠け）、第一話の後半を実機で通したときの挙動。
- `validation/` フォルダは旧ブランチの残り（未追跡）。paper-stage とは無関係なのでコミットしない。

## Obsidian Vault（長期知識）
- 場所: `C:\Users\guestuser\Documents\Obsidian-Codex-Vault`（index/current/evidence/archive/review-queue 構成。Inbox, knowledge, projects, rules など）
- 読む順: リポジトリの案内 → Vault の `AGENTS.md` → `projects/<name>/index.md` → `current.md`。**Vault 全体は一括で読まない**。必要なものだけキーワード検索して読む。
- 新しい知見はまず Inbox へ。共通知識への自動昇格は禁止。秘密情報は書かない。
- Vault はまだ一度も読んでいない（Cowork・Claude Code とも未読）。
- グローバル指示の下書きをコウセイ直下 `グローバルCLAUDE.md` に置いた。ユーザーが `C:\Users\guestuser\.claude\CLAUDE.md` へコピーする想定
  （2026-09-29 時点でコピー済みの様子）。Vault の実際の `AGENTS.md` と食い違いがないかは未確認。

## 次にやること（ユーザーの定義に対して薄いところ）
1. 3Dパーティクル/エフェクトの充実（灯晶点灯、叫び・証拠提示の見せ場、足元の水しぶき・紙吹雪など空間が反応する演出）
2. 光の表現（軽量ブルーム、光の筋）— iPhoneで負荷を見ながら
3. 次ジャンルの下準備（墨絵アクション用の Look と Mode、シューティング）
4. GPT Image 2.5 で素材を作る案あり（概算: 1話 150〜300枚生成・20〜40ドル。連続コマ素材は絵柄の一貫性が課題）

## 構成と検証
- 構成と設計: README.md / docs/ARCHITECTURE.md / docs/SCRIPT.md（台本の書き方）/ docs/ASSETS.md
- 素材の再生成: `python tools/prepare_assets.py <展開済み総合アセット> public/assets <wood.pngのフォルダ>`
- 検証: `npm run verify`。ブラウザ通し確認は `window.__paper.{engine,game}` と `game.log` を使うと自動化しやすい（`engine.hud.cps` を上げると会話送りが速くなる）。
