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

## 現在の状態（2026-09-29 夜・Cowork から Claude Code へ引き継ぎ）
- エンジン v0.1 と第一話デモ「夕凪の空港と消えた灯晶」が完成。`npm run verify`（型・テスト41件・ビルド）通過。
- ヘッドレスChromiumで PC(1100×520) とスマホ横(844×390) の両方で最初から解決まで通し確認済み。
- **GitHub**: `paper-stage` ブランチへ push 済み（ユーザーのPCから）。
- **公開は未完了**: GitHub Actions「PaperStage Pages」の build は成功するが、deploy が
  `Branch "paper-stage" is not allowed to deploy to github-pages due to environment protection rules.` で失敗。
  → Settings → Environments → github-pages → Deployment branches に `paper-stage` を追加し、失敗した実行を Re-run すれば公開される。
  **リポジトリ設定の変更なので、実行前にユーザーの明示的な許可を取ること**（まだ許可は出ていない）。
  公開URLは今も旧 threejs-ab 版のまま。公開後はスマホで確認してもらう。
- **未確認**: iPhone実機の性能/操作感、筆文字フォント（検証環境ではGoogle Fontsが読めない）、BGMの中身（未試聴）。
- PC のコウセイ直下に作業用の一時ファイルが残っている（`paper-stage.bundle`・`paper-stage2.bundle`・`push-paper-stage*.bat`・`push-result.txt`）。push 済みなので不要。消すかはユーザーに確認。

## Obsidian Vault（長期知識）
- 場所: `C:\Users\guestuser\Documents\Obsidian-Codex-Vault`（index/current/evidence/archive/review-queue 構成。Inbox, knowledge, projects, rules など）
- 読む順: リポジトリの案内 → Vault の `AGENTS.md` → `projects/<name>/index.md` → `current.md`。**Vault 全体は一括で読まない**。必要なものだけキーワード検索して読む。
- 新しい知見はまず Inbox へ。共通知識への自動昇格は禁止。秘密情報は書かない。
- Cowork 側では Vault をまだ一度も読めていない（フォルダ許可前に引き継ぎになった）。
- グローバル指示の下書きをコウセイ直下 `グローバルCLAUDE.md` に置いた。ユーザーが `C:\Users\guestuser\.claude\CLAUDE.md` へコピーする想定。
  Vault の実際の `AGENTS.md` と食い違いがないか、最初に確認して直すこと。

## 次にやること（ユーザーの定義に対して薄いところ）
1. 3Dパーティクル/エフェクトの充実（灯晶点灯、叫び・証拠提示の見せ場、足元の水しぶき・紙吹雪など空間が反応する演出）
2. 光の表現（軽量ブルーム、光の筋）— iPhoneで負荷を見ながら
3. 次ジャンルの下準備（墨絵アクション用の Look と Mode、シューティング）
4. GPT Image 2.5 で素材を作る案あり（概算: 1話 150〜300枚生成・20〜40ドル。連続コマ素材は絵柄の一貫性が課題）

## 構成と検証
- 構成と設計: README.md / docs/ARCHITECTURE.md / docs/SCRIPT.md（台本の書き方）/ docs/ASSETS.md
- 素材の再生成: `python tools/prepare_assets.py <展開済み総合アセット> public/assets <wood.pngのフォルダ>`
- 検証: `npm run verify`。ブラウザ通し確認は `window.__paper.{engine,game}` と `game.log` を使うと自動化しやすい（`engine.hud.cps` を上げると会話送りが速くなる）。
